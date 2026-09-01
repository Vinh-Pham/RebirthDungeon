import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';

part 'combat_command.freezed.dart';

/// All player/system intents the combat engine resolves.
@freezed
sealed class CombatCommand extends GameCommand with _$CombatCommand {
  const CombatCommand._();

  const factory CombatCommand.startCombat({
    required String heroId,
    required List<String> monsterIds,
  }) = StartCombat;

  const factory CombatCommand.rollDice() = RollDice;

  const factory CombatCommand.rerollDice({required List<int> dieIndices}) =
      RerollDice;

  const factory CombatCommand.assignDie({
    required int dieIndex,
    required String abilityId,
  }) = AssignDieToAbility;

  const factory CombatCommand.useAbility({
    required String abilityId,
    String? targetId,
  }) = UseAbility;

  const factory CombatCommand.endTurn() = EndTurn;

  const factory CombatCommand.enemyAct() = EnemyAct;
}
