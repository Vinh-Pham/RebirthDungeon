import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/value_objects/int_range.dart';

part 'dungeon_data.freezed.dart';
part 'dungeon_data.g.dart';

/// Data-driven definition of a dungeon (`assets/data/dungeons.json`).
///
/// This file describes *parameters*; Phase 4 turns them (plus a run seed)
/// into a concrete procedural topology.
@freezed
abstract class DungeonData with _$DungeonData {
  const factory DungeonData({
    required String id,
    required String name,
    @Default('') String description,
    required int floorCount,
    required IntRange roomsPerFloor,
    required List<String> monsterPool,
    required String bossId,
    required String lootTableId,
    @Default(1) int recommendedLevel,
  }) = _DungeonData;

  factory DungeonData.fromJson(Map<String, dynamic> json) =>
      _$DungeonDataFromJson(json);
}
