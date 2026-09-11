package cloud.vinh.rebirthdungeon.game.commands

/** Outcome of one resolved command. Expected rejections are values, not
 * exceptions; only invariant failures should halt a session. Immutable. */
data class CommandResult private constructor(val reason: Reason) {
    enum class Reason {
        /** The command changed authoritative state. */
        ACCEPTED,
        NOT_PLAYER_TURN, STALE_SESSION, SAVE_REQUIRED, INVALID_PHASE, INVALID_DICE, INVALID_SKILL, INVALID_TARGET, EQUIPMENT_REQUIRED, COOLDOWN, INSUFFICIENT_HP, INSUFFICIENT_MP, INSUFFICIENT_SP, TERMINAL, ITEM_UNAVAILABLE
    }

    fun accepted(): Boolean = reason == Reason.ACCEPTED

    override fun toString(): String = "CommandResult($reason)"

    companion object {
        fun rejected(reason: Reason) = CommandResult(reason)
        val ACCEPTED = CommandResult(Reason.ACCEPTED)
    }
}
