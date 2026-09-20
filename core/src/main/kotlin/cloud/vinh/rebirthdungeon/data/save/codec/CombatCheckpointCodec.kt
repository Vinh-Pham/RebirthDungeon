package cloud.vinh.rebirthdungeon.data.save.codec

import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.ecs.components.CooldownState
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import com.badlogic.gdx.utils.*

internal object CombatCheckpointCodec {
    internal fun vector(v: ResourceVector) = listOf(v.hp, v.mp, v.spTenths)
    internal fun vector(v: JsonValue): ResourceVector { v.record(3); return ResourceVector(v[0].int(), v[1].int(), v[2].int()) }
    private fun stats(v: JsonValue) = unique(v.rows().map { it.record(2); ContentId(it[0].text()) to it[1].int() })
    private fun <K,V> unique(pairs: List<Pair<K,V>>): Map<K,V> { require(pairs.map { it.first }.distinct().size == pairs.size); return pairs.toMap() }
    fun encode(c: CombatRestore?): String {
        if (c == null) return ""
        return jsonText(listOf(2, c.defeated, c.outcome?.name, c.participants, c.actors.map { a ->
            listOf(a.id.value, vector(a.current), vector(a.maximum), vector(a.costFlat), listOf(a.costPercent.hp, a.costPercent.mp, a.costPercent.sp),
                a.shield, a.shieldDuration, a.shieldSkipsBoundary,
                a.baseline.entries.sortedBy { it.key.value }.map { listOf(it.key.value, it.value) }, a.modifiers.map { listOf(it.source, it.stat.value, it.flat, it.percent) },
                a.stats.entries.sortedBy { it.key.value }.map { listOf(it.key.value, it.value) }, a.learned.entries.sortedBy { it.key.value }.map { listOf(it.key.value, it.value) }, a.equipment,
                a.statuses.map { listOf(it.definition.value, it.source.value, it.remaining, it.skipBoundary) }, a.cooldowns.toSortedMap().map { listOf(it.key, it.value.remaining, it.value.skipBoundary) },
                a.defending, a.previousAction, a.masteryRank, a.items.entries.sortedBy { it.key.value }.map { listOf(it.key.value, it.value) })
        }))
    }
    fun decode(text: String): CombatRestore? {
        if (text.isEmpty()) return null
        val c = JsonReader().parse(text).record(5)
        if (c[0].int() != 2) throw UnsupportedCheckpoint("Unsupported combat version; start a new save")
        return CombatRestore(c[1].bool(), if (c[2].isNull) null else EncounterOutcome.valueOf(c[2].text()), c[3].rows().map { it.long() }, c[4].rows().map { a ->
            a.record(19); val pct = a[4].record(3)
            CombatActorObservation(EntityId(a[0].long()), vector(a[1]), vector(a[2]), vector(a[3]), CostPercent(pct[0].int(), pct[1].int(), pct[2].int()),
                a[5].int(), a[6].int(), a[7].bool(), stats(a[8]), a[9].rows().map { it.record(4); StatModifier(it[0].text(), ContentId(it[1].text()), it[2].int(), it[3].int()) }, stats(a[10]),
                unique(a[11].rows().map { it.record(2); ContentId(it[0].text()) to it[1].text() }), a[12].rows().map { it.text() },
                a[13].rows().map { it.record(4); ActiveStatus(ContentId(it[0].text()), EntityId(it[1].long()), it[2].int(), it[3].bool()) },
                unique(a[14].rows().map { it.record(3); it[0].text() to CooldownState(it[1].int(), it[2].bool()) }),
                a[15].bool(), a[16].text(), a[17].text(), unique(a[18].rows().map { it.record(2); ContentId(it[0].text()) to it[1].int() }))
        })
    }
}
