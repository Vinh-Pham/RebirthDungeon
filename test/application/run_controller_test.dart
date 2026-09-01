import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/application/providers/shared_providers.dart';
import 'package:rebirth_dungeon/application/run/run_controller.dart';
import 'package:rebirth_dungeon/domain/combat/combat_command.dart';
import 'package:rebirth_dungeon/domain/combat/combat_die.dart';
import 'package:rebirth_dungeon/domain/combat/combat_state.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';

import '../domain/content/content_fixtures.dart';

Future<ProviderContainer> _container() async {
  final container = ProviderContainer(
    overrides: [
      contentProvider.overrideWith(
        (ref) async => GameContent.parse(validContentSet()),
      ),
    ],
  );
  addTearDown(container.dispose);
  // Warm the content provider; controllers no-op without it.
  await container.read(contentProvider.future);
  return container;
}

DungeonRunState _runOf(ProviderContainer container) =>
    container.read(runControllerProvider).run!;

/// BFS: next step from the current room toward the nearest uncleared room.
int _nextStepTowardUncleared(DungeonRunState run) {
  final target = run.rooms.indexWhere((room) => !room.cleared);
  expect(target, isNot(-1), reason: 'run should still have uncleared rooms');
  final previous = List<int>.filled(run.rooms.length, -1);
  final visited = List<bool>.filled(run.rooms.length, false);
  visited[run.currentRoomIndex] = true;
  final queue = <int>[run.currentRoomIndex];
  for (var head = 0; head < queue.length; head++) {
    final current = queue[head];
    if (current == target) {
      break;
    }
    for (final door in run.rooms[current].doors) {
      if (!visited[door]) {
        visited[door] = true;
        previous[door] = current;
        queue.add(door);
      }
    }
  }
  var step = target;
  while (previous[step] != run.currentRoomIndex) {
    step = previous[step];
  }
  return step;
}

/// Plays the current run to its terminal status through the controller.
RunStatus _playToEnd(ProviderContainer container) {
  final controller = container.read(runControllerProvider.notifier);
  var commands = 0;
  while (!_runOf(container).isTerminal && commands < 800) {
    final run = _runOf(container);
    final combat = run.combat;
    if (combat != null) {
      switch (combat.phase) {
        case CombatPhase.rolling:
          controller.combat(const RollDice());
        case CombatPhase.awaitingPlayerAction:
          var assigned = 0;
          for (final die in combat.dice) {
            if (die.status == DieStatus.available) {
              controller.combat(
                AssignDieToAbility(dieIndex: die.dieIndex, abilityId: 'slash'),
              );
              assigned++;
            }
          }
          if (assigned > 0) {
            controller.combat(
              UseAbility(
                abilityId: 'slash',
                targetId: combat.firstLivingEnemy?.id,
              ),
            );
          } else {
            controller.combat(const EndTurn());
          }
        case CombatPhase.enemyTurn:
          controller.combat(const EnemyAct());
        default:
          fail('unexpected combat phase ${combat.phase}');
      }
    } else {
      final room = run.currentRoom;
      if (room.kind == RoomKind.boss && room.cleared) {
        controller.descend();
      } else {
        controller.enterRoom(_nextStepTowardUncleared(run));
      }
    }
    commands++;
  }
  return _runOf(container).status;
}

void main() {
  test('startRun creates an in-progress run with a fresh id', () async {
    final container = await _container();
    final controller = container.read(runControllerProvider.notifier);

    final runId = controller.startRun(
      heroId: 'hero_knight',
      dungeonId: 'dungeon_cellar',
    );

    final ui = container.read(runControllerProvider);
    expect(ui.run, isNotNull);
    expect(ui.run!.runId, runId);
    expect(ui.run!.status, RunStatus.inProgress);
    expect(ui.run!.dungeonId, 'dungeon_cellar');
    expect(ui.run!.heroId, 'hero_knight');
    expect(ui.run!.heroHp, 30);
    expect(ui.lastEvents.first, isA<RunStarted>());
  });

  test('starting again replaces the active run', () async {
    final container = await _container();
    final controller = container.read(runControllerProvider.notifier);

    final firstId = controller.startRun(
      heroId: 'hero_knight',
      dungeonId: 'dungeon_cellar',
    );
    final secondId = controller.startRun(
      heroId: 'hero_knight',
      dungeonId: 'dungeon_halls',
    );

    expect(secondId, isNot(firstId));
    expect(_runOf(container).runId, secondId);
    expect(_runOf(container).dungeonId, 'dungeon_halls');
  });

  test('illegal moves surface an error without changing the run', () async {
    final container = await _container();
    final controller = container.read(runControllerProvider.notifier);
    controller.startRun(heroId: 'hero_knight', dungeonId: 'dungeon_cellar');
    final before = _runOf(container);

    controller.enterRoom(99);

    final ui = container.read(runControllerProvider);
    expect(ui.error, isNotNull);
    expect(ui.run, before);
  });

  test(
    'a full cellar run can be played to victory through the controller',
    () async {
      final container = await _container();
      final controller = container.read(runControllerProvider.notifier);
      controller.startRun(heroId: 'hero_knight', dungeonId: 'dungeon_cellar');

      final status = _playToEnd(container);

      expect(status, RunStatus.victory);
      final run = _runOf(container);
      expect(run.floorIndex, 1);
      expect(run.currentRoom.cleared, isTrue);
    },
  );

  test('event and combat events flow through the controller state', () async {
    final container = await _container();
    final controller = container.read(runControllerProvider.notifier);
    controller.startRun(heroId: 'hero_knight', dungeonId: 'dungeon_cellar');

    controller.enterRoom(_nextStepTowardUncleared(_runOf(container)));

    final events = container.read(runControllerProvider).lastEvents;
    expect(events, contains(isA<RoomEntered>()));
  });
}
