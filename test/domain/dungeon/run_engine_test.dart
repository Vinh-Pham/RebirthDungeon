import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/core/ids/id_generator.dart';
import 'package:rebirth_dungeon/core/random/seeded_random_source.dart';
import 'package:rebirth_dungeon/domain/combat/combat_command.dart';
import 'package:rebirth_dungeon/domain/combat/combat_die.dart';
import 'package:rebirth_dungeon/domain/combat/combat_engine.dart';
import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/combat/combat_state.dart';
import 'package:rebirth_dungeon/domain/content/ability_data.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_generator.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_command.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_engine.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';

import '../content/content_fixtures.dart';

final GameContent _content = GameContent.parse(validContentSet());

RunEngine _engine({required int seed}) {
  return RunEngine(
    content: _content,
    combatEngine: CombatEngine(
      content: _content,
      random: SeededRandomSource(deriveSeed(seed, 'combat')),
    ),
    dungeonRandom: SeededRandomSource(deriveSeed(seed, 'dungeon')),
    lootRandom: SeededRandomSource(deriveSeed(seed, 'loot')),
    idGenerator: FakeIdGenerator(prefix: 'run'),
  );
}

DungeonRunState _startCellar(RunEngine engine, {int seed = 7}) {
  return engine
      .execute(
        const DungeonRunState(),
        StartRun(
          heroId: 'hero_knight',
          dungeonId: 'dungeon_cellar',
          seed: seed,
        ),
      )
      .state;
}

List<RunRoom> _cellarFloor(int seed) {
  final dungeon = _content.dungeon('dungeon_cellar');
  return generateDungeonFloor(
    dungeon: dungeon,
    lootTable: _content.lootTable(dungeon.lootTableId),
    floorIndex: 0,
    random: SeededRandomSource(deriveSeed(seed, 'dungeon')),
  );
}

/// Smallest seed whose cellar floor has a [kind] room adjacent to the entry.
int _seedWithNeighborKind(RoomKind kind) {
  for (var seed = 0; seed < 500; seed++) {
    final rooms = _cellarFloor(seed);
    if (rooms[0].doors.any((door) => rooms[door].kind == kind)) {
      return seed;
    }
  }
  fail('no seed found with a $kind neighbour of the entry');
}

/// BFS: the next step from the current room toward the nearest uncleared
/// room, or null when every room is cleared.
int? _nextStepTowardUncleared(DungeonRunState state) {
  final target = state.rooms.indexWhere((room) => !room.cleared);
  if (target == -1) {
    return null;
  }
  final previous = List<int>.filled(state.rooms.length, -1);
  final visited = List<bool>.filled(state.rooms.length, false);
  visited[state.currentRoomIndex] = true;
  final queue = <int>[state.currentRoomIndex];
  for (var head = 0; head < queue.length; head++) {
    final current = queue[head];
    if (current == target) {
      break;
    }
    for (final door in state.rooms[current].doors) {
      if (!visited[door]) {
        visited[door] = true;
        previous[door] = current;
        queue.add(door);
      }
    }
  }
  if (!visited[target]) {
    return null;
  }
  var step = target;
  while (previous[step] != state.currentRoomIndex) {
    step = previous[step];
  }
  return step;
}

