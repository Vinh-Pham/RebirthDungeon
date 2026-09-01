import 'package:flame/game.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/application/run/run_event_bus.dart';
import 'package:rebirth_dungeon/core/ids/id_generator.dart';
import 'package:rebirth_dungeon/core/random/seeded_random_source.dart';
import 'package:rebirth_dungeon/domain/combat/combat_engine.dart';
import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_command.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_engine.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:rebirth_dungeon/game/components/room_component.dart';
import 'package:rebirth_dungeon/game/dungeon_game.dart';
import 'package:rebirth_dungeon/game/effects/damage_number.dart';

import '../domain/content/content_fixtures.dart';

final GameContent _content = GameContent.parse(validContentSet());

/// Starts a cellar run and walks into the first uncleared room to force a
/// combat, all through the pure domain engine.
(DungeonRunState, RunEngine) _runInCombat() {
  final engine = RunEngine(
    content: _content,
    combatEngine: CombatEngine(
      content: _content,
      random: SeededRandomSource(deriveSeed(7, 'combat')),
    ),
    dungeonRandom: SeededRandomSource(deriveSeed(7, 'dungeon')),
    lootRandom: SeededRandomSource(deriveSeed(7, 'loot')),
    idGenerator: FakeIdGenerator(),
  );
  var run = engine
      .execute(
        const DungeonRunState(),
        const StartRun(
          heroId: 'hero_knight',
          dungeonId: 'dungeon_cellar',
          seed: 7,
        ),
      )
      .state;

  var guard = 0;
  while (run.combat == null && guard < 10) {
    final target = run.currentRoom.doors.first;
    run = engine.execute(run, EnterRoom(roomIndex: target)).state;
    guard++;
  }
  assert(run.combat != null, 'expected a combat to start');
  return (run, engine);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('DungeonGame renders a generated floor and reacts to events', (
    tester,
  ) async {
    final (run, engine) = _runInCombat();
    final bus = RunEventBus();
    addTearDown(bus.dispose);

    final game = DungeonGame(runEvents: bus.stream, initialRun: run);
    addTearDown(game.onRemove);
    await tester.pumpWidget(GameWidget(game: game));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    final world = game.dungeonWorld;
    expect(
      world.children.whereType<RoomComponent>(),
      hasLength(run.rooms.length),
    );
    expect(world.player, isNotNull);
    expect(world.monsters, isNotEmpty);

    // Damage numbers spawn on damage events and expire.
    final target = run.combat!.enemies.first.id;
    bus.publish([
      RunEvent.combat(
        DamageDealt(
          targetId: target,
          amount: 5,
          remainingHp: 5,
          source: DamageSource.attack,
        ),
      ),
    ]);
    await tester.pump();
    await tester.pump();
    expect(world.children.whereType<DamageNumber>(), isNotEmpty);

    await _pumpSeconds(tester, 1.2);
    expect(world.children.whereType<DamageNumber>(), isEmpty);
  });

  testWidgets('player movement animates on room-entered events', (
    tester,
  ) async {
    final (run, engine) = _runInCombat();
    final bus = RunEventBus();
    addTearDown(bus.dispose);

    final game = DungeonGame(runEvents: bus.stream, initialRun: run);
    addTearDown(game.onRemove);
    await tester.pumpWidget(GameWidget(game: game));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    final player = game.dungeonWorld.player!;
    final start = player.position.clone();

    // Move to an adjacent room: the world must carry the player there.
    final door = run.currentRoom.doors.first;
    bus.publish([RoomEntered(roomIndex: door, roomKind: run.rooms[door].kind)]);
    await _pumpSeconds(tester, 1);

    final expected = game.dungeonWorld.centerOfRoom(door);
    expect((player.position - expected).length, lessThan(1));
    expect((start - expected).length, greaterThan(1));
    ignore(engine);
  });

  testWidgets('monster death events fade the component out of the world', (
    tester,
  ) async {
    final (run, engine) = _runInCombat();
    final bus = RunEventBus();
    addTearDown(bus.dispose);

    final game = DungeonGame(runEvents: bus.stream, initialRun: run);
    addTearDown(game.onRemove);
    await tester.pumpWidget(GameWidget(game: game));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    final target = run.combat!.enemies.first.id;
    expect(
      game.dungeonWorld.monsters.where((m) => m.monsterId == target),
      isNotEmpty,
    );

    bus.publish([RunEvent.combat(EnemyDefeated(enemyId: target))]);
    await tester.pump();
    await _pumpSeconds(tester, 1.2);

    expect(
      game.dungeonWorld.monsters.where(
        (monster) => monster.monsterId == target && monster.isMounted,
      ),
      isEmpty,
    );
    ignore(engine);
  });
}

void ignore(dynamic _) {}

/// Flame clamps per-frame deltas, so advance fake time in small frames.
Future<void> _pumpSeconds(WidgetTester tester, double seconds) async {
  final frames = (seconds / 0.05).ceil();
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}
