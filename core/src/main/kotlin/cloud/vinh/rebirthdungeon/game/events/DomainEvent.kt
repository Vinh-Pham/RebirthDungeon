package cloud.vinh.rebirthdungeon.game.events

import cloud.vinh.rebirthdungeon.game.identity.EntityId

sealed interface DomainEvent

data class Cell(val x: Int, val y: Int)
data class ActorMoved(val actor: EntityId, val from: Cell, val to: Cell) : DomainEvent
/** Sequences begin at one, scoped to the owning run. */
data class OrderedEvent(val sequence: Long, val event: DomainEvent) {
    init { require(sequence > 0) }
}
