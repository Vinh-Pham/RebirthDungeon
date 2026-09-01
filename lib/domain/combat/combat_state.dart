import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/domain/combat/combat_die.dart';
import 'package:rebirth_dungeon/domain/combat/combatant.dart';

part 'combat_state.freezed.dart';
part 'combat_state.g.dart';

/// Where the combat currently is in the turn structure.
///
/// Player turn: `rolling` → `awaitingPlayerAction` → (EndTurn) →
/// `enemyTurn`, where each enemy resolves via one `EnemyAct` command before
/// the next player turn begins. `victory` and `defeat` are terminal.
@JsonEnum()
enum CombatPhase {
  notStarted,
  rolling,
  awaitingPlayerAction,
  enemyTurn,
  victory,
  defeat,
}

/// The complete, immutable state of one combat.
///
/// Fully serializable: Phase 4 stores it inside the run snapshot and Phase 8
/// persists that snapshot. The combat RNG is deliberately *not* part of the
/// state — it lives in the engine (injected, combat-channel seed).
@freezed
abstract class CombatState with _$CombatState {
  const factory CombatState({
    @Default(CombatPhase.notStarted) CombatPhase phase,
    @Default(PlayerCombatant()) PlayerCombatant player,
    @Default([]) List<EnemyCombatant> enemies,
    @Default([]) List<CombatDie> dice,
    @Default(0) int turn,
    @Default(0) int enemyActionCursor,
    @Default(0) int rerollsUsedThisTurn,
  }) = _CombatState;

  factory CombatState.fromJson(Map<String, dynamic> json) =>
      _$CombatStateFromJson(json);
}

extension CombatStateX on CombatState {
  /// Whether the combat has reached a terminal phase.
  bool get isTerminal =>
      phase == CombatPhase.victory || phase == CombatPhase.defeat;

  /// The enemy with the given combat id, or null.
  EnemyCombatant? enemyById(String id) {
    for (final enemy in enemies) {
      if (enemy.id == id) {
        return enemy;
      }
    }
    return null;
  }

  /// The first enemy still alive, or null when all are defeated.
  EnemyCombatant? get firstLivingEnemy {
    for (final enemy in enemies) {
      if (enemy.hp > 0) {
        return enemy;
      }
    }
    return null;
  }

  /// Whether every enemy is defeated.
  bool get allEnemiesDefeated => enemies.every((enemy) => enemy.hp <= 0);
}
