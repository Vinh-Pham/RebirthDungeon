package cloud.vinh.rebirthsaga.game.commands;

/** Outcome of one resolved command. Expected rejections are values, not
 * exceptions; only invariant failures should halt a session. Immutable. */
public final class CommandResult {
    public enum Reason {
        /** The command changed authoritative state. */
        ACCEPTED,
        /** The move delta was not a single cardinal step. */
        NOT_CARDINAL,
        /** The destination cell is outside the current floor. */
        OUT_OF_BOUNDS,
        /** The destination cell is terrain the actor cannot enter. */
        BLOCKED
    }

    public static final CommandResult ACCEPTED = new CommandResult(Reason.ACCEPTED);
    public static final CommandResult NOT_CARDINAL = new CommandResult(Reason.NOT_CARDINAL);
    public static final CommandResult OUT_OF_BOUNDS = new CommandResult(Reason.OUT_OF_BOUNDS);
    public static final CommandResult BLOCKED = new CommandResult(Reason.BLOCKED);

    private final Reason reason;

    private CommandResult(Reason reason) {
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }

    public boolean accepted() {
        return reason == Reason.ACCEPTED;
    }

    @Override
    public String toString() {
        return "CommandResult(" + reason + ')';
    }
}
