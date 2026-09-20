package cloud.vinh.rebirthdungeon.game.commands

import cloud.vinh.rebirthdungeon.game.identity.*

data class TurnRef(val battle: String, val actor: EntityId, val sequence: Long)
sealed interface BattleActionCommand : RunCommand { val turn: TurnRef }
data class AttackCommand(override val turn: TurnRef, val target: EntityId) : BattleActionCommand
data class UseSkillCommand(override val turn: TurnRef, val skill: ContentId, val target: EntityId) : BattleActionCommand
data class DefendCommand(override val turn: TurnRef) : BattleActionCommand
data class WaitCommand(override val turn: TurnRef) : BattleActionCommand
/** SessionCoordinator validates and includes carried stock in the enclosing bundle. */
data class DrinkPotionCommand(override val turn: TurnRef, val potion: ContentId) : BattleActionCommand
internal data class BeginTurnCommand(val turn: TurnRef) : RunCommand
