package cloud.vinh.rebirthdungeon.game.ecs.systems

import cloud.vinh.rebirthdungeon.game.commands.CommandResult
import cloud.vinh.rebirthdungeon.game.commands.PendingCommand
import cloud.vinh.rebirthdungeon.game.ecs.components.GridPosition
import cloud.vinh.rebirthdungeon.game.ecs.components.PlayerControlled
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import com.artemis.BaseEntitySystem
import com.artemis.ComponentMapper
import ktx.artemis.allOf

/** Pipeline slot 200. Commits a validated cardinal step when the destination
 * terrain allows it; a blocked destination is a normal CommandResult value and
 * mutates nothing. Runs after CommandValidationSystem by registration order. */
class MovementSystem(
    private val pending: PendingCommand,
    private val floor: FloorMap
) : BaseEntitySystem(allOf(PlayerControlled::class)) {

    private lateinit var mPosition: ComponentMapper<GridPosition>

    override fun processSystem() {
        val move = pending.move ?: return

        val player = solePlayerEntity()
        val position = mPosition.get(player)
        val targetX = position.x + move.dx
        val targetY = position.y + move.dy
        if (!floor.isWalkable(targetX, targetY)) {
            pending.result = CommandResult.BLOCKED
            pending.clearIntent()
            return
        }

        // Entity edits go through the mapper; create() returns the existing
        // component and the edit applies immediately to the entity.
        val target = mPosition.create(player)
        target.x = targetX
        target.y = targetY
        pending.result = CommandResult.ACCEPTED
    }

    private fun solePlayerEntity(): Int {
        val entities = subscription.entities
        if (entities.size() != 1)
            throw IllegalStateException("expected exactly one player entity, found " + entities.size())
        return entities[0]
    }
}
