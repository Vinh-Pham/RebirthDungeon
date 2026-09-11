package cloud.vinh.rebirthdungeon.game.combat

import cloud.vinh.rebirthdungeon.game.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.data.save.codec.CheckpointCodec
import cloud.vinh.rebirthdungeon.application.run.BattleController
import cloud.vinh.rebirthdungeon.application.persistence.CheckpointRepository
import cloud.vinh.rebirthdungeon.game.projection.BattleRestore
import org.junit.Assert.*
import org.junit.Test

class CombatCheckpointTest {
    private fun sim() = BattleSimulation.create(BattleSession(71, CombatFixtures.content), listOf(CombatFixtures.enemy().copy(hp = 999, maxHp = 999)))
    private fun restore(s: BattleSimulation): BattleSimulation {
        val codec = CheckpointCodec()
        val state = codec.decode(codec.encode(s.restoreExport()))
        return BattleSimulation.restore(state, CombatFixtures.content).also { assertEquals(s.canonicalState(), it.canonicalState()) }
    }
    @Test fun everyDiceBoundaryRestoresSameFutureIncludingStatusShieldAndDefeat() {
        val original = sim()
        var resumed = restore(original)
        val commands = listOf(SelectAbilityCommand(ContentId("skill.fortify"), EntityId(1)), RollDiceCommand, KeepDieCommand(0, true),
            RerollDiceCommand(listOf(1, 2, 3, 4)), RerollDiceCommand(listOf(2)), UseAbilityCommand, AutomaticCommand,
            SelectAbilityCommand(ContentId("skill.sword"), EntityId(2)), RollDiceCommand, KeepDieCommand(4, true), EndTurnCommand, AutomaticCommand)
        try {
            for (command in commands) {
                assertTrue(original.apply(command).accepted()); assertTrue(resumed.apply(command).accepted())
                assertEquals(original.events(), resumed.events()); assertEquals(original.canonicalState(), resumed.canonicalState())
                resumed.dispose(); resumed = restore(original)
            }
            var guard = 0
            while (!original.isDefeated()) {
                check(guard++ < 100)
                val command = if (original.needsPlayerInput()) EndTurnCommand else AutomaticCommand
                assertTrue(original.apply(command).accepted()); assertTrue(resumed.apply(command).accepted())
                assertEquals(original.canonicalState(), resumed.canonicalState())
                resumed.dispose(); resumed = restore(original)
            }
            assertFalse(resumed.apply(EndTurnCommand).accepted())
        } finally { original.dispose(); resumed.dispose() }
    }
    @Test fun failedRollSaveBlocksFurtherRngAndRetryDoesNotRepeatRoll() {
        var fail = false
        var saved: BattleRestore? = null
        val repository = object : CheckpointRepository {
            override fun load() = saved
            override fun save(state: BattleRestore) { if (fail) error("Disk full"); saved = state }
        }
        val s = sim(); val c = BattleController(s, repository, 9)
        try {
            assertTrue(c.startOrResume())
            assertTrue(c.submit(SelectAbilityCommand(ContentId("skill.sword"), EntityId(2)), 9).accepted())
            val revision = c.observe().commandCount
            fail = true
            assertTrue(c.submit(RollDiceCommand, 9, revision).accepted())
            val hash = s.canonicalState()
            assertFalse(c.submit(RerollDiceCommand(listOf(0)), 9).accepted())
            assertFalse(c.retrySave()); assertEquals(hash, s.canonicalState())
            fail = false; assertTrue(c.retrySave()); assertEquals(hash, s.canonicalState())
            assertFalse(c.submit(RerollDiceCommand(listOf(0)), 9, revision).accepted())
            val resumed = restore(s); resumed.dispose()
        } finally { c.close() }
    }
    @Test fun invalidReservationsAndLockedDefinitionsAreRejectedBeforeRecovery() {
        val s = sim()
        try {
            s.apply(SelectAbilityCommand(ContentId("skill.sword"), EntityId(2))); s.apply(RollDiceCommand)
            val codec = CheckpointCodec()
            val mapper = com.fasterxml.jackson.databind.ObjectMapper()
            fun corrupt(change: (com.fasterxml.jackson.databind.JsonNode) -> Unit) {
                val root = mapper.readTree(codec.encode(s.restoreExport())) as com.fasterxml.jackson.databind.node.ArrayNode
                val combat = mapper.readTree(root[11].asText())
                change(combat); root.set(11, mapper.nodeFactory.textNode(combat.toString()))
                assertThrows(IllegalArgumentException::class.java) {
                    BattleSimulation.validateRestore(codec.decode(root.toString()), CombatFixtures.content)
                }
            }
            corrupt { (it[4][0][3] as com.fasterxml.jackson.databind.node.ArrayNode).set(2, mapper.nodeFactory.numberNode(0)) }
            corrupt { (it[4][0][16][1] as com.fasterxml.jackson.databind.node.ArrayNode).set(2, mapper.nodeFactory.numberNode(999)) }
            corrupt { (it[4][0][18] as com.fasterxml.jackson.databind.node.ArrayNode).add(true) }
        } finally { s.dispose() }
    }
    @Test fun boostedMaximumAndFrozenBuffInputsSurviveRestoreWithoutRefill() {
        val s = sim()
        try {
            s.apply(SelectAbilityCommand(ContentId("skill.focus"), EntityId(1))); s.apply(RollDiceCommand); s.apply(UseAbilityCommand)
            val restored = restore(s)
            try {
                assertTrue(s.apply(AutomaticCommand).accepted()); assertTrue(restored.apply(AutomaticCommand).accepted())
                assertEquals(s.canonicalState(), restored.canonicalState())
            } finally { restored.dispose() }
        } finally { s.dispose() }
    }

    @Test fun closedControllerRejectsLegacyAndRevisionedRequestsWithoutReadingDisposedWorld() {
        val c = BattleController(sim(), object : CheckpointRepository {
            override fun load(): BattleRestore? = null
            override fun save(state: BattleRestore) {}
        }, 1)
        c.close()
        assertEquals(CommandResult.Reason.STALE_SESSION, c.submit(RollDiceCommand, 1).reason)
        assertEquals(CommandResult.Reason.STALE_SESSION, c.submit(RollDiceCommand, 1, 0).reason)
    }

}
