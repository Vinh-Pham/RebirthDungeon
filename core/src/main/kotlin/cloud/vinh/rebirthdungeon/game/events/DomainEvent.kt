package cloud.vinh.rebirthdungeon.game.events
import cloud.vinh.rebirthdungeon.game.identity.EntityId
sealed interface DomainEvent
data class OrderedEvent(val sequence: Long, val event: DomainEvent) { init { require(sequence > 0) } }
data class ActorRemoved(val actor: EntityId) : DomainEvent
