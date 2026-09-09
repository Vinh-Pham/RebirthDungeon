package cloud.vinh.rebirthdungeon.game.projection

import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.ecs.components.*
import cloud.vinh.rebirthdungeon.game.identity.*

class CombatObservation(val outcome: EncounterOutcome?, val defeated: Boolean, actors: List<CombatActorObservation>) {
    val actors = frozenList(actors)
}
class CombatActorObservation(val id: EntityId, val current: ResourceVector, val maximum: ResourceVector,
    val reserved: ResourceVector, val costFlat: ResourceVector, val costPercent: ResourceVector,
    val shield: Int, val shieldDuration: Int, val shieldSkipsBoundary: Boolean,
    baseline: Map<ContentId, Int>, modifiers: List<StatModifier>, stats: Map<ContentId, Int>,
    learned: Map<ContentId, String>, equipment: List<String>,
    val open: Boolean, val selection: Selection?, val locked: LockedAbility?, faces: List<Int>, kept: List<Boolean>, val rerolls: Int,
    statuses: List<ActiveStatus>, cooldowns: Map<String, CooldownState>, val preview: DamageResult?) {
    val baseline = frozenMap(baseline)
    val modifiers = frozenList(modifiers)
    val stats = frozenMap(stats)
    val learned = frozenMap(learned)
    val equipment = frozenList(equipment)
    val faces = frozenList(faces)
    val kept = frozenList(kept)
    val statuses = frozenList(statuses)
    val cooldowns = frozenMap(cooldowns)
    internal fun canonical(): String = buildString {
        append(id).append('|').append(current).append('|').append(maximum).append('|').append(reserved)
        append('|').append(costFlat).append('|').append(costPercent)
        append('|').append(shield).append('|').append(shieldDuration).append('|').append(shieldSkipsBoundary)
        append('|').append(baseline.entries.sortedBy { it.key.value }).append('|').append(modifiers.sortedWith(compareBy({ it.source }, { it.stat.value })))
        append('|').append(stats.entries.sortedBy { it.key.value }).append('|').append(learned.entries.sortedBy { it.key.value }).append('|').append(equipment)
        append('|').append(open).append('|').append(selection).append('|').append(faces).append('|').append(kept).append('|').append(rerolls)
        append('|').append(statuses).append('|').append(cooldowns.toSortedMap())
        locked?.let { append('|').append(it.selection).append('|').append(it.inputs).append('|').append(it.cost)
            append('|').append(it.rank.weights).append('|').append(it.rank.basePower).append('|').append(it.rank.pipScale) }
    }
}
