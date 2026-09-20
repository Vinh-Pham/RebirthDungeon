package cloud.vinh.rebirthdungeon.presentation.hud

import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.combat.stats.StaminaRules

object BattleLog {
    fun text(e: OrderedEvent): String {
        fun name(id: EntityId) = if (id.value == 1L) "Hero" else "Enemy"
        val text = when (val d = e.event) {
            is CostsPaid -> "${name(d.actor)} paid ${d.cost.hp} HP, ${d.cost.mp} MP, ${StaminaRules.format(d.cost.spTenths)} SP"
            is AbilityUsed -> "${name(d.actor)} used ${d.skill.value.removePrefix("skill.").replace('_', ' ')} on ${name(d.target)}"
            is ItemUsed -> "${name(d.actor)} used ${d.item.value.removePrefix("potion.")}"
            is DamageDealt -> "${name(d.target)} lost ${d.hpDamage} HP (${d.shieldAbsorbed} absorbed)"
            is ResourcesRecovered -> "${name(d.actor)} recovered ${d.actual.hp} HP, ${d.actual.mp} MP, ${StaminaRules.format(d.actual.spTenths)} SP"
            is StatusApplied -> "${name(d.target)} gained ${d.status.value.substringAfter('.').replace('_', ' ')}"
            is StatusExpired -> "${name(d.target)}: ${d.status.value.substringAfter('.').replace('_', ' ')} expired"
            is ShieldGranted -> "${name(d.actor)} gained ${d.amount} shield"
            is Waited -> "${name(d.actor)} waited"
            is TurnStarted -> "${name(d.actor)} turn started"
            is ActivationEnded -> "${name(d.actor)} turn ended"
            is ActorRemoved -> "${name(d.actor)} defeated"
            is EncounterEnded -> "Battle ${d.outcome.name.lowercase()}"
        }
        return "R${e.round} / T${e.turn}: $text"
    }
}
