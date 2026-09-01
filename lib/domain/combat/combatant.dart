import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/domain/content/status_effect_data.dart';

part 'combatant.freezed.dart';
part 'combatant.g.dart';

/// One status effect currently active on a combatant.
///
/// Debuffs deal their [potency] as direct damage (bypassing defense and
/// shield) at the start of the bearer's turn; buffs add their [potency] to
/// the bearer's attack. Effects expire after [remainingTurns] of the
/// bearer's turns.
@freezed
abstract class ActiveStatusEffect with _$ActiveStatusEffect {
  const factory ActiveStatusEffect({
    required String statusId,
    required StatusEffectKind kind,
    required int potency,
    required int remainingTurns,
  }) = _ActiveStatusEffect;

  factory ActiveStatusEffect.fromJson(Map<String, dynamic> json) =>
      _$ActiveStatusEffectFromJson(json);
}

/// The player's combatant, built from `HeroData` at combat start.
@freezed
abstract class PlayerCombatant with _$PlayerCombatant {
  const factory PlayerCombatant({
    @Default('') String id,
    @Default('') String name,
    @Default(0) int hp,
    @Default(0) int maxHp,
    @Default(0) int attack,
    @Default(0) int defense,
    @Default(0) int shield,
    @Default([]) List<ActiveStatusEffect> statuses,
    @Default([]) List<String> abilityIds,
  }) = _PlayerCombatant;

  factory PlayerCombatant.fromJson(Map<String, dynamic> json) =>
      _$PlayerCombatantFromJson(json);
}

/// One enemy combatant, built from `MonsterData` at combat start.
///
/// [id] is unique within the combat: the first instance of a monster keeps
/// its content id, further instances get a `#2`, `#3`, ... suffix.
/// [basicAttackMax] backs the fallback basic strike used when the monster
/// has no abilities.
@freezed
abstract class EnemyCombatant with _$EnemyCombatant {
  const factory EnemyCombatant({
    @Default('') String id,
    @Default('') String contentId,
    @Default('') String name,
    @Default(0) int hp,
    @Default(0) int maxHp,
    @Default(0) int attack,
    @Default(0) int defense,
    @Default(0) int shield,
    @Default([]) List<ActiveStatusEffect> statuses,
    @Default([]) List<String> abilityIds,
    @Default(1) int basicAttackMax,
  }) = _EnemyCombatant;

  factory EnemyCombatant.fromJson(Map<String, dynamic> json) =>
      _$EnemyCombatantFromJson(json);
}
