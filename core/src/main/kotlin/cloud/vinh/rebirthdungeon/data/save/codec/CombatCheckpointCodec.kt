package cloud.vinh.rebirthdungeon.data.save.codec

import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.ecs.components.CooldownState
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import com.badlogic.gdx.utils.JsonReader
import com.badlogic.gdx.utils.JsonValue

/** Explicit positional records, versioned separately from movement checkpoints. */
internal object CombatCheckpointCodec {
    private fun vector(v: ResourceVector) = listOf(v.hp, v.mp, v.sp)
    private fun selection(v: Selection?) = v?.let { listOf(it.skill.value, it.rank, it.target.value.toString()) }
    private fun rank(v: SkillRank) = listOf(v.rank, v.order, v.basePower, v.pipScale, vector(v.cost), v.weights)
    fun encode(c: CombatRestore?): String {
        if (c == null) return ""
        val value = listOf(1, c.defeated, c.outcome?.name, c.participants.map { it.toString() }, c.actors.map { a ->
            listOf(a.id.value.toString(), vector(a.current), vector(a.maximum), vector(a.reserved), vector(a.costFlat), vector(a.costPercent),
                a.shield, a.shieldDuration, a.shieldSkipsBoundary,
                a.baseline.map { listOf(it.key.value, it.value) }, a.modifiers.map { listOf(it.source, it.stat.value, it.flat, it.percent) },
                a.stats.map { listOf(it.key.value, it.value) }, a.learned.map { listOf(it.key.value, it.value) }, a.equipment,
                a.open, selection(a.selection), a.locked?.let { l -> listOf(selection(l.selection), rank(l.rank),
                    l.definition.let { d -> listOf(d.id.value, d.name, d.prototypeCap, d.scoring.value, d.attackStat.value,
                        d.ranks.map(::rank), d.effect.name, d.target.name, d.requiredEquipment, d.range, d.cooldown, d.status?.value, d.shieldDuration) },
                    listOf(l.inputs.base, l.inputs.attack, l.inputs.pipScale, l.inputs.defense, l.inputs.protection), vector(l.cost)) },
                a.faces, a.kept, a.rerolls, a.statuses.map { listOf(it.definition.value, it.source.value.toString(), it.remaining, it.skipBoundary) },
                a.cooldowns.map { listOf(it.key, it.value.remaining, it.value.skipBoundary) })
        })
        // Write only primitive arrays: no runtime class metadata or reflective game objects.
        fun tree(v: Any?): JsonValue = when (v) {
            null -> JsonValue(JsonValue.ValueType.nullValue)
            is String -> JsonValue(v)
            is Int -> JsonValue(v.toLong())
            is Boolean -> JsonValue(v)
            is List<*> -> JsonValue(JsonValue.ValueType.array).also { n -> v.forEach { n.addChild(tree(it)) } }
            else -> error("Unsupported checkpoint value")
        }
        return tree(value).toJson(com.badlogic.gdx.utils.JsonWriter.OutputType.json)
    }
    private fun array(v: JsonValue): List<JsonValue> { require(v.isArray); return v.toList() }
    private fun <K, V> unique(pairs: List<Pair<K, V>>): Map<K, V> {
        require(pairs.map { it.first }.distinct().size == pairs.size) { "Duplicate combat map key" }; return pairs.toMap()
    }
    private fun JsonValue.record(size: Int): JsonValue { require(isArray && this.size == size); return this }
    private fun JsonValue.integer(): Int { require(isLong && asLong() in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong()); return asInt() }
    private fun JsonValue.string(): String { require(isString); return asString() }
    private fun JsonValue.boolean(): Boolean { require(isBoolean); return asBoolean() }
    private fun JsonValue.id(): Long = string().also { require(it.matches(Regex("[1-9][0-9]*"))) }.toLong()
    private fun vector(v: JsonValue): ResourceVector { v.record(3); return ResourceVector(v[0].integer(), v[1].integer(), v[2].integer()) }
    private fun selection(v: JsonValue): Selection? = if (v.isNull) null else v.record(3).let { Selection(ContentId(it[0].string()), it[1].string(), EntityId(it[2].id())) }
    private fun rank(v: JsonValue): SkillRank { v.record(6); return SkillRank(v[0].string(), v[1].integer(), v[2].integer(), v[3].integer(), vector(v[4]), array(v[5]).map { it.integer() }) }
    private fun definition(v: JsonValue): SkillDefinition {
        v.record(13)
        return SkillDefinition(ContentId(v[0].string()), v[1].string(), v[2].string(), ContentId(v[3].string()), ContentId(v[4].string()),
            array(v[5]).map(::rank), SkillEffect.valueOf(v[6].string()), TargetKind.valueOf(v[7].string()), v[8].string(), v[9].integer(), v[10].integer(),
            if (v[11].isNull) null else ContentId(v[11].string()), v[12].integer())
    }
    private fun stats(v: JsonValue): Map<ContentId, Int> {
        val pairs = array(v).map { it.record(2); ContentId(it[0].string()) to it[1].integer() }
        require(pairs.map { it.first }.distinct().size == pairs.size); return pairs.toMap()
    }
    fun decode(text: String): CombatRestore? {
        if (text.isEmpty()) return null
        val c = JsonReader().parse(text).record(5)
        if (c[0].integer() != 1) throw UnsupportedCheckpoint("Unsupported combat checkpoint")
        return CombatRestore(c[1].boolean(), if (c[2].isNull) null else EncounterOutcome.valueOf(c[2].string()), array(c[3]).map { it.id() }, array(c[4]).map { a ->
            a.record(22)
            val locked = if (a[16].isNull) null else a[16].record(5).let { l ->
                val i = l[3].record(5)
                LockedAbility(checkNotNull(selection(l[0])), rank(l[1]), definition(l[2]),
                    DamageInputs(i[0].integer(), i[1].integer(), i[2].integer(), i[3].integer(), i[4].integer()), vector(l[4]))
            }
            CombatActorObservation(EntityId(a[0].id()), vector(a[1]), vector(a[2]), vector(a[3]), vector(a[4]), vector(a[5]),
                a[6].integer(), a[7].integer(), a[8].boolean(), stats(a[9]),
                array(a[10]).map { it.record(4); StatModifier(it[0].string(), ContentId(it[1].string()), it[2].integer(), it[3].integer()) }, stats(a[11]),
                unique(array(a[12]).map { it.record(2); ContentId(it[0].string()) to it[1].string() }), array(a[13]).map { it.string() },
                a[14].boolean(), selection(a[15]), locked, array(a[17]).map { it.integer() }, array(a[18]).map { it.boolean() }, a[19].integer(),
                array(a[20]).map { it.record(4); ActiveStatus(ContentId(it[0].string()), EntityId(it[1].id()), it[2].integer(), it[3].boolean()) },
                unique(array(a[21]).map { it.record(3); it[0].string() to CooldownState(it[1].integer(), it[2].boolean()) }), null)
        })
    }
}
