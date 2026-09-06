package cloud.vinh.rebirthdungeon.game.commands

/** Per-step command context shared by the ordered systems through the world
 * configuration. It carries at most one command; the pipeline consumes the
 * intent in registration order and cleanup clears it inside the step. The
 * resolved [result] deliberately survives the step so the controller can
 * copy it out after `World.process()` returns; the controller clears it
 * before the next command. Plain mutable carrier, never saved or retained
 * across steps. */
class PendingCommand {
    var move: MoveCommand? = null
    var result: CommandResult? = null

    /** Clears the intent only; the result stays readable until the controller
     * calls [resetAll] before the next command. */
    fun clearIntent() {
        move = null
    }

    fun resetAll() {
        move = null
        result = null
    }
}