/// Plays a run to its terminal status with a fixed strategy.
(DungeonRunState, List<RunEvent>) _runToEnd(
  RunEngine engine,
  DungeonRunState state, {
  int maxCommands = 800,
}) {
  final events = <RunEvent>[];

  void submit(RunCommand command) {
    final result = engine.execute(state, command);
    state = result.state;
    events.addAll(result.events);
  }

  var commands = 0;
  while (state.status == RunStatus.inProgress && commands < maxCommands) {
    final combat = state.combat;
    if (combat != null) {
      switch (combat.phase) {
        case CombatPhase.rolling:
          submit(const CombatAction(command: RollDice()));
        case CombatPhase.awaitingPlayerAction:
          final hero = engine.content.hero(state.heroId);
          final abilityId = hero.abilityIds.firstWhere(
            (id) => engine.content.ability(id).effect == AbilityEffect.damage,
            orElse: () => hero.abilityIds.first,
          );
          final cost = engine.content.ability(abilityId).dieCost;
          var assigned = 0;
          for (final die in combat.dice) {
            if (assigned < cost && die.status == DieStatus.available) {
              submit(
                CombatAction(
                  command: AssignDieToAbility(
                    dieIndex: die.dieIndex,
                    abilityId: abilityId,
                  ),
                ),
              );
              assigned++;
            }
          }
          if (assigned >= cost) {
            submit(
              CombatAction(
                command: UseAbility(
                  abilityId: abilityId,
                  targetId: combat.firstLivingEnemy?.id,
                ),
              ),
            );
          }
          if (!state.isTerminal &&
              state.combat?.phase == CombatPhase.awaitingPlayerAction) {
            submit(const CombatAction(command: EndTurn()));
          }
        case CombatPhase.enemyTurn:
          submit(const CombatAction(command: EnemyAct()));
        default:
          fail('unexpected combat phase ${combat.phase}');
      }
    } else {
      final current = state.currentRoom;
      if (current.kind == RoomKind.boss && current.cleared) {
        submit(const Descend());
      } else {
        final next = _nextStepTowardUncleared(state);
        if (next == null) {
          fail('no path to an uncleared room');
        }
        submit(EnterRoom(roomIndex: next));
      }
    }
    commands++;
  }
  return (state, events);
}

