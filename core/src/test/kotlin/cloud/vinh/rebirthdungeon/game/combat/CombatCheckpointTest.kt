package cloud.vinh.rebirthdungeon.game.combat

import cloud.vinh.rebirthdungeon.game.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.data.save.codec.*
import cloud.vinh.rebirthdungeon.application.run.BattleController
import cloud.vinh.rebirthdungeon.application.persistence.CheckpointRepository
import cloud.vinh.rebirthdungeon.game.projection.BattleRestore
import org.junit.Assert.*
import org.junit.Test

class CombatCheckpointTest {
    private fun sim(seed: Long = 71) = BattleSimulation.create(BattleSession(seed, CombatFixtures.content), listOf(CombatFixtures.enemy(hp = 999)))
    private fun restore(s: BattleSimulation): BattleSimulation = BattleSimulation.restore(CheckpointCodec().decode(CheckpointCodec().encode(s.restoreExport())), CombatFixtures.content)
    @Test fun seededSequencesRestoreEveryBoundaryWithIdenticalStateAndEvents() {
        repeat(20) { seed ->
            val s = sim(seed.toLong()); var restored = restore(s)
            try {
                var n = 0
                while (!s.isFinished()) {
                    check(n++ < 200)
                    val c: RunCommand = if (!s.session.scheduler.started) BeginTurnCommand(s.turnRef())
                        else if (s.turnRef().actor.value != 1L) cloud.vinh.rebirthdungeon.game.combat.abilities.EnemyPolicy.choose(s.session.runId, s.combatObservation(), CombatFixtures.content)
                        else if (n % 3 == 0) DefendCommand(s.turnRef()) else AttackCommand(s.turnRef(), EntityId(2))
                    val result = s.apply(c); val other = restored.apply(c)
                    assertEquals("seed=$seed step=$n", result, other); assertEquals(s.events(), restored.events()); assertEquals(s.canonicalState(), restored.canonicalState())
                    if (!result.accepted()) {
                        val wait = WaitCommand(s.turnRef()); assertTrue(s.apply(wait).accepted()); assertTrue(restored.apply(wait).accepted())
                    }
                    restored.dispose(); restored = restore(s); assertEquals(s.canonicalState(), restored.canonicalState())
                }
                assertTrue(s.restoreExport().historyTruncated)
            } finally { s.dispose(); restored.dispose() }
        }
    }
    @Test fun failureAtEachActionAndAutomaticWritePublishesOnlyDurableStateAndRetriesOnce() {
        for (failAt in 1..5) {
            var writes = 0; var fail = false
            val s = sim(); val repository = object : CheckpointRepository {
                override fun load(): BattleRestore? = null
                override fun save(state: BattleRestore) { if (fail && ++writes == failAt) error("Disk full") }
            }
            val c = BattleController(s, repository, 9)
            try {
                assertTrue(c.startOrResume()); val revision = c.observe().commandCount
                val cmd = AttackCommand(s.turnRef(), EntityId(2)); fail = true
                assertTrue(c.submit(cmd, 9, revision).accepted())
                val pending = s.canonicalState()
                if (c.failure != null) {
                    assertFalse(c.submit(cmd, 9, revision).accepted())
                    if (failAt == 1) assertEquals(revision, c.observe().commandCount)
                    fail = false; assertTrue(c.retrySave())
                }
                assertFalse(c.submit(cmd, 9, revision).accepted())
                val baseline = sim(); val other = BattleController(baseline, object : CheckpointRepository {
                    override fun load(): BattleRestore? = null; override fun save(state: BattleRestore) {}
                }, 9)
                try { other.startOrResume(); other.submit(AttackCommand(baseline.turnRef(), EntityId(2)), 9, other.observe().commandCount); assertEquals(baseline.canonicalState(), s.canonicalState()) } finally { other.close() }
            } finally { c.close() }
        }
    }
    @Test fun malformedTurnUnitsAndHistoryCannotRestore() {
        val s = sim(); val codec = CheckpointCodec(); val mapper = com.fasterxml.jackson.databind.ObjectMapper()
        try {
            s.automatic()
            fun corrupt(change: (com.fasterxml.jackson.databind.node.ArrayNode) -> Unit) {
                val root = mapper.readTree(codec.encode(s.restoreExport())) as com.fasterxml.jackson.databind.node.ArrayNode; change(root)
                assertThrows(IllegalArgumentException::class.java) { BattleSimulation.validateRestore(codec.decode(root.toString()), CombatFixtures.content) }
            }
            corrupt { (it[9] as com.fasterxml.jackson.databind.node.ArrayNode).set(1, mapper.nodeFactory.numberNode(99)) }
            corrupt { (it[9] as com.fasterxml.jackson.databind.node.ArrayNode).set(3, mapper.nodeFactory.numberNode(0)) }
            corrupt { val combat = mapper.readTree(it[11].asText()); (combat[4][0][1] as com.fasterxml.jackson.databind.node.ArrayNode).set(2, mapper.nodeFactory.numberNode(-1)); it.set(11, mapper.nodeFactory.textNode(combat.toString())) }
            val old = mapper.readTree(codec.encode(s.restoreExport())) as com.fasterxml.jackson.databind.node.ArrayNode; old.set(0, mapper.nodeFactory.numberNode(2)); old.remove(13)
            assertThrows(UnsupportedCheckpoint::class.java) { codec.decode(old.toString()) }
        } finally { s.dispose() }
    }
    @Test fun potionAllowanceAndGuardRestoreWithNoExtraRecovery() {
        val s = sim(); try {
            s.automatic(); s.apply(DefendCommand(s.turnRef())); while (!s.needsPlayerInput()) s.automatic()
            s.apply(DrinkPotionCommand(s.turnRef(), ContentId("potion.health")))
            val restored = restore(s); try {
                assertEquals(s.canonicalState(), restored.canonicalState())
                assertEquals(CommandResult.Reason.ITEM_USED, restored.apply(DrinkPotionCommand(restored.turnRef(), ContentId("potion.health"))).reason)
                assertEquals(s.canonicalState(), restored.canonicalState())
            } finally { restored.dispose() }
        } finally { s.dispose() }
    }
    @Test fun failedInitialTurnStartRetriesTheSameRecoveryAndEventBatch() {
        var writes = 0; var fail = true
        val s = sim(); val c = BattleController(s, object : CheckpointRepository {
            override fun load(): BattleRestore? = null
            override fun save(state: BattleRestore) { writes++; if (fail && writes >= 2) error("Turn start write failed") }
        }, 4)
        try {
            assertFalse(c.startOrResume()); assertFalse(c.combatObservation().turn.started)
            val pending = s.canonicalState(); assertFalse(c.retrySave()); assertEquals(pending, s.canonicalState())
            fail = false; assertTrue(c.retrySave()); assertEquals(pending, s.canonicalState())
            assertTrue(c.combatObservation().turn.started)
            assertEquals(1, c.observe().events.count { it.event is cloud.vinh.rebirthdungeon.game.events.TurnStarted })
        } finally { c.close() }
    }
    @Test fun openingEnemyCanBeDeferredUntilOrderHasBeenPresented() {
        val s = sim()
        s.automatic(); s.apply(AttackCommand(s.turnRef(), EntityId(2)))
        val c = BattleController(s, object : CheckpointRepository {
            override fun load(): BattleRestore? = null; override fun save(state: BattleRestore) {}
        }, 7)
        try {
            assertTrue(c.startOrResume(deferEnemy = true)); assertEquals(EntityId(2), c.combatObservation().turn.active)
            assertFalse(c.battleView().ready); assertEquals(90, c.battleView().hero.current.hp)
            assertTrue(c.advanceAutomatic()); assertEquals(EntityId(1), c.combatObservation().turn.active)
            assertTrue(c.battleView().hero.current.hp < 90)
        } finally { c.close() }
    }

}
