package cloud.vinh.rebirthsaga.game.commands;

/** Player-issued movement request as plain immutable data. The delta is not
 * validated here; {@code CommandValidationSystem} owns rejection so that a
 * malformed command never mutates the world. */
public final class MoveCommand {
    public final int dx;
    public final int dy;

    public MoveCommand(int dx, int dy) {
        this.dx = dx;
        this.dy = dy;
    }

    @Override
    public String toString() {
        return "MoveCommand(" + dx + ", " + dy + ')';
    }
}
