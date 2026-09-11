package cloud.vinh.rebirthdungeon.game.commands
sealed interface RunCommand
internal data object AutomaticCommand : RunCommand
/** The application validates inventory and commits consumption with the resulting battle state. */
data class DrinkPotionCommand(val potion: cloud.vinh.rebirthdungeon.game.identity.ContentId) : RunCommand
