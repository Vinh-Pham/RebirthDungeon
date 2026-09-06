package cloud.vinh.rebirthdungeon.game.commands

/** Player-issued movement request as plain immutable data. The delta is not
 * validated here; [CommandValidationSystem][cloud.vinh.rebirthdungeon.game.ecs.systems.CommandValidationSystem]
 * owns rejection so that a malformed command never mutates the world.
 * Deliberately not a data class: commands compare by identity, not value. */
class MoveCommand(val dx: Int, val dy: Int) {
    override fun toString(): String = "MoveCommand($dx, $dy)"
}
