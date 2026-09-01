import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/value_objects/int_range.dart';

part 'monster_data.freezed.dart';
part 'monster_data.g.dart';

/// Data-driven definition of a monster (`assets/data/monsters.json`).
@freezed
abstract class MonsterData with _$MonsterData {
  const factory MonsterData({
    required String id,
    required String name,
    @Default('') String description,
    required int hp,
    required int attack,
    required int defense,
    @Default([]) List<String> abilityIds,
    required IntRange xpReward,
    String? lootTableId,
  }) = _MonsterData;

  factory MonsterData.fromJson(Map<String, dynamic> json) =>
      _$MonsterDataFromJson(json);
}
