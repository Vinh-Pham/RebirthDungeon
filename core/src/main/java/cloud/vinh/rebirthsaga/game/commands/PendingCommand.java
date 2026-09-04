package cloud.vinh.rebirthsaga.game.commands;

/** Per-step command context shared by the ordered systems through the world
 * configuration. It carries at most one command; the pipeline consumes the
 * intent in registration order and cleanup clears it inside the step. The
 * resolved {@code result} deliberately survives the step so the controller can
 * copy it out after {@code World.process()} returns; the controller clears it
 * before the next command. Plain mutable carrier, never saved or retained
 * across steps. */
public final class PendingCommand {
    public MoveCommand move;
    public CommandResult result;

    /** Clears the intent only; the result stays readable until the controller
     * calls {@link #resetAll()} before the next command. */
    public void clearIntent() {
        move = null;
    }

    public void resetAll() {
        move = null;
        result = null;
    }
}
