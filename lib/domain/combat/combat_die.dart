import 'package:freezed_annotation/freezed_annotation.dart';

part 'combat_die.freezed.dart';
part 'combat_die.g.dart';

/// Lifecycle of one die within a turn.
///
/// `unrolled` → `available` (rolled this turn) → `assigned` (dragged onto an
/// ability) → `spent` (consumed by activating that ability). Turn start
/// resets everything to `unrolled`.
@JsonEnum()
enum DieStatus { unrolled, available, assigned, spent }

/// One die in the player's dice pool for the current combat.
@freezed
abstract class CombatDie with _$CombatDie {
  const factory CombatDie({
    required int dieIndex,
    required String dieId,
    required int sides,
    required int maxFace,
    int? faceValue,
    @Default([]) List<String> tags,
    @Default(DieStatus.unrolled) DieStatus status,
    String? assignedAbility,
  }) = _CombatDie;

  factory CombatDie.fromJson(Map<String, dynamic> json) =>
      _$CombatDieFromJson(json);
}
