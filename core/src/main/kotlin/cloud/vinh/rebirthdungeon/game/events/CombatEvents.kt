package cloud.vinh.rebirthdungeon.game.events

import cloud.vinh.rebirthdungeon.game.combat.abilities.EncounterOutcome
import cloud.vinh.rebirthdungeon.game.content.ResourceVector
import cloud.vinh.rebirthdungeon.game.identity.*

data class CostsPaid(val actor: EntityId, val cost: ResourceVector) : DomainEvent
data class AbilityUsed(val actor: EntityId, val skill: ContentId, val target: EntityId) : DomainEvent
data class ItemUsed(val actor: EntityId, val item: ContentId) : DomainEvent
data class DamageDealt(val source: EntityId, val target: EntityId, val hpDamage: Int, val shieldAbsorbed: Int) : DomainEvent
data class StatusApplied(val target: EntityId, val status: ContentId, val source: EntityId) : DomainEvent
data class StatusExpired(val target: EntityId, val status: ContentId) : DomainEvent
data class ShieldGranted(val actor: EntityId, val amount: Int, val duration: Int) : DomainEvent
data class ResourcesRecovered(val actor: EntityId, val actual: ResourceVector) : DomainEvent
data class Waited(val actor: EntityId) : DomainEvent
data class TurnStarted(val actor: EntityId) : DomainEvent
data class ActivationEnded(val actor: EntityId) : DomainEvent
data class EncounterEnded(val outcome: EncounterOutcome) : DomainEvent
