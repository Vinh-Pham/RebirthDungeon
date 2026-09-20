package cloud.vinh.rebirthdungeon.game.combat

import cloud.vinh.rebirthdungeon.game.CombatFixtures
import cloud.vinh.rebirthdungeon.game.algorithms.RandomSource
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.*
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import org.junit.Assert.*
import org.junit.Test

class CombatRulesTest {
    @Test fun damageMitigatesThenAbsorbsAndCapsActualLoss() {
        assertEquals(DamageResult(21, 21, 0, 21, 39), DamageRules.resolve(DamageInputs(16, 10, 5, 0), 0, 60))
        assertEquals(DamageResult(9, 6, 3, 3, 17), DamageRules.resolve(DamageInputs(11, 0, 2, 33), 3, 20))
        assertEquals(0, DamageRules.resolve(DamageInputs(1, 0, 100, 0), 0, 1).hpDamage)
        assertEquals(0, DamageRules.resolve(DamageInputs(100, 0, 0, 999), 0, 1).hpDamage)
        assertEquals(1, DamageRules.resolve(DamageInputs(100, 0, 0, -99), 0, 1).hpDamage)
    }
    @Test fun allRanksUseExactStaminaAndCostRounding() {
        StaminaRules.ranks.forEachIndexed { i, rank ->
            assertEquals(20 + i, StaminaRules.attack(rank)); assertEquals(5 * (i / 3 + 1), StaminaRules.recovery(rank))
        }
        assertEquals(21, StaminaRules.cost(20, 0, 1, true))
        assertEquals(30, StaminaRules.cost(20, 0, 1, false))
        assertEquals(1, StaminaRules.cost(20, -100, -10000, true))
        assertEquals(10, StaminaRules.cost(20, -100, -10000, false))
        assertEquals(0, StaminaRules.cost(0, 100, 500, false))
        assertEquals("2.1", StaminaRules.format(21))
    }
    @Test fun statSourcesAggregateOnceBeforeDerivationAndCostsRoundUp() {
        val stats = CombatFixtures.content.stats
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
        val base = CombatFixtures.content.statuses.getValue(ContentId("status.strength"))
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
