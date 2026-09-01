import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';

import 'package:rebirth_dungeon/game/bridge/presentation_event.dart';

/// Translates domain events into [PresentationEvent]s for the Flame layer.
///
/// Pure and side-effect free: the same domain events always translate to the
/// same presentation events, so replaying a run produces identical
/// presentation. The bridge never decides anything about gameplay.
class EventBridge {
  const EventBridge();

  List<PresentationEvent> translate(RunEvent event) {
    return switch (event) {
      CombatHappened(:final event) => _translateCombat(event),
      RunStarted() => const [FloorChanged()],
      RoomEntered(:final roomIndex) => [PlayerMoved(roomIndex)],
      RoomCleared() => const [],
      LootGained(:final roomIndex) => [LootSparkle(roomIndex)],
      ShrineHealed(:final healed) => [
        if (healed > 0)
          HealFx(
            'hero_knight', // shrine heals the hero; id resolved by the world
            healed,
          ),
      ],
      CombatVictory() => const [ScreenShake(3)],
      CombatDefeat() => const [ScreenShake(6)],
      FloorDescended() => const [FloorChanged()],
      RunCompleted() => const [],
      RunFailed() => const [],
    };
  }

  List<PresentationEvent> _translateCombat(CombatEvent event) {
    return switch (event) {
      AbilityActivated(:final actorId, :final targetId) => [
        AttackLunge(actorId, targetId),
      ],
      CriticalHit(:final targetId) => [
        CriticalHitFx(targetId),
        const ScreenShake(5),
      ],
      DamageDealt(:final targetId, :final amount, :final source) => [
        if (amount > 0)
          DamageNumber(targetId: targetId, amount: amount, source: source),
      ],
      ShieldAbsorbed(:final targetId, :final amount) => [
        ShieldBlockFx(targetId, amount),
      ],
      HealingApplied(:final targetId, :final amount) => [
        HealFx(targetId, amount),
      ],
      ShieldGained(:final targetId) => [ShieldGainedFx(targetId)],
      StatusApplied(:final targetId, :final statusId) => [
        StatusFx(targetId, statusId),
      ],
      StatusExpired() => const [],
      EnemyDefeated(:final enemyId) => [MonsterDied(enemyId)],
      PlayerDefeated() => const [ScreenShake(8)],
      CombatWon() => const [],
      CombatStarted() => const [],
      TurnStarted() => const [],
      DiceRolled() => const [],
      DieAssigned() => const [],
    };
  }
}
