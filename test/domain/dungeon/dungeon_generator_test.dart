import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/random/seeded_random_source.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_generator.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';

import '../content/content_fixtures.dart';

final GameContent _content = GameContent.parse(validContentSet());

List<RunRoom> _generateFloor(int seed, {String dungeonId = 'dungeon_cellar'}) {
  final dungeon = _content.dungeon(dungeonId);
  return generateDungeonFloor(
    dungeon: dungeon,
    lootTable: _content.lootTable(dungeon.lootTableId),
    floorIndex: 0,
    random: SeededRandomSource(deriveSeed(seed, 'dungeon')),
  );
}

/// Every room is reachable from the entry via doors.
bool _allReachable(List<RunRoom> rooms) {
  final visited = <int>{0};
  final queue = <int>[0];
  for (var head = 0; head < queue.length; head++) {
    for (final door in rooms[queue[head]].doors) {
      if (visited.add(door)) {
        queue.add(door);
      }
    }
  }
  return visited.length == rooms.length;
}

int _depthOf(List<RunRoom> rooms, int target) {
  final depth = List<int>.filled(rooms.length, -1);
  depth[0] = 0;
  final queue = <int>[0];
  for (var head = 0; head < queue.length; head++) {
    final current = queue[head];
    for (final door in rooms[current].doors) {
      if (depth[door] == -1) {
        depth[door] = depth[current] + 1;
        queue.add(door);
      }
    }
  }
  return depth[target];
}

void main() {
  group('generateDungeonFloor', () {
    test('produces structurally valid floors across many seeds', () {
      final distinctLayouts = <String>{};
      for (var seed = 0; seed < 30; seed++) {
        final rooms = _generateFloor(seed);

        expect(rooms.length, inInclusiveRange(2, 3), reason: 'seed $seed');
        expect(rooms[0].kind, RoomKind.entry);
        expect(rooms.where((r) => r.kind == RoomKind.entry), hasLength(1));
        expect(rooms.where((r) => r.kind == RoomKind.boss), hasLength(1));
        expect(
          rooms.every(
            (room) => room.doors.every(
              (door) => door >= 0 && door < rooms.length && door != room.index,
            ),
          ),
          isTrue,
        );
        // Doors are reciprocal.
        for (final room in rooms) {
          for (final door in room.doors) {
            expect(rooms[door].doors, contains(room.index));
          }
        }
        expect(_allReachable(rooms), isTrue, reason: 'seed $seed');
        distinctLayouts.add(rooms.map((r) => '${r.kind}:${r.doors}').join('|'));
      }
      // Different seeds do not all collapse to the same floor.
      expect(distinctLayouts.length, greaterThan(1));
    });

    test('the boss room is the farthest room from the entry', () {
      for (var seed = 0; seed < 30; seed++) {
        final rooms = _generateFloor(seed);
        final boss = rooms.firstWhere((room) => room.kind == RoomKind.boss);
        expect(boss.index, isNot(0));
        final maxDepth = rooms
            .map((room) => _depthOf(rooms, room.index))
            .reduce(max);
        expect(_depthOf(rooms, boss.index), maxDepth, reason: 'seed $seed');
      }
    });

    test(
      'encounters come from the monster pool and the boss guards the boss room',
      () {
        final pool = _content.dungeon('dungeon_cellar').monsterPool;
        var sawMultiMonsterEncounter = false;
        for (var seed = 0; seed < 30; seed++) {
          final rooms = _generateFloor(seed);
          for (final room in rooms) {
            switch (room.kind) {
              case RoomKind.combat:
                expect(room.monsterIds, isNotEmpty);
                for (final monsterId in room.monsterIds) {
                  expect(pool, contains(monsterId));
                }
                if (room.monsterIds.length > 1) {
                  sawMultiMonsterEncounter = true;
                }
              case RoomKind.boss:
                expect(room.monsterIds, ['slime']);
              default:
                expect(room.monsterIds, isEmpty);
            }
          }
        }
        expect(sawMultiMonsterEncounter, isTrue);
      },
    );

    test('treasure rooms pre-roll loot from the dungeon loot table', () {
      final items = _content.items.keys.toSet();
      var sawTreasure = false;
      for (var seed = 0; seed < 40; seed++) {
        for (final room in _generateFloor(seed)) {
          if (room.kind != RoomKind.treasure) {
            continue;
          }
          sawTreasure = true;
          expect(room.loot, hasLength(1));
          final loot = room.loot.single;
          expect(items, contains(loot.itemId));
          expect(loot.quantity, greaterThanOrEqualTo(1));
        }
      }
      expect(sawTreasure, isTrue);
    });

    test('the same seed produces the same floor', () {
      for (var seed = 0; seed < 10; seed++) {
        expect(_generateFloor(seed), equals(_generateFloor(seed)));
      }
    });

    test('works for the multi-floor starter dungeon too', () {
      final rooms = _generateFloor(3, dungeonId: 'dungeon_halls');
      expect(rooms.length, inInclusiveRange(3, 5));
      expect(_allReachable(rooms), isTrue);
      final boss = rooms.firstWhere((room) => room.kind == RoomKind.boss);
      expect(boss.monsterIds, ['bone_king']);
    });
  });
}