void main() {
  group('startRun', () {
    test('creates a seeded run on a generated floor', () {
      final engine = _engine(seed: 7);
      final (state, events) = engine
          .execute(
            const DungeonRunState(),
            const StartRun(
              heroId: 'hero_knight',
              dungeonId: 'dungeon_cellar',
              seed: 42,
            ),
          )
          .toTuple();

      expect(state.status, RunStatus.inProgress);
      expect(state.runId, 'run-0001');
      expect(state.dungeonId, 'dungeon_cellar');
      expect(state.heroId, 'hero_knight');
      expect(state.seed, 42);
      expect(state.heroHp, 30);
      expect(state.heroMaxHp, 30);
      expect(state.floorIndex, 0);
      expect(state.floorCount, 2);
      expect(state.rooms.length, inInclusiveRange(2, 3));
      expect(state.rooms[0].kind, RoomKind.entry);
      expect(state.rooms[0].cleared, isTrue);
      expect(state.currentRoomIndex, 0);
      expect(state.combat, isNull);
      expect(
        events,
        equals([
          const RunStarted(
            runId: 'run-0001',
            dungeonId: 'dungeon_cellar',
            seed: 42,
          ),
          const RoomEntered(roomIndex: 0, roomKind: RoomKind.entry),
        ]),
      );
    });

    test('starting twice is illegal', () {
      final engine = _engine(seed: 7);
      final state = _startCellar(engine);
      _expectIllegal(
        engine,
        state,
        const StartRun(
          heroId: 'hero_knight',
          dungeonId: 'dungeon_cellar',
          seed: 7,
        ),
      );
    });
  });

  group('enterRoom', () {
    test('rejects non-adjacent rooms', () {
      final engine = _engine(seed: 7);
      final state = _startCellar(engine);
      _expectIllegal(engine, state, const EnterRoom(roomIndex: 99));
    });

    test('rejects movement while a combat is active', () {
      final seed = _seedWithNeighborKind(RoomKind.combat);
      final engine = _engine(seed: seed);
      var state = _startCellar(engine, seed: seed);
      final combatRoom = state.rooms[0].doors
          .map((door) => state.rooms[door])
          .firstWhere((room) => room.kind == RoomKind.combat);
      state = engine
          .execute(state, EnterRoom(roomIndex: combatRoom.index))
          .state;
      expect(state.combat, isNotNull);
      _expectIllegal(engine, state, const EnterRoom(roomIndex: 0));
    });

    test('entering a combat room starts a combat against its pre-rolled '
        'monsters', () {
      final seed = _seedWithNeighborKind(RoomKind.combat);
      final engine = _engine(seed: seed);
      var state = _startCellar(engine, seed: seed);
      final combatRoom = state.rooms[0].doors
          .map((door) => state.rooms[door])
          .firstWhere((room) => room.kind == RoomKind.combat);

      final (entered, events) = engine
          .execute(state, EnterRoom(roomIndex: combatRoom.index))
          .toTuple();

      expect(entered.combat, isNotNull);
      expect(entered.combat!.phase, CombatPhase.rolling);
      // Duplicate monsters get unique combat ids (slime, slime#2, ...).
      final expectedIds = <String>[];
      final occurrences = <String, int>{};
      for (final monsterId in combatRoom.monsterIds) {
        final occurrence = (occurrences[monsterId] ?? 0) + 1;
        occurrences[monsterId] = occurrence;
        expectedIds.add(occurrence == 1 ? monsterId : '$monsterId#$occurrence');
      }
      expect(entered.combat!.enemies.map((e) => e.id).toList(), expectedIds);
      expect(
        events.whereType<CombatHappened>().map((e) => e.event),
        contains(CombatStarted(playerId: 'hero_knight', enemyIds: expectedIds)),
      );
    });

    test('winning a combat clears the room and writes back hero HP', () {
      final seed = _seedWithNeighborKind(RoomKind.combat);
      final engine = _engine(seed: seed);
      var state = _startCellar(engine, seed: seed);
      final combatRoom = state.rooms[0].doors
          .map((door) => state.rooms[door])
          .firstWhere((room) => room.kind == RoomKind.combat);
      state = engine
          .execute(state, EnterRoom(roomIndex: combatRoom.index))
          .state;

      // Knight vs slime(s): keep slashing until the room is cleared.
      var guard = 0;
      while (state.combat != null && guard < 50) {
        final combat = state.combat!;
        switch (combat.phase) {
          case CombatPhase.rolling:
            state = engine
                .execute(state, const CombatAction(command: RollDice()))
                .state;
          case CombatPhase.awaitingPlayerAction:
            var assigned = 0;
            for (final die in combat.dice) {
              if (die.status == DieStatus.available) {
                state = engine
                    .execute(
                      state,
                      CombatAction(
                        command: AssignDieToAbility(
                          dieIndex: die.dieIndex,
                          abilityId: 'slash',
                        ),
                      ),
                    )
                    .state;
                assigned++;
              }
            }
            if (assigned > 0) {
              state = engine
                  .execute(
                    state,
                    CombatAction(
                      command: UseAbility(
                        abilityId: 'slash',
                        targetId: combat.firstLivingEnemy?.id,
                      ),
                    ),
                  )
                  .state;
            } else {
              state = engine
                  .execute(state, const CombatAction(command: EndTurn()))
                  .state;
            }
          case CombatPhase.enemyTurn:
            state = engine
                .execute(state, const CombatAction(command: EnemyAct()))
                .state;
          default:
            break;
        }
        guard++;
      }

      expect(state.combat, isNull);
      expect(state.currentRoom.cleared, isTrue);
      expect(state.heroHp, lessThanOrEqualTo(30));
    });

    test('treasure rooms grant their pre-rolled loot once', () {
      final seed = _seedWithNeighborKind(RoomKind.treasure);
      final engine = _engine(seed: seed);
      var state = _startCellar(engine, seed: seed);
      final treasureRoom = state.rooms[0].doors
          .map((door) => state.rooms[door])
          .firstWhere((room) => room.kind == RoomKind.treasure);
      expect(treasureRoom.loot, isNotEmpty);

      final (entered, events) = engine
          .execute(state, EnterRoom(roomIndex: treasureRoom.index))
          .toTuple();

      expect(entered.collectedLoot, treasureRoom.loot);
      expect(entered.currentRoom.cleared, isTrue);
      expect(
        events,
        containsAll([
          LootGained(roomIndex: treasureRoom.index, entries: treasureRoom.loot),
          RoomCleared(roomIndex: treasureRoom.index),
        ]),
      );
    });

    test('event rooms are shrines that heal a third of max HP', () {
      final seed = _seedWithNeighborKind(RoomKind.event);
      final engine = _engine(seed: seed);
      var state = _startCellar(engine, seed: seed);
      final eventRoom = state.rooms[0].doors
          .map((door) => state.rooms[door])
          .firstWhere((room) => room.kind == RoomKind.event);

      final (entered, events) = engine
          .execute(state, EnterRoom(roomIndex: eventRoom.index))
          .toTuple();

      // The hero is at full HP, so the shrine heals nothing but still clears.
      expect(entered.heroHp, 30);
      expect(
        events,
        containsAll([
          const ShrineHealed(healed: 0, remainingHp: 30),
          RoomCleared(roomIndex: eventRoom.index),
        ]),
      );
    });
  });

  group('descend and run completion', () {
    test('descending before clearing the boss is illegal', () {
      final engine = _engine(seed: 7);
      final state = _startCellar(engine);
      _expectIllegal(engine, state, const Descend());
    });

    test('a full cellar run completes after the last boss (multi-floor)', () {
      final engine = _engine(seed: 42);
      final state = _startCellar(engine, seed: 42);
      final (finalState, events) = _runToEnd(engine, state);

      expect(finalState.status, RunStatus.victory);
      expect(finalState.isTerminal, isTrue);
      expect(events, contains(const FloorDescended(floorIndex: 1)));
      expect(events.whereType<FloorDescended>(), hasLength(1));
      expect(events, contains(const RunCompleted(floorsCleared: 2)));
      expect(finalState.floorIndex, 1);
      expect(finalState.currentRoom.kind, RoomKind.boss);
    });

    test('a doomed run against the Bone King ends in defeat', () {
      final engine = _engine(seed: 3);
      final state = engine
          .execute(
            const DungeonRunState(),
            const StartRun(
              heroId: 'hero_knight',
              dungeonId: 'dungeon_halls',
              seed: 3,
            ),
          )
          .state;
      final (finalState, events) = _runToEnd(engine, state);

      expect(finalState.status, RunStatus.defeat);
      expect(events, contains(const RunFailed()));
      expect(finalState.heroHp, lessThanOrEqualTo(0));
    });
  });

  group('determinism', () {
    test('the same seed replays the identical run', () {
      (DungeonRunState, List<RunEvent>) run() {
        final engine = _engine(seed: 99);
        final state = _startCellar(engine, seed: 99);
        return _runToEnd(engine, state);
      }

      final (firstState, firstEvents) = run();
      final (secondState, secondEvents) = run();
      expect(firstState, secondState);
      expect(firstEvents, secondEvents);
    });
  });

  group('combat bridge', () {
    test('combat commands without an active combat are illegal', () {
      final engine = _engine(seed: 7);
      final state = _startCellar(engine);
      _expectIllegal(engine, state, const CombatAction(command: RollDice()));
    });
  });

  group('serialization', () {
    test('a run mid-combat round trips through JSON', () {
      final seed = _seedWithNeighborKind(RoomKind.combat);
      final engine = _engine(seed: seed);
      var state = _startCellar(engine, seed: seed);
      final combatRoom = state.rooms[0].doors
          .map((door) => state.rooms[door])
          .firstWhere((room) => room.kind == RoomKind.combat);
      state = engine
          .execute(state, EnterRoom(roomIndex: combatRoom.index))
          .state;

      final encoded = jsonEncode(state.toJson());
      final restored = DungeonRunState.fromJson(
        jsonDecode(encoded) as Map<String, dynamic>,
      );
      expect(restored, state);
      expect(restored.combat, isNotNull);
      expect(restored.combat!.phase, CombatPhase.rolling);
    });
  });
}

void _expectIllegal(
  RunEngine engine,
  DungeonRunState state,
  RunCommand command,
) {
  expect(
    () => engine.execute(state, command),
    throwsA(
      isA<DomainException>().having(
        (e) => e.failure,
        'failure',
        isA<InvalidOperationFailure>(),
      ),
    ),
  );
}

extension on EngineResult<DungeonRunState, RunEvent> {
  (DungeonRunState, List<RunEvent>) toTuple() => (state, events);
}
