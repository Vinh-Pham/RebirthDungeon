package cloud.vinh.rebirthdungeon.game.events
import cloud.vinh.rebirthdungeon.game.identity.EntityId
sealed interface DomainEvent
data class OrderedEvent(val sequence: Long, val event: DomainEvent, val round: Long = 1, val turn: Long = 1, val operation: Long = 1, val battle: String = "fixture") { init { require(sequence > 0 && round > 0 && turn > 0 && operation > 0 && battle.isNotBlank()) } }
data class ActorRemoved(val actor: EntityId) : DomainEvent
