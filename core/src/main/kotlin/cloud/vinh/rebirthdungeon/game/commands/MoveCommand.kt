package cloud.vinh.rebirthdungeon.game.commands

/** Immutable replayable request. Validation belongs to the command pipeline. */
data class MoveCommand(val dx: Int, val dy: Int)
