import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/value_objects/int_range.dart';

part 'ability_data.freezed.dart';
part 'ability_data.g.dart';

/// What an ability does when activated.
@JsonEnum()
enum AbilityEffect { damage, heal, shield }

/// Data-driven definition of an ability (`assets/data/abilities.json`).
///
/// When [statusId] is set, activating the ability also applies that status
/// effect to the target (e.g. a strike that poisons).
@freezed
abstract class AbilityData with _$AbilityData {
  const factory AbilityData({
    required String id,
    required String name,
    @Default('') String description,
    required AbilityEffect effect,
    required IntRange power,
    @Default(1) int dieCost,
    String? statusId,
  }) = _AbilityData;

  factory AbilityData.fromJson(Map<String, dynamic> json) =>
      _$AbilityDataFromJson(json);
}
