import 'package:rebirth_dungeon/application/run/run_controller.dart';
import 'package:rebirth_dungeon/domain/combat/combat_command.dart';
import 'package:rebirth_dungeon/domain/combat/combat_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'combat_controller.g.dart';

/// Combat-focused façade over the run controller.
///
/// The domain models combat *inside* the run (`DungeonRunState.combat`), so
/// combat mutations must flow through the run engine. This controller gives
/// the combat UI a focused, intention-revealing API without a second owner
/// of run state; [activeCombat] is the read side.
class CombatController {
  CombatController(this._run);

  final RunController _run;

  void rollDice() => _run.combat(const RollDice());

  void assignDie({required int dieIndex, required String abilityId}) =>
      _run.combat(AssignDieToAbility(dieIndex: dieIndex, abilityId: abilityId));

  void useAbility({required String abilityId, String? targetId}) =>
      _run.combat(UseAbility(abilityId: abilityId, targetId: targetId));

  void endTurn() => _run.combat(const EndTurn());

  void enemyAct() => _run.combat(const EnemyAct());
}

@Riverpod(keepAlive: true)
CombatController combatController(Ref ref) {
  return CombatController(ref.watch(runControllerProvider.notifier));
}

/// The active combat, or null when the hero is not fighting.
@riverpod
CombatState? activeCombat(Ref ref) {
  return ref.watch(runControllerProvider).run?.combat;
}
