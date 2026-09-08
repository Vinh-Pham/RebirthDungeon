package cloud.vinh.rebirthdungeon.application.run

import cloud.vinh.rebirthdungeon.application.persistence.CheckpointRepository
import cloud.vinh.rebirthdungeon.data.save.*
import cloud.vinh.rebirthdungeon.data.save.codec.*
import cloud.vinh.rebirthdungeon.game.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.grid.*
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.projection.RunRestore
import cloud.vinh.rebirthdungeon.game.replay.RunCanonical
import org.junit.Assert.*
import org.junit.Test

class RunReplayTest {
    private class MemoryStorage : CheckpointStorage {
        val slots = HashMap<String, String>()
        var tear = false
        override fun read(slot: String) = slots[slot]
        override fun write(slot: String, text: String) { slots[slot] = if (tear) text.take(text.length / 2) else text }
    }
    private fun repository(storage: MemoryStorage) = AlternatingCheckpointRepository(storage) { DungeonSimulation.validateRestore(it, Phase3Fixtures.content) }
    private fun simulation() = Phase3Fixtures.simulation(Phase3Fixtures.floor("##########", "#.......>#", "#..+.....#", "#........#", "##########"),
        enemies = listOf(Phase3Fixtures.enemy(7, 1)))

    @Test fun uninterruptedAndReloadedContinuationsMatchStateEventsAndRng() {
        val a = simulation(); val codec = CheckpointCodec()
        a.apply(WaitCommand) // checkpoint with enemy due, not only at a player boundary
        assertEquals(EntityId(2), a.restoreExport().scheduler.active)
        val encoded = codec.encode(a.restoreExport())
        val b = DungeonSimulation.restore(codec.decode(encoded), Phase3Fixtures.content)
        val ca = RunController(a, repository(MemoryStorage()), 1)
        val cb = RunController(b, repository(MemoryStorage()), 2)
        try {
            assertTrue(ca.startOrResume()); assertTrue(cb.startOrResume())
            val commands = listOf(MoveCommand(0, 1), MoveCommand(1, 0), WaitCommand, MoveCommand(0, 1), MoveCommand(1, 0), MoveCommand(1, 0), WaitCommand)
            commands.forEach { command ->
                assertEquals(ca.submit(command, 1), cb.submit(command, 2))
                assertEquals(RunCanonical.state(a.restoreExport()), RunCanonical.state(b.restoreExport()))
                assertEquals(ca.observe().events, cb.observe().events)
                val va = ca.observe(); val vb = cb.observe()
                assertEquals(va.actors, vb.actors)
                for (y in 0 until va.height) for (x in 0 until va.width) {
                    assertEquals(va.tileAt(x, y), vb.tileAt(x, y)); assertEquals(va.visibleAt(x, y), vb.visibleAt(x, y))
                }
            }
        } finally { ca.close(); cb.close() }
    }

    @Test fun tornWriteLeavesPreviousSlotUsableAndFutureSchemaIsNeverOverwritten() {
        val storage = MemoryStorage(); val repository = repository(storage); val sim = simulation()
        try {
            repository.save(sim.restoreExport()); val before = RunCanonical.state(repository.load()!!)
            sim.apply(WaitCommand); storage.tear = true
            assertThrows(RuntimeException::class.java) { repository.save(sim.restoreExport()) }
            assertEquals(before, RunCanonical.state(repository.load()!!))
            storage.tear = false; repository.save(sim.restoreExport())
            assertEquals(RunCanonical.state(sim.restoreExport()), RunCanonical.state(repository.load()!!))
            storage.slots["run-b.json"] = storage.slots.getValue("run-b.json").replace("\"schemaVersion\":1", "\"schemaVersion\":999")
            storage.slots["run-b.json"] = storage.slots.getValue("run-b.json").dropLast(1) + ",\"futureField\":true}"
            val files = storage.slots.toMap()
            assertThrows(UnsupportedCheckpoint::class.java) { repository.load() }
            assertThrows(UnsupportedCheckpoint::class.java) { repository.save(sim.restoreExport()) }
            assertEquals(files, storage.slots)
        } finally { sim.dispose() }
    }

    @Test fun failedCheckpointBlocksInputAndRetryDoesNotRepeatAction() {
        val sim = simulation()
        var fail = true
        val repository = object : CheckpointRepository {
            override fun load(): RunRestore? = null
            override fun save(state: RunRestore) { if (fail) error("disk unavailable") }
        }
        val c = RunController(sim, repository, 77)
        try {
            assertTrue(c.submit(WaitCommand, 77).accepted())
            assertNotNull(c.failure)
            assertEquals(1, sim.acceptedCommandCount())
            assertEquals(CommandResult.Reason.SAVE_REQUIRED, c.submit(WaitCommand, 77).reason)
            assertEquals(CommandResult.Reason.STALE_SESSION, c.submit(WaitCommand, 76).reason)
            fail = false; assertTrue(c.retrySave()); assertEquals(1, sim.acceptedCommandCount())
            assertTrue(sim.needsPlayerInput()); assertNull(c.failure)
        } finally { c.close() }
        assertEquals(CommandResult.Reason.STALE_SESSION, c.submit(WaitCommand, 77).reason)
    }

    @Test fun automaticGuardStopsAtAnActionBoundary() {
        val sim = Phase3Fixtures.simulation(Phase3Fixtures.floor("########", "#......#", "########"),
            enemies = listOf(Phase3Fixtures.enemy(4, 1), Phase3Fixtures.enemy(6, 1, 3)))
        val c = RunController(sim, repository(MemoryStorage()), 1, automaticLimit = 1)
        try {
            c.submit(WaitCommand, 1)
            assertTrue(c.failure!!.contains("guard"))
            assertEquals(2L, sim.restoreExport().turnCount)
            assertEquals(1L, sim.restoreExport().commandCount)
            assertFalse(c.retrySave()) // invariant guards halt; retry cannot bypass the guard
        } finally { c.close() }
    }

