import 'dart:math';

import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/core/ids/id_generator.dart';
import 'package:rebirth_dungeon/core/random/random_source.dart';
import 'package:rebirth_dungeon/domain/combat/combat_command.dart';
import 'package:rebirth_dungeon/domain/combat/combat_engine.dart';
import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/combat/combat_state.dart';
import 'package:rebirth_dungeon/domain/content/dungeon_data.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_generator.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_command.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';

/// Runs a dungeon crawl on top of the combat engine (dart-game-plan.md
/// section 12/17).
///
/// Randomness is injected per channel: [dungeonRandom] drives topology,
/// room kinds, encounters, and treasure pre-rolls; [lootRandom] is reserved
/// for future drop-time rolls; the injected [combatEngine] owns the combat
/// channel. The run state itself stores only the root [seed].
///
/// Room resolution: entering a combat or boss room starts a combat that
/// blocks movement until it is won (defeat ends the run); treasure rooms
/// grant their pre-rolled loot on entry; event rooms are shrines that heal
/// 30% of max HP. Defeating the boss room unlocks [Descend], which either
/// generates the next floor or completes the run.
class RunEngine implements DomainEngine<DungeonRunState, RunCommand, RunEvent> {
  RunEngine({
    required this.content,
    required this.combatEngine,
    required this.dungeonRandom,
    required this.lootRandom,
    required this.idGenerator,
  });

  final GameContent content;
  final CombatEngine combatEngine;
  final RandomSource dungeonRandom;
  final RandomSource lootRandom;
  final IdGenerator idGenerator;

