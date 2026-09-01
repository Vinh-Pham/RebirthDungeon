import 'package:rebirth_dungeon/core/random/random_source.dart';
import 'package:rebirth_dungeon/domain/content/dungeon_data.dart';
import 'package:rebirth_dungeon/domain/content/loot_table_data.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';

/// Kind odds for the rooms between the entry and the boss. Engine mechanics
/// for the prototype — not content.
const double _combatChance = 0.65;
const double _treasureChance = 0.85; // up to this value; the rest are events

const List<(int, int)> _directions = [(0, -1), (0, 1), (-1, 0), (1, 0)];

/// Generates one floor of a dungeon from its content parameters and an
/// injected (dungeon-channel) [random] source.
///
/// The topology is a tree grown on a grid: each new room attaches to a
/// random existing room in a random free direction, so every room is
/// reachable from the entry by construction and doors are always
/// reciprocal. The boss room is the room farthest from the entry (BFS
/// depth; ties break toward the lowest index). Encounters and treasure are
/// pre-rolled here — with [lootTable] resolved from the dungeon's
/// `lootTableId` — so a floor is fully determined by the seed.
List<RunRoom> generateDungeonFloor({
  required DungeonData dungeon,
  required LootTableData lootTable,
  required int floorIndex,
  required RandomSource random,
}) {
  final roomCount = dungeon.roomsPerFloor.sample(random);

  final positions = <(int, int), int>{};
  final doors = List<List<int>>.generate(roomCount, (_) => <int>[]);

  void place(int index, (int, int) cell, int? parent) {
    positions[cell] = index;
    if (parent != null) {
      doors[parent].add(index);
      doors[index].add(parent);
    }
  }

  place(0, (0, 0), null);
  for (var i = 1; i < roomCount; i++) {
    var placed = false;
    for (var attempt = 0; attempt < 64 && !placed; attempt++) {
      final parent = random.nextInt(i);
      final direction = _directions[random.nextInt(4)];
      final parentPosition = positions.entries
          .firstWhere((entry) => entry.value == parent)
          .key;
      final cell = (
        parentPosition.$1 + direction.$1,
        parentPosition.$2 + direction.$2,
      );
      if (!positions.containsKey(cell)) {
        place(i, cell, parent);
        placed = true;
      }
    }
    if (!placed) {
      // Deterministic fallback: the grown tree always has a free
      // neighbour somewhere on the infinite grid.
      outer:
      for (var parent = 0; parent < i && !placed; parent++) {
        final parentPosition = positions.entries
            .firstWhere((entry) => entry.value == parent)
            .key;
        for (final direction in _directions) {
          final cell = (
            parentPosition.$1 + direction.$1,
            parentPosition.$2 + direction.$2,
          );
          if (!positions.containsKey(cell)) {
            place(i, cell, parent);
            placed = true;
            break outer;
          }
        }
      }
    }
  }

  final bossIndex = _farthestRoomIndex(doors);
  final rooms = List<RunRoom>.generate(roomCount, (index) {
    final RoomKind kind;
    if (index == 0) {
      kind = RoomKind.entry;
    } else if (index == bossIndex) {
      kind = RoomKind.boss;
    } else {
      final roll = random.nextDouble();
      kind = roll < _combatChance
          ? RoomKind.combat
          : roll < _treasureChance
          ? RoomKind.treasure
          : RoomKind.event;
    }
    return RunRoom(index: index, kind: kind, doors: doors[index]);
  });

  // Pre-roll encounters and treasure, walking rooms in index order so the
  // RNG stream stays stable across identical seeds.
  for (var i = 0; i < rooms.length; i++) {
    final room = rooms[i];
    switch (room.kind) {
      case RoomKind.combat:
        final count = 1 + random.nextInt(2);
        rooms[i] = room.copyWith(
          monsterIds: [
            for (var m = 0; m < count; m++)
              dungeon.monsterPool[random.nextInt(dungeon.monsterPool.length)],
          ],
        );
      case RoomKind.boss:
        rooms[i] = room.copyWith(monsterIds: [dungeon.bossId]);
      case RoomKind.treasure:
        final entry = random.pickWeighted(
          lootTable.entries,
          (lootEntry) => lootEntry.weight,
        );
        rooms[i] = room.copyWith(
          loot: [
            RunLoot(
              itemId: entry.itemId,
              quantity: entry.quantity.sample(random),
            ),
          ],
        );
      case RoomKind.entry:
      case RoomKind.event:
        break;
    }
  }
  return rooms;
}

int _farthestRoomIndex(List<List<int>> doors) {
  final depth = List<int>.filled(doors.length, -1);
  depth[0] = 0;
  final queue = <int>[0];
  for (var head = 0; head < queue.length; head++) {
    final current = queue[head];
    for (final door in doors[current]) {
      if (depth[door] == -1) {
        depth[door] = depth[current] + 1;
        queue.add(door);
      }
    }
  }
  var best = 0;
  for (var i = 1; i < doors.length; i++) {
    if (depth[i] > depth[best]) {
      best = i;
    }
  }
  return best;
}
