package cloud.vinh.rebirthdungeon.game.commands

import cloud.vinh.rebirthdungeon.game.content.frozenList
import cloud.vinh.rebirthdungeon.game.identity.*

data class SelectAbilityCommand(val skill: ContentId, val target: EntityId) : RunCommand
data object RollDiceCommand : RunCommand
data class KeepDieCommand(val die: Int, val kept: Boolean) : RunCommand
class RerollDiceCommand(dice: List<Int>) : RunCommand { val dice = frozenList(dice) }
data object UseAbilityCommand : RunCommand
data object EndTurnCommand : RunCommand
data object UseItemCommand : RunCommand
