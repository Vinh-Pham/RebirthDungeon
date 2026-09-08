package cloud.vinh.rebirthdungeon.game.commands

/** Outcome of one resolved command. Expected rejections are values, not
 * exceptions; only invariant failures should halt a session. Immutable. */
data class CommandResult private constructor(val reason: Reason) {
    enum class Reason {
        /** The command changed authoritative state. */
        ACCEPTED,
        /** The move delta was not a single cardinal step. */
        NOT_CARDINAL,
        /** The destination cell is outside the current floor. */
        OUT_OF_BOUNDS,
        /** The destination cell is terrain the actor cannot enter. */
        BLOCKED
    }

    fun accepted(): Boolean = reason == Reason.ACCEPTED

    override fun toString(): String = "CommandResult($reason)"

    companion object {
        val ACCEPTED = CommandResult(Reason.ACCEPTED)
        val NOT_CARDINAL = CommandResult(Reason.NOT_CARDINAL)
        val OUT_OF_BOUNDS = CommandResult(Reason.OUT_OF_BOUNDS)
        val BLOCKED = CommandResult(Reason.BLOCKED)
    }
}
