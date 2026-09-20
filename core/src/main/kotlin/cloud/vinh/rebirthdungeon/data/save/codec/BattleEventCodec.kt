package cloud.vinh.rebirthdungeon.data.save.codec

import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.combat.abilities.EncounterOutcome
import com.badlogic.gdx.utils.JsonValue

internal object BattleEventCodec {
    fun encode(e: OrderedEvent): List<Any?> {
        val v = when (val d = e.event) {
            is CostsPaid -> listOf("cost", d.actor.value, CombatCheckpointCodec.vector(d.cost))
            is AbilityUsed -> listOf("ability", d.actor.value, d.skill.value, d.target.value)
            is ItemUsed -> listOf("item", d.actor.value, d.item.value)
            is DamageDealt -> listOf("damage", d.source.value, d.target.value, d.hpDamage, d.shieldAbsorbed)
            is StatusApplied -> listOf("status", d.target.value, d.status.value, d.source.value)
            is StatusExpired -> listOf("expire", d.target.value, d.status.value)
            is ShieldGranted -> listOf("shield", d.actor.value, d.amount, d.duration)
            is ResourcesRecovered -> listOf("recovery", d.actor.value, CombatCheckpointCodec.vector(d.actual))
            is Waited -> listOf("wait", d.actor.value)
            is TurnStarted -> listOf("start", d.actor.value)
            is ActivationEnded -> listOf("end", d.actor.value)
            is ActorRemoved -> listOf("defeat", d.actor.value)
            is EncounterEnded -> listOf("outcome", d.outcome.name)
        }
        return listOf(e.sequence, e.round, e.turn, e.operation, v, e.battle)
    }
    fun decode(v: JsonValue): OrderedEvent {
        v.record(6); val d = v[4]; require(d.isArray && d.size >= 2)
        fun actor(i: Int) = EntityId(d[i].long())
        fun content(i: Int) = ContentId(d[i].text())
        val event: DomainEvent = when (d[0].text()) {
            "cost" -> { d.record(3); CostsPaid(actor(1), CombatCheckpointCodec.vector(d[2])) }
            "ability" -> { d.record(4); AbilityUsed(actor(1), content(2), actor(3)) }
            "item" -> { d.record(3); ItemUsed(actor(1), content(2)) }
            "damage" -> { d.record(5); DamageDealt(actor(1), actor(2), d[3].int(), d[4].int()) }
            "status" -> { d.record(4); StatusApplied(actor(1), content(2), actor(3)) }
            "expire" -> { d.record(3); StatusExpired(actor(1), content(2)) }
            "shield" -> { d.record(4); ShieldGranted(actor(1), d[2].int(), d[3].int()) }
            "recovery" -> { d.record(3); ResourcesRecovered(actor(1), CombatCheckpointCodec.vector(d[2])) }
            "wait" -> { d.record(2); Waited(actor(1)) }
            "start" -> { d.record(2); TurnStarted(actor(1)) }
            "end" -> { d.record(2); ActivationEnded(actor(1)) }
            "defeat" -> { d.record(2); ActorRemoved(actor(1)) }
            "outcome" -> { d.record(2); EncounterEnded(EncounterOutcome.valueOf(d[1].text())) }
            else -> throw IllegalArgumentException("Unknown battle event")
        }
        return OrderedEvent(v[0].long(), event, v[1].long(), v[2].long(), v[3].long(), v[5].text())
    }
}