  @override
  EngineResult<DungeonRunState, RunEvent> execute(
    DungeonRunState state,
    RunCommand command,
  ) {
    final (newState, events) = switch (command) {
      StartRun() => _startRun(state, command),
      EnterRoom() => _enterRoom(state, command),
      CombatAction() => _combatAction(state, command),
      Descend() => _descend(state),
    };
    return EngineResult(state: newState, events: events);
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  (DungeonRunState, List<RunEvent>) _startRun(
    DungeonRunState state,
    StartRun command,
  ) {
    if (state.status != RunStatus.notStarted) {
      throw _invalid('A run is already active.');
    }
    final dungeon = content.dungeon(command.dungeonId);
    final hero = content.hero(command.heroId);
    final rooms = _generateFloor(dungeon, floorIndex: 0);
    rooms[0] = rooms[0].copyWith(cleared: true);

    final runId = idGenerator.generate();
    final events = <RunEvent>[
      RunStarted(runId: runId, dungeonId: dungeon.id, seed: command.seed),
      const RoomEntered(roomIndex: 0, roomKind: RoomKind.entry),
    ];
    return (
      state.copyWith(
        status: RunStatus.inProgress,
        runId: runId,
        dungeonId: dungeon.id,
        heroId: hero.id,
        seed: command.seed,
        heroHp: hero.baseHp,
        heroMaxHp: hero.baseHp,
        floorIndex: 0,
        floorCount: dungeon.floorCount,
        rooms: rooms,
        currentRoomIndex: 0,
        combat: null,
        collectedLoot: [],
      ),
      events,
    );
  }

  (DungeonRunState, List<RunEvent>) _enterRoom(
    DungeonRunState state,
    EnterRoom command,
  ) {
    _requireActive(state);
    if (state.combat != null) {
      throw _invalid('Cannot move while a combat is active.');
    }
    final current = state.currentRoom;
    if (!current.doors.contains(command.roomIndex)) {
      throw _invalid(
        'Room ${command.roomIndex} is not adjacent to room '
        '${state.currentRoomIndex}.',
      );
    }

    final room = state.rooms[command.roomIndex];
    final events = <RunEvent>[
      RoomEntered(roomIndex: room.index, roomKind: room.kind),
    ];
    var newState = state.copyWith(currentRoomIndex: room.index);
    final hero = content.hero(state.heroId);

    switch (room.kind) {
      case RoomKind.entry:
        break;
      case RoomKind.combat:
      case RoomKind.boss:
        if (!room.cleared) {
          final (combat, combatEvents) = _startCombat(
            heroId: hero.id,
            monsterIds: room.monsterIds,
          );
          newState = newState.copyWith(combat: combat);
          events.addAll(combatEvents.map(RunEvent.combat));
        }
      case RoomKind.treasure:
        if (!room.cleared) {
          newState = newState.copyWith(
            collectedLoot: [...state.collectedLoot, ...room.loot],
          );
          if (room.loot.isNotEmpty) {
            events.add(LootGained(roomIndex: room.index, entries: room.loot));
          }
          newState = _markCleared(newState, room.index, events);
        }
      case RoomKind.event:
        if (!room.cleared) {
          // Shrine: heal 30% of max HP, capped at max HP.
          final fullHeal = state.heroMaxHp * 3 ~/ 10;
          final healed = min(fullHeal, state.heroMaxHp - state.heroHp);
          newState = newState.copyWith(heroHp: state.heroHp + healed);
          events.add(
            ShrineHealed(healed: healed, remainingHp: newState.heroHp),
          );
          newState = _markCleared(newState, room.index, events);
        }
    }
    return (newState, events);
  }

  (DungeonRunState, List<RunEvent>) _combatAction(
    DungeonRunState state,
    CombatAction command,
  ) {
    _requireActive(state);
    final combat = state.combat;
    if (combat == null) {
      throw _invalid('No active combat to act in.');
    }
    final result = combatEngine.execute(combat, command.command);
    final events = result.events.map(RunEvent.combat).toList();

    switch (result.state.phase) {
      case CombatPhase.victory:
        final room = state.currentRoom;
        var newState = state.copyWith(
          combat: null,
          heroHp: result.state.player.hp,
        );
        events.add(CombatVictory(roomIndex: room.index));
        newState = _markCleared(newState, room.index, events);
        return (newState, events);
      case CombatPhase.defeat:
        events.add(const CombatDefeat());
        events.add(const RunFailed());
        return (
          state.copyWith(
            status: RunStatus.defeat,
            combat: null,
            heroHp: min(result.state.player.hp, 0),
          ),
          events,
        );
      default:
        return (state.copyWith(combat: result.state), events);
    }
  }

  (DungeonRunState, List<RunEvent>) _descend(DungeonRunState state) {
    _requireActive(state);
    if (state.combat != null) {
      throw _invalid('Cannot descend while a combat is active.');
    }
    final room = state.currentRoom;
    if (room.kind != RoomKind.boss || !room.cleared) {
      throw _invalid(
        'Defeat the boss of floor ${state.floorIndex} before '
        'descending.',
      );
    }
    final dungeon = content.dungeon(state.dungeonId);
    final nextFloor = state.floorIndex + 1;
    if (nextFloor >= state.floorCount) {
      return (
        state.copyWith(status: RunStatus.victory),
        <RunEvent>[RunCompleted(floorsCleared: state.floorCount)],
      );
    }
    final rooms = _generateFloor(dungeon, floorIndex: nextFloor);
    rooms[0] = rooms[0].copyWith(cleared: true);
    return (
      state.copyWith(floorIndex: nextFloor, rooms: rooms, currentRoomIndex: 0),
      <RunEvent>[
        FloorDescended(floorIndex: nextFloor),
        const RoomEntered(roomIndex: 0, roomKind: RoomKind.entry),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  List<RunRoom> _generateFloor(DungeonData dungeon, {required int floorIndex}) {
    final lootTable = content.lootTable(dungeon.lootTableId);
    return generateDungeonFloor(
      dungeon: dungeon,
      lootTable: lootTable,
      floorIndex: floorIndex,
      random: dungeonRandom,
    );
  }

  (CombatState, List<CombatEvent>) _startCombat({
    required String heroId,
    required List<String> monsterIds,
  }) {
    final result = combatEngine.execute(
      const CombatState(),
      StartCombat(heroId: heroId, monsterIds: monsterIds),
    );
    return (result.state, result.events);
  }

  DungeonRunState _markCleared(
    DungeonRunState state,
    int roomIndex,
    List<RunEvent> events,
  ) {
    events.add(RoomCleared(roomIndex: roomIndex));
    return state.copyWith(
      rooms: [
        for (final room in state.rooms)
          room.index == roomIndex ? room.copyWith(cleared: true) : room,
      ],
    );
  }

  void _requireActive(DungeonRunState state) {
    if (state.status != RunStatus.inProgress) {
      throw _invalid('No active run (status: ${state.status.name}).');
    }
  }

  static DomainException _invalid(String message) =>
      DomainException(Failure.invalidOperation(message: message));
}
