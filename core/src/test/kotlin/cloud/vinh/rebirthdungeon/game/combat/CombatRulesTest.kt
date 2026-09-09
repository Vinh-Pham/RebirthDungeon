package cloud.vinh.rebirthdungeon.game.combat

import cloud.vinh.rebirthdungeon.game.Phase3Fixtures
import cloud.vinh.rebirthdungeon.game.algorithms.RandomSource
import cloud.vinh.rebirthdungeon.game.combat.dice.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.*
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import org.junit.Assert.*
import org.junit.Test

class CombatRulesTest {
    @Test fun all7776OrderedHandsHaveExactlyOneClassificationAndPinnedDamageDistribution() {
        val content = Phase3Fixtures.content
        val counts = Combination.entries.associateWith { 0 }.toMutableMap()
        val distribution = sortedMapOf<Int, Int>()
        val weightedDistribution = sortedMapOf<Int, Long>()
        var total = 0L
        var weightedTotal = 0L
        var weightedMass = 0L
        val weights = listOf(1, 1, 1, 1, 2, 2)
        repeat(7776) { ordinal ->
            var n = ordinal
            val faces = List(5) { val face = n % 6 + 1; n /= 6; face }
            val score = DiceRules.score(faces)
            assertTrue(score.pips in 5..30)
            assertEquals(score, DiceRules.score(faces.reversed()))
            counts[score.combination] = counts.getValue(score.combination) + 1
            val multiplier = content.scoring.values.single().multipliers.getValue(score.combination)
            val damage = DamageRules.resolve(DamageInputs(2, 10, 1, 5, 0), score.pips, multiplier, 0, 9999).hpDamage
            distribution[damage] = (distribution[damage] ?: 0) + 1
            total += damage
            val mass = faces.fold(1L) { a, face -> a * weights[face - 1] }
            weightedMass += mass; weightedTotal += damage * mass
            weightedDistribution[damage] = (weightedDistribution[damage] ?: 0L) + mass
        }
        assertEquals(mapOf(Combination.FIVE_OF_A_KIND to 6, Combination.FOUR_OF_A_KIND to 150,
            Combination.FULL_HOUSE to 300, Combination.STRAIGHT to 240, Combination.THREE_OF_A_KIND to 1200,
            Combination.TWO_PAIRS to 1800, Combination.ONE_PAIR to 3600, Combination.NONE to 480), counts)
        assertEquals(32768L, weightedMass)
        assertTrue(weightedTotal.toDouble() / weightedMass > total.toDouble() / 7776)
        // Full histogram is pinned separately from means, including rare extreme hands.
        val actual = distribution.entries.joinToString(",") { "${it.key}:${it.value}" }
        val expected = javaClass.getResourceAsStream("/replay/damage-distribution.txt")?.bufferedReader()?.use { it.readText().trim() }
        assertEquals(expected, actual)
        val weightedExpected = javaClass.getResourceAsStream("/replay/weighted-damage-distribution.txt")!!.bufferedReader().use { it.readText().trim() }
        assertEquals(weightedExpected, weightedDistribution.entries.joinToString(",") { "${it.key}:${it.value}" })
    }
    @Test fun weightedTicketsIncludeZeroWeightsAndExactBoundaries() {
        val weights = listOf(0, 2, 1, 0, 3, 2)
        val results = (0 until 8).map { ticket -> DiceRules.sample(weights, object : RandomSource {
            override fun nextLong(): Long = error("Use the bounded draw")
            override fun nextInt(bound: Int): Int { assertEquals(8, bound); return ticket }
        }) }
        assertEquals(listOf(2, 2, 3, 5, 5, 5, 6, 6), results)
    }
    @Test fun damageRoundsAtBothBoundariesAndAbsorbsShieldLast() {
        assertEquals(115, DamageRules.resolve(DamageInputs(10, 0, 2, 4, 0), 20, StatRatio(5, 2), 0, 1000).hpDamage)
        val result = DamageRules.resolve(DamageInputs(0, 0, 1, 2, 33), 11, StatRatio(3, 2), 3, 20)
        assertEquals(DamageResult(13, 8, 3, 5, 15), result)
        assertEquals(0, DamageRules.resolve(DamageInputs(1, 0, 0, 100, 0), 5, StatRatio(10, 1), 0, 1).hpDamage)
        assertEquals(0, DamageRules.resolve(DamageInputs(100, 0, 0, 0, 999), 5, StatRatio(10, 1), 0, 1).hpDamage)
        assertEquals(0, DamageRules.resolve(DamageInputs(100, 0, 0, 0, -99), 5, StatRatio(10, 1), 0, 1).remainingHp)
    }
    @Test fun statSourcesAggregateOnceBeforeDerivationAndCostsRoundUp() {
        val stats = Phase3Fixtures.content.stats
        val str = ContentId("stat.str")
        val modifiers = listOf(StatModifier("gear", str, 10, 2000), StatModifier("buff", str, 5, -1000),
            StatModifier("weapon", ContentId("stat.physical_attack"), 2))
        val effective = StatRules.resolve(stats, mapOf(str to 30), modifiers)
        assertEquals(49, effective[str]); assertEquals(51, effective[ContentId("stat.physical_attack")])
        assertEquals(effective, StatRules.resolve(stats, mapOf(str to 30), modifiers.reversed()))
        assertEquals(1, StatRules.cost(5, -100, -10000))
        assertEquals(6, StatRules.cost(5, 0, 1)); assertEquals(0, StatRules.cost(0, 100, 10000))
        assertThrows(IllegalArgumentException::class.java) { StatRules.resolve(stats, emptyMap(), modifiers + modifiers.first()) }
    }
    @Test fun statusesRefreshAcrossSourcesButLowerPriorityCannotRefreshOrReplace() {
        val base = Phase3Fixtures.content.statuses.getValue(ContentId("status.strength"))
        val weaker = base.copy(id = ContentId("status.weak"), priority = 0)
        val stronger = base.copy(id = ContentId("status.strong"), priority = 2, flat = 10)
        val equal = base.copy(id = ContentId("status.equal"))
        val definitions = listOf(base, weaker, stronger, equal).associateBy { it.id }
        val active = listOf(ActiveStatus(base.id, EntityId(1), 1, false))
        assertNull(StatusRules.apply(active, definitions, weaker.id, EntityId(2), false))
        val refreshed = StatusRules.apply(active, definitions, base.id, EntityId(2), true)!!.single()
        assertEquals(3, refreshed.remaining); assertEquals(EntityId(2), refreshed.source); assertTrue(refreshed.skipBoundary)
        assertEquals(equal.id, StatusRules.apply(active, definitions, equal.id, EntityId(2), false)!!.single().definition)
        assertEquals(stronger.id, StatusRules.apply(active, definitions, stronger.id, EntityId(2), false)!!.single().definition)
    }

}
