import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';

part 'combat_event.freezed.dart';

/// Where a damage amount came from — presentation uses this to pick VFX.
@JsonEnum()
enum DamageSource { attack, poison }

/// One die result inside a [DiceRolled] event.
@freezed
abstract class DieRoll with _$DieRoll {
  const factory DieRoll({
    required int dieIndex,
    required int value,
    @Default([]) List<String> tags,
  }) = _DieRoll;
}

/// Immutable facts emitted while resolving a combat command.
@freezed
sealed class CombatEvent extends GameEvent with _$CombatEvent {
  const CombatEvent._();

  const factory CombatEvent.combatStarted({
    required String playerId,
    required List<String> enemyIds,
  }) = CombatStarted;

  const factory CombatEvent.turnStarted({required int turn}) = TurnStarted;

  const factory CombatEvent.diceRolled({required List<DieRoll> rolls}) =
      DiceRolled;

  const factory CombatEvent.dieAssigned({
    required int dieIndex,
    required String abilityId,
  }) = DieAssigned;

  /// [abilityId] is null for an enemy's fallback basic strike.
  const factory CombatEvent.abilityActivated({
    required String actorId,
    String? abilityId,
    required String targetId,
  }) = AbilityActivated;

  const factory CombatEvent.criticalHit({
    required String targetId,
    required int amount,
  }) = CriticalHit;

  const factory CombatEvent.shieldAbsorbed({
    required String targetId,
    required int amount,
  }) = ShieldAbsorbed;

  const factory CombatEvent.damageDealt({
    required String targetId,
    required int amount,
    required int remainingHp,
    required DamageSource source,
  }) = DamageDealt;

  const factory CombatEvent.healingApplied({
    required String targetId,
    required int amount,
    required int remainingHp,
  }) = HealingApplied;

  const factory CombatEvent.shieldGained({
    required String targetId,
    required int amount,
    required int totalShield,
  }) = ShieldGained;

  const factory CombatEvent.statusApplied({
    required String targetId,
    required String statusId,
    required int potency,
    required int remainingTurns,
  }) = StatusApplied;

  const factory CombatEvent.statusExpired({
    required String targetId,
    required String statusId,
  }) = StatusExpired;

  const factory CombatEvent.enemyDefeated({required String enemyId}) =
      EnemyDefeated;

  const factory CombatEvent.playerDefeated() = PlayerDefeated;

  const factory CombatEvent.combatWon({required int turns}) = CombatWon;
}
