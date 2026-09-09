package cloud.vinh.rebirthdungeon.game.events

import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.*

data class EncounterStarted(val participant: EntityId) : DomainEvent
data class AbilitySelected(val actor: EntityId, val selection: Selection) : DomainEvent
data class DieChanged(val actor: EntityId, val die: Int, val face: Int) : DomainEvent
data class DieKept(val actor: EntityId, val die: Int, val kept: Boolean) : DomainEvent
data class CostsReserved(val actor: EntityId, val cost: ResourceVector) : DomainEvent
data class CostsPaid(val actor: EntityId, val cost: ResourceVector) : DomainEvent
data class AbilityUsed(val actor: EntityId, val skill: ContentId, val target: EntityId) : DomainEvent
data class DamageDealt(val source: EntityId, val target: EntityId, val hpDamage: Int, val shieldAbsorbed: Int) : DomainEvent
data class StatusApplied(val target: EntityId, val status: ContentId, val source: EntityId) : DomainEvent
data class StatusExpired(val target: EntityId, val status: ContentId) : DomainEvent
data class ShieldGranted(val actor: EntityId, val amount: Int, val duration: Int) : DomainEvent
data class ResourcesRecovered(val actor: EntityId, val actual: ResourceVector) : DomainEvent
data class ActivationEnded(val actor: EntityId) : DomainEvent
data class EncounterEnded(val outcome: EncounterOutcome) : DomainEvent
