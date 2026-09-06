package cloud.vinh.rebirthdungeon.game.ecs.systems

import cloud.vinh.rebirthdungeon.game.commands.CommandResult
import cloud.vinh.rebirthdungeon.game.commands.PendingCommand
import cloud.vinh.rebirthdungeon.game.ecs.components.GridPosition
import cloud.vinh.rebirthdungeon.game.ecs.components.PlayerControlled
import com.artemis.BaseEntitySystem
import com.artemis.ComponentMapper
import ktx.artemis.allOf
import kotlin.math.abs

/** Pipeline slot 100 (documentation label; order is fixed by registration).
 * Validates the pending command against the active player and the floor before
 * any system mutates state; a rejected command leaves the world untouched. The
 * player is resolved from its aspect subscription at process time, never from
 * a cached entity id (ids are recycled by artemis). */
class CommandValidationSystem(
    private val pending: PendingCommand,
    private val floorWidth: Int,
    private val floorHeight: Int
) : BaseEntitySystem(allOf(PlayerControlled::class)) {

    private lateinit var mPosition: ComponentMapper<GridPosition>

    override fun processSystem() {
        val move = pending.move ?: return

        val player = solePlayerEntity()

        // Exactly one axis may move, by exactly one cell.
        if (abs(move.dx) + abs(move.dy) != 1) {
            pending.result = CommandResult.NOT_CARDINAL
            pending.clearIntent()
            return
        }

        val position = mPosition.get(player)
        val targetX = position.x + move.dx
        val targetY = position.y + move.dy
        if (targetX < 0 || targetY < 0 || targetX >= floorWidth || targetY >= floorHeight) {
            pending.result = CommandResult.OUT_OF_BOUNDS
            pending.clearIntent()
            return
        }

        // Validated so far; MovementSystem decides terrain walkability.
        pending.result = CommandResult.ACCEPTED
    }

    /** The spike has exactly one player; Phase 3's active-actor selection
     * replaces this lookup. */
    private fun solePlayerEntity(): Int {
        val entities = subscription.entities
        if (entities.size() != 1)
            throw IllegalStateException("expected exactly one player entity, found " + entities.size())
        return entities[0]
    }
}
