package cloud.vinh.rebirthdungeon.game.projection

import cloud.vinh.rebirthdungeon.game.content.frozenList
import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.events.OrderedEvent
import cloud.vinh.rebirthdungeon.game.identity.EntityId

/** Observed-only export after world processing; no ECS components or restore state. */
class MovementSnapshot(val commandSequence: Long, val player: EntityId, val cell: Cell, events: List<OrderedEvent>) {
    val events: List<OrderedEvent> = frozenList(events)
}
