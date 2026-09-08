package cloud.vinh.rebirthdungeon.game.commands

sealed interface RunCommand
data object WaitCommand : RunCommand
/** Only the controller submits this when an AI actor is due. */
internal data object AutomaticCommand : RunCommand
