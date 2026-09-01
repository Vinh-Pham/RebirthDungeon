import 'package:freezed_annotation/freezed_annotation.dart';

part 'run_room.freezed.dart';
part 'run_room.g.dart';

/// What a room contains and how the run engine resolves entering it.
@JsonEnum()
enum RoomKind { entry, combat, treasure, event, boss }

/// One rolled loot grant, ready to be applied to the account when the run
/// ends (Phase 9).
@freezed
abstract class RunLoot with _$RunLoot {
  const factory RunLoot({required String itemId, required int quantity}) =
      _RunLoot;

  factory RunLoot.fromJson(Map<String, dynamic> json) =>
      _$RunLootFromJson(json);
}

/// One room of the current dungeon floor.
///
/// Doors always connect grid-adjacent rooms, so a floor is drawable as a
/// tiled map.
///
/// [doors] holds the indices of directly connected rooms (always
/// reciprocal). Combat and boss rooms pre-roll their [monsterIds]; treasure
/// rooms pre-roll their [loot] — all at generation time, so a floor is fully
/// determined by the run seed.
@freezed
abstract class RunRoom with _$RunRoom {
  const factory RunRoom({
    required int index,

    /// Grid cell of this room on the floor, used by the presentation layer
    /// to place the room in the world.
    required int x,
    required int y,
    required RoomKind kind,
    @Default([]) List<int> doors,
    @Default([]) List<String> monsterIds,
    @Default([]) List<RunLoot> loot,
    @Default(false) bool cleared,
  }) = _RunRoom;

  factory RunRoom.fromJson(Map<String, dynamic> json) =>
      _$RunRoomFromJson(json);
}
