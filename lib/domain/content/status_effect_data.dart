import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/value_objects/int_range.dart';

part 'status_effect_data.freezed.dart';
part 'status_effect_data.g.dart';

/// Whether a status effect helps or harms its bearer.
@JsonEnum()
enum StatusEffectKind { buff, debuff }

/// Data-driven definition of a status effect
/// (`assets/data/status_effects.json`).
@freezed
abstract class StatusEffectData with _$StatusEffectData {
  const factory StatusEffectData({
    required String id,
    required String name,
    @Default('') String description,
    required StatusEffectKind kind,
    required IntRange potency,
    required IntRange durationTurns,
  }) = _StatusEffectData;

  factory StatusEffectData.fromJson(Map<String, dynamic> json) =>
      _$StatusEffectDataFromJson(json);
}
