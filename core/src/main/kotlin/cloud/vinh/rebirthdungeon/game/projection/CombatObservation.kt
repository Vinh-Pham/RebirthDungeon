package cloud.vinh.rebirthdungeon.game.projection

import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.ecs.components.CooldownState
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.turns.SchedulerState

class CombatObservation(val outcome: EncounterOutcome?, val defeated: Boolean, val inBattle: Boolean,
    actors: List<CombatActorObservation>, val turn: SchedulerState) {
    val actors = frozenList(actors)
}
class CombatActorObservation(val id: EntityId, val current: ResourceVector, val maximum: ResourceVector,
    val costFlat: ResourceVector, val costPercent: CostPercent,
    val shield: Int, val shieldDuration: Int, val shieldSkipsBoundary: Boolean,
    baseline: Map<ContentId, Int>, modifiers: List<StatModifier>, stats: Map<ContentId, Int>,
    learned: Map<ContentId, String>, equipment: List<String>,
    statuses: List<ActiveStatus>, cooldowns: Map<String, CooldownState>,
    val defending: Boolean = false, val previousAction: String = "", val masteryRank: String = "F", items: Map<ContentId, Int> = emptyMap()) {
    val baseline = frozenMap(baseline)
    val modifiers = frozenList(modifiers)
    val stats = frozenMap(stats)
    val learned = frozenMap(learned)
    val equipment = frozenList(equipment)
    val statuses = frozenList(statuses)
    val cooldowns = frozenMap(cooldowns)
    val items = frozenMap(items)
    internal fun canonical(): String = buildString {
        append(id).append('|').append(current).append('|').append(maximum).append('|').append(costFlat).append('|').append(costPercent)
        append('|').append(shield).append('|').append(shieldDuration).append('|').append(shieldSkipsBoundary)
        append('|').append(baseline.entries.sortedBy { it.key.value }).append('|').append(modifiers.sortedWith(compareBy({ it.source }, { it.stat.value })))
        append('|').append(stats.entries.sortedBy { it.key.value }).append('|').append(learned.entries.sortedBy { it.key.value }).append('|').append(equipment)
        append('|').append(statuses).append('|').append(cooldowns.toSortedMap())
        append('|').append(defending).append('|').append(previousAction).append('|').append(masteryRank).append('|').append(items.entries.sortedBy { it.key.value })
    }
}
