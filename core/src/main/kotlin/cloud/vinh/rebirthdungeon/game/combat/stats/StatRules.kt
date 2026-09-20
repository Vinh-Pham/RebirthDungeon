package cloud.vinh.rebirthdungeon.game.combat.stats

import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import java.math.BigInteger

/** Percent units are basis points; each source contributes exactly once at its own stat stage. */
data class StatModifier(val source: String, val stat: ContentId, val flat: Int = 0, val percent: Int = 0)
object StatRules {
    fun resolve(definitions: Map<ContentId, StatDefinition>, baseline: Map<ContentId, Int>, modifiers: List<StatModifier>): Map<ContentId, Int> {
        require(modifiers.all { it.stat in definitions })
        require(modifiers.map { it.source to it.stat }.distinct().size == modifiers.size) { "Duplicate stat source" }
        val result = linkedMapOf<ContentId, Int>()
        val visiting = mutableSetOf<ContentId>()
        fun resolve(id: ContentId): Int {
            result[id]?.let { return it }
            check(visiting.add(id)) { "Cyclic stat derivation" }
            val d = definitions.getValue(id)
            var value = Fraction((baseline[id] ?: d.base).toLong())
            d.terms.forEach { value += Fraction(resolve(it.stat).toLong() * it.numerator, it.denominator.toLong()) }
            val mods = modifiers.filter { it.stat == id }
            value += Fraction(mods.sumOf { it.flat.toLong() })
            value *= Fraction((10000L + mods.sumOf { it.percent.toLong() }).coerceAtLeast(0), 10000)
            val calculated = value.floor().coerceIn(BigInteger.valueOf(d.minimum.toLong()), BigInteger.valueOf(d.maximum.toLong())).toInt()
            visiting.remove(id); result[id] = calculated
            return calculated
        }
        definitions.keys.sortedBy { it.value }.forEach { resolve(it) }
        return frozenMap(result)
    }
    fun cost(rank: Int, flat: Int = 0, percent: Int = 0): Int {
        require(rank >= 0)
        if (rank == 0) return 0
        val product = (rank.toLong() + flat) * (10000L + percent).coerceAtLeast(0)
        return ((product + 9999).coerceAtLeast(0) / 10000).coerceIn(1, Int.MAX_VALUE.toLong()).toInt()
    }
}

/** Exact intermediate fractions avoid order-dependent rounding of derived contributions. */
private class Fraction(val n: BigInteger, val d: BigInteger) {
    constructor(n: Long, d: Long = 1) : this(BigInteger.valueOf(n), BigInteger.valueOf(d))
    operator fun plus(o: Fraction) = Fraction(n * o.d + o.n * d, d * o.d)
    operator fun times(o: Fraction) = Fraction(n * o.n, d * o.d)
    fun floor(): BigInteger = n.divideAndRemainder(d).let { if (n.signum() < 0 && it[1].signum() != 0) it[0] - BigInteger.ONE else it[0] }
}

data class DamageInputs(val base: Int, val attack: Int, val defense: Int, val protection: Int)
data class DamageResult(val postDefense: Long, val afterResistance: Long, val shieldAbsorbed: Int, val hpDamage: Int, val remainingHp: Int)
object DamageRules {
    fun resolve(inputs: DamageInputs, shield: Int, hp: Int): DamageResult {
        require(shield >= 0 && hp >= 0)
        val raw = (inputs.base.toLong() + inputs.attack - inputs.defense).coerceAtLeast(0)
        val after = Math.multiplyExact(raw, (100 - inputs.protection.coerceIn(0, 100)).toLong()) / 100
        val absorbed = minOf(after, shield.toLong()).toInt()
        val damage = minOf(after - absorbed, hp.toLong()).toInt()
        return DamageResult(raw, after, absorbed, damage, hp - damage)
    }
}

object StaminaRules {
    val ranks = listOf("F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1")
    fun index(rank: String) = ranks.indexOf(rank).also { require(it >= 0) }
    fun attack(rank: String) = 20 + index(rank)
    fun recovery(rank: String) = 5 * (index(rank) / 3 + 1)
    fun cost(tenths: Int, flat: Int, percent: Int, attack: Boolean): Int {
        if (tenths == 0) return 0
        val quantum = if (attack) 1L else 10L
        val product = Math.multiplyExact(tenths.toLong() + flat, (10000L + percent).coerceAtLeast(0)).coerceAtLeast(0)
        val result = ((product + quantum * 10000 - 1) / (quantum * 10000) * quantum).coerceAtLeast(quantum)
        return Math.toIntExact(result)
    }
    fun format(tenths: Int) = "${tenths / 10}.${kotlin.math.abs(tenths % 10)}"
}
