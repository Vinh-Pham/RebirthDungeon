package cloud.vinh.rebirthdungeon.game.combat

import cloud.vinh.rebirthdungeon.game.*
import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.data.content.JacksonContentRepository
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class CombatSimulationTest {
    private val hero = EntityId(1); private val enemy = EntityId(2)
    private fun sim(content: ContentCatalog = CombatFixtures.content, hp: Int = 999) = BattleSimulation.create(BattleSession(71, content), listOf(CombatFixtures.enemy(hp = hp)))
    private fun actor(s: BattleSimulation, id: EntityId = hero) = s.combatObservation().actors.single { it.id == id }
    private fun advance(s: BattleSimulation) { var n = 0; while (!s.needsPlayerInput()) { check(n++ < 20); assertTrue(s.automatic().accepted()) } }
    private fun use(s: BattleSimulation, skill: String, target: EntityId = enemy) = assertTrue(s.apply(UseSkillCommand(s.turnRef(), ContentId("skill.$skill"), target)).accepted())
    private fun reject(s: BattleSimulation, c: RunCommand, reason: CommandResult.Reason) {
        val before = s.canonicalState(); assertEquals(reason, s.apply(c).reason); assertEquals(before, s.canonicalState()); assertTrue(s.events().isEmpty())
    }
    private fun altered(change: (ObjectNode) -> Unit): ContentCatalog {
        val tree = ObjectMapper().readTree(File("../assets/data/starter.json")) as ObjectNode; change(tree)
        return JacksonContentRepository { if (it == "starter.json") tree.toString() else File("../assets/data/$it").readText() }.load().catalog
    }
    @Test fun startIsExplicitAndCannotRepeatRecovery() {
        val s = sim(); try {
            val rng = s.session.random.capture()
            reject(s, AttackCommand(s.turnRef(), enemy), CommandResult.Reason.INVALID_PHASE)
            advance(s); val snapshot = actor(s)
            reject(s, BeginTurnCommand(s.turnRef()), CommandResult.Reason.INVALID_PHASE)
            reject(s, WaitCommand(s.turnRef()), CommandResult.Reason.ACTION_AVAILABLE)
            assertEquals(rng, s.session.random.capture()); assertEquals(400, snapshot.current.spTenths)
            assertThrows(UnsupportedOperationException::class.java) { (snapshot.stats as MutableMap).clear() }
        } finally { s.dispose() }
    }
    @Test fun previewMatchesResolutionAndStaleCommandsNeverPayAgain() {
        val s = sim(); try {
            advance(s); val old = s.turnRef(); val h = actor(s)
            val ability = BattleRules.resolve(h, actor(s, enemy), CombatFixtures.content.skills.getValue(ContentId("skill.sword")))
            val preview = DamageRules.resolve(ability.inputs, 0, 999)
            use(s, "sword")
            assertEquals(preview.hpDamage, (s.events().single { it.event is DamageDealt }.event as DamageDealt).hpDamage)
            assertEquals(350, actor(s).current.spTenths)
            assertEquals(1, s.events().count { it.event is ActivationEnded })
            reject(s, AttackCommand(old, enemy), CommandResult.Reason.STALE_SESSION)
            advance(s); assertEquals(355, actor(s).current.spTenths)
            assertEquals(400, h.current.spTenths)
        } finally { s.dispose() }
    }
    @Test fun itemDoesNotEndTurnOrTickEffectsAndSecondItemIsRejected() {
        val s = sim(); try {
            advance(s); use(s, "blood"); advance(s)
            val turn = s.turnRef(); val count = s.observe().turnCount
            assertTrue(s.apply(DrinkPotionCommand(turn, ContentId("potion.health"))).accepted())
            assertEquals(count, s.observe().turnCount); assertEquals(turn, s.turnRef())
            reject(s, DrinkPotionCommand(turn, ContentId("potion.health")), CommandResult.Reason.ITEM_USED)
            assertTrue(s.apply(AttackCommand(turn, enemy)).accepted())
        } finally { s.dispose() }
    }
    @Test fun noOpItemAndIllegalTargetsLeaveEverythingUnchanged() {
        val s = sim(); try {
            advance(s)
            reject(s, DrinkPotionCommand(s.turnRef(), ContentId("potion.health")), CommandResult.Reason.ITEM_UNAVAILABLE)
            reject(s, UseSkillCommand(s.turnRef(), ContentId("skill.spark"), hero), CommandResult.Reason.INVALID_TARGET)
            reject(s, UseSkillCommand(s.turnRef(), ContentId("skill.missing"), enemy), CommandResult.Reason.INVALID_SKILL)
            reject(s, UseSkillCommand(s.turnRef(), ContentId("skill.focus"), enemy), CommandResult.Reason.INVALID_TARGET)
        } finally { s.dispose() }
    }
    @Test fun defendExpiresAtNextStartWhileFortifyUsesOwnerEnd() {
        val s = sim(); try {
            advance(s); assertTrue(s.apply(DefendCommand(s.turnRef())).accepted()); assertTrue(actor(s).defending)
            assertEquals(7, actor(s).stats[ContentId("stat.defense")]); advance(s); assertFalse(actor(s).defending)
            use(s, "fortify", hero); assertEquals(14, actor(s).shield); assertEquals(1, actor(s).cooldowns["skill.fortify"]!!.remaining)
            advance(s)
            reject(s, UseSkillCommand(s.turnRef(), ContentId("skill.fortify"), hero), CommandResult.Reason.COOLDOWN)
            use(s, "blood"); assertEquals(0, actor(s).shield); assertTrue(actor(s).cooldowns.isEmpty())
        } finally { s.dispose() }
    }
    @Test fun buffSkipsCastingTurnAndChangingMaximumNeverRefills() {
        val s = sim(); try {
            advance(s); use(s, "focus", hero)
            assertEquals(3, actor(s).statuses.single().remaining); assertEquals(93, actor(s).maximum.hp); assertEquals(90, actor(s).current.hp)
            assertFalse(actor(s).statuses.single().skipBoundary)
        } finally { s.dispose() }
    }
    @Test fun hpPaymentsAreNonlethalAndShieldDoesNotPayThem() {
        val c = altered { (it["actors"][0]["resources"] as ObjectNode).put("hp", 4) }
        val s = sim(c); try { advance(s); reject(s, UseSkillCommand(s.turnRef(), ContentId("skill.blood"), enemy), CommandResult.Reason.INSUFFICIENT_HP) } finally { s.dispose() }
    }
    @Test fun emptyResourcesAllowWaitButNotOptionalPass() {
        val c = altered { val r = it["actors"][0]["resources"] as ObjectNode; r.put("spTenths", 0); r.put("mp", 0) }
        val s = sim(c); try {
            advance(s); assertEquals(5, actor(s).current.spTenths)
            assertTrue(s.apply(WaitCommand(s.turnRef())).accepted()); advance(s)
            assertEquals(10, actor(s).current.spTenths)
            reject(s, WaitCommand(s.turnRef()), CommandResult.Reason.ACTION_AVAILABLE)
        } finally { s.dispose() }
    }
    @Test fun terminalDamageStopsPeriodicWorkAndFinalizesOnce() {
        val c = altered { val d = it["statuses"][0] as ObjectNode; d.put("periodicDamage", 10000); (d["recovery"] as ObjectNode).put("hp", 10000) }
        val s = sim(c, 1); try {
            advance(s); use(s, "focus", hero); advance(s); use(s, "sword")
            assertEquals(EncounterOutcome.VICTORY, s.combatObservation().outcome)
            assertTrue(actor(s).current.hp > 0)
            assertEquals(1, s.events().count { it.event is EncounterEnded }); assertEquals(1, s.events().count { it.event is ActivationEnded })
            reject(s, AttackCommand(s.turnRef(), enemy), CommandResult.Reason.TERMINAL)
        } finally { s.dispose() }
    }
    @Test fun periodicDeathCannotRegenerateOrStartAnotherTurn() {
        val c = altered { val d = it["statuses"][0] as ObjectNode; d.put("periodicDamage", 10000); (d["recovery"] as ObjectNode).put("hp", 10000) }
        val s = sim(c); try {
            advance(s); use(s, "focus", hero); advance(s); use(s, "sword")
            assertEquals(EncounterOutcome.DEFEAT, s.combatObservation().outcome); assertEquals(0, actor(s).current.hp)
            assertFalse(s.events().any { it.event is ResourcesRecovered })
        } finally { s.dispose() }
    }
    @Test fun fasterEnemyActsBeforePlayerAndNoFrameClockIsNeeded() {
        val c = altered { (it["actors"][1] as ObjectNode).put("speed", 12) }
        val s = sim(c); try { assertEquals(enemy, s.turnRef().actor); advance(s); assertTrue(actor(s).current.hp < 90); assertEquals(hero, s.turnRef().actor) } finally { s.dispose() }
    }
    @Test fun multiEnemyContentIsStillOutsideSlice() {
        assertThrows(IllegalArgumentException::class.java) { BattleSimulation.create(BattleSession(1, CombatFixtures.content), listOf(CombatFixtures.enemy(), CombatFixtures.enemy(3))) }
    }
    @Test fun enemyCanOnlyConsumeAuthoredFiniteItemsAndPersistsAllowanceBeforeAction() {
        val c = altered { (it["actors"][1]["items"] as ObjectNode).put("potion.health", 1) }
        val s = sim(c, 60)
        try {
            advance(s); use(s, "spark"); advance(s); use(s, "spark")
            assertTrue(s.automatic().accepted()) // enemy turn start
            assertTrue(s.automatic().accepted()) // its finite potion
            assertEquals(0, actor(s, enemy).items.getValue(ContentId("potion.health")))
            assertTrue(s.combatObservation().turn.itemUsed)
            val codec = cloud.vinh.rebirthdungeon.data.save.codec.CheckpointCodec()
            val restored = BattleSimulation.restore(codec.decode(codec.encode(s.restoreExport())), c)
            try {
                assertEquals(s.canonicalState(), restored.canonicalState())
                assertTrue(s.automatic().accepted()); assertTrue(restored.automatic().accepted())
                assertEquals(s.canonicalState(), restored.canonicalState())
                assertFalse(s.events().any { it.event is ItemUsed })
            } finally { restored.dispose() }
        } finally { s.dispose() }
    }

}