    @Test fun playerCanReachGeneratedExitThroughSharedCommandsWithAiPresent() {
        val profile = Phase3Fixtures.content.generations.values.single()
        val generated = FloorGeneration(cloud.vinh.rebirthdungeon.game.squidsquad.SquidDungeonGenerator()).generate(0x5DEECE66DL, 0, profile) as FloorGenerationResult.Success
        val f = generated.floor
        val sim = Phase3Fixtures.simulation(f.floor, f.spawnX, f.spawnY, listOf(Phase3Fixtures.enemy(generated.enemy!!.x, generated.enemy.y)))
        val c = RunController(sim, repository(MemoryStorage()), 1)
        try {
            val path = FloorGeneration.reachablePath(f.floor, Cell(f.spawnX, f.spawnY), Cell(f.exitX, f.exitY))
            path.drop(1).forEach { to ->
                val from = c.observe().playerCell
                val command = MoveCommand(to.x - from.x, to.y - from.y)
                assertTrue("move to $to rejected", c.submit(command, 1).accepted())
                if (c.observe().playerCell == from) assertTrue(c.submit(command, 1).accepted())
            }
            assertTrue(c.observe().reachedExit)
        } finally { c.close() }
    }

    @Test fun recordedDesktopCheckpointRemainsReadableAndContinuesDeterministically() {
        val text = checkNotNull(javaClass.getResourceAsStream("/saves/movement-v1.json")).bufferedReader().use { it.readText() }
        val codec = CheckpointCodec(); val (revision, payload) = codec.open(text)
        assertEquals(13L, revision)
        val state = codec.decode(payload)
        assertEquals(4L, state.commandCount); assertEquals(8L, state.turnCount); assertEquals(400L, state.scheduler.tick)
        val a = DungeonSimulation.restore(state, Phase3Fixtures.content)
        val b = DungeonSimulation.restore(codec.decode(codec.encode(state)), Phase3Fixtures.content)
        val ca = RunController(a, repository(MemoryStorage()), 1); val cb = RunController(b, repository(MemoryStorage()), 2)
        try {
            repeat(3) {
                ca.submit(WaitCommand, 1); cb.submit(WaitCommand, 2)
                assertEquals(RunCanonical.state(a.restoreExport()), RunCanonical.state(b.restoreExport()))
                assertEquals(ca.observe().events, cb.observe().events)
            }
        } finally { ca.close(); cb.close() }
    }

    @Test fun rememberedTerrainPersistsButAnUnseenEnemyAndItsEventsDoNotEscape() {
        val floor = Phase3Fixtures.floor("#######################", "#....................>#", "#######################")
        val sim = Phase3Fixtures.simulation(floor, 10, 1, listOf(Phase3Fixtures.enemy(13, 1).copy(vision = 1)))
        val c = RunController(sim, repository(MemoryStorage()), 1)
        try {
            assertEquals(2, c.observe().actors.size)
            repeat(9) { assertTrue(c.submit(MoveCommand(-1, 0), 1).accepted()) }
            val view = c.observe()
            assertFalse(view.visibleAt(13, 1))
            assertEquals(FloorMap.FLOOR, view.tileAt(13, 1))
            assertEquals(1, view.actors.size)
            assertFalse(view.events.any { it.event == ActorWaited(EntityId(2)) })
            assertEquals(2, sim.restoreExport().actors.size)
        } finally { c.close() }
    }

    @Test fun malformedJsonTypesAndMissingFieldsAreRejectedBeforeBinding() {
        val sim = simulation(); val codec = CheckpointCodec()
        try {
            val json = codec.encode(sim.restoreExport())
            val missing = json.replace("\"reachedExit\":false,", "")
            val coerced = json.replace("\"reachedExit\":false", "\"reachedExit\":\"false\"")
            assertNotEquals(json, missing); assertNotEquals(json, coerced)
            listOf(missing, coerced).forEach { value -> assertThrows(IllegalArgumentException::class.java) { codec.decode(value) } }
        } finally { sim.dispose() }
    }

    @Test fun foreignThreadCannotMutateTheRenderThreadWorld() {
        val sim = simulation(); val c = RunController(sim, repository(MemoryStorage()), 1)
        val errors = java.util.concurrent.atomic.AtomicReference<Throwable>()
        val thread = Thread { try { c.submit(WaitCommand, 1) } catch (error: Throwable) { errors.set(error) } }
        try {
            thread.start(); thread.join(3000)
            assertTrue(errors.get() is IllegalStateException)
            assertEquals(0, sim.acceptedCommandCount())
        } finally { c.close() }
    }

    @Test fun restoreRejectsOverlapsBadRngAndMissingSchedulerActors() {
        val codec = CheckpointCodec(); val sim = simulation()
        try {
            val json = codec.encode(sim.restoreExport())
            val broken = json.replace("\"nextEntityId\":\"3\"", "\"nextEntityId\":\"1\"")
            assertNotEquals(json, broken)
            assertThrows(IllegalArgumentException::class.java) { DungeonSimulation.restore(codec.decode(broken), Phase3Fixtures.content) }
            val rng = json.replace("juniper.ace", "unknown.rng")
            assertThrows(IllegalArgumentException::class.java) { DungeonSimulation.restore(codec.decode(rng), Phase3Fixtures.content) }
        } finally { sim.dispose() }
    }
}
