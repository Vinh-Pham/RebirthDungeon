package cloud.vinh.rebirthdungeon.application.session
import cloud.vinh.rebirthdungeon.data.content.JacksonContentRepository
import cloud.vinh.rebirthdungeon.data.save.*
import cloud.vinh.rebirthdungeon.data.save.codec.SessionCodec
import cloud.vinh.rebirthdungeon.game.exploration.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.identity.*
import org.junit.Assert.*
import org.junit.Test
import java.io.File
class SessionIntegrationTest {
    private val bundle = JacksonContentRepository { File("../assets/data/$it").readText() }.load()
    private class Storage : CheckpointStorage {
        val slots = HashMap<String, String>(); var fail = false; var reject: (String) -> Boolean = { false }
        override fun read(slot: String) = slots[slot]
        override fun write(slot: String, text: String) { if (fail || reject(text)) error("disk full"); slots[slot] = text }
    }
    private fun repo(storage: Storage) = AlternatingSessionRepository(storage) { SessionCoordinator.validate(it, bundle.catalog, bundle.world) }
    private fun create(storage: Storage): SessionCoordinator {
        val repository = repo(storage); val saved = repository.load()
        return SessionCoordinator(bundle.catalog, bundle.world, repository, saved?.seed ?: 71, saved).also { it.start() }
    }
    private fun interact(s: SessionCoordinator, id: String) {
        s.dismiss(); assertTrue(s.command(InteractWith(id)))
        repeat(1200) { if (s.exploration.reachedInteraction == null) s.step() }
        assertEquals(id, s.exploration.reachedInteraction?.id)
    }
    private fun enter(s: SessionCoordinator) { interact(s, "gate"); assertTrue(s.enterDungeon(s.operation)) }
    private fun encounter(s: SessionCoordinator, room: Int) {
        s.dismiss()
        val area = s.exploration.area
        val portal = area.mesh.portals.first { p -> area.mesh.polygons.single { it.id == p.a }.room == room - 1 && area.mesh.polygons.single { it.id == p.b }.room == room }
        val midpoint = WorldPoint((portal.left.x + portal.right.x) / 2, (portal.left.y + portal.right.y) / 2)
        assertTrue(s.command(MoveTo(midpoint)))
        repeat(600) { s.step() }
        val enemy = area.objects.single { it.room == room && it.service == Service.ENEMY }
        assertTrue(s.command(MoveTo(enemy.position)))
        repeat(600) { if (s.battle == null) s.step() }
        assertEquals(SessionMode.BATTLE, s.mode)
    }
    private fun send(s: SessionCoordinator, command: RunCommand) { val b = s.battle!!; assertTrue(s.battleCommand(command, b.token, b.observe().commandCount)); s.finishBattleIfReady() }
    private fun win(s: SessionCoordinator) {
        var guard = 0
        while (s.battle != null) {
            check(guard++ < 20)
            send(s, SelectAbilityCommand(ContentId("skill.sword"), s.battle!!.observe().actors.single { !it.player }.id)); send(s, RollDiceCommand); send(s, UseAbilityCommand)
        }
    }
    @Test fun purchaseFailureRetryAndReloadNeverDuplicateGoldOrPotion() {
        val storage = Storage(); val s = create(storage)
        interact(s, "vendor")
        val id = ContentId("potion.health"); val operation = s.operation
        storage.fail = true; assertFalse(s.buy(id, operation)); assertEquals(1, s.count(id)); assertEquals(15, s.gold)
        assertFalse(s.buy(id, operation)); assertTrue(s.blocked)
        storage.fail = false; assertTrue(s.retrySave()); assertFalse(s.buy(id, operation))
        val resumed = create(storage); assertEquals(1, resumed.count(id)); assertEquals(15, resumed.gold)
        resumed.close(); s.close()
    }
    @Test fun completeDungeonLoopAndResumeLockedHandPreservesExactlyOneReward() {
        val storage = Storage(); var s = create(storage)
        enter(s); encounter(s, 1)
        send(s, SelectAbilityCommand(ContentId("skill.sword"), s.battle!!.observe().actors.single { !it.player }.id)); send(s, RollDiceCommand)
        val hand = s.heroObservation().faces; val rng = s.export().random
        s.close(); s = create(storage)
        assertEquals(hand, s.heroObservation().faces); assertEquals(rng, s.export().random)
        send(s, UseAbilityCommand)
        if (s.battle != null) win(s)
        assertEquals(10, s.pendingReward()); assertEquals(20, s.gold)
        val point = s.exploration.position
        s.close(); s = create(storage); assertEquals(point, s.exploration.position); assertEquals(10, s.pendingReward())
        for (room in 2 until bundle.world.rooms) { encounter(s, room); win(s) }
        interact(s, "exit"); val op = s.operation; assertTrue(s.exitDungeon(op)); assertFalse(s.exitDungeon(op))
        assertEquals(50, s.gold); assertTrue(s.exploration.area.town)
        s.close(); val restored = create(storage); assertEquals(50, restored.gold); assertEquals(0, restored.pendingReward()); restored.close()
    }
    @Test fun potionIsAtomicFullActionAndForbiddenAfterRoll() {
        val storage = Storage(); val s = create(storage); val id = ContentId("potion.health")
        interact(s, "vendor"); assertTrue(s.buy(id, s.operation)); s.dismiss(); enter(s); encounter(s, 1)
        send(s, SelectAbilityCommand(ContentId("skill.sword"), s.battle!!.observe().actors.single { !it.player }.id)); send(s, RollDiceCommand)
        val b = s.battle!!; val faces = s.heroObservation().faces
        assertFalse(s.battleCommand(DrinkPotionCommand(id), b.token, b.observe().commandCount)); assertEquals(1, s.count(id)); assertEquals(faces, s.heroObservation().faces)
        send(s, EndTurnCommand)
        val turns = s.battle!!.observe().turnCount
        send(s, DrinkPotionCommand(id)); assertEquals(0, s.count(id)); assertTrue(s.battle!!.observe().turnCount > turns)
        val resumed = create(storage); assertEquals(0, resumed.count(id)); resumed.close(); s.close()
    }
    @Test fun defeatLosesPendingRewardsAndFreeRecoveryIsAvailable() {
        val storage = Storage(); val s = create(storage); enter(s); encounter(s, 1); win(s); encounter(s, 2)
        var guard = 0
        while (s.battle != null) { check(guard++ < 50); send(s, EndTurnCommand) }
        assertTrue(s.exploration.area.town); assertEquals(0, s.pendingReward()); assertEquals(20, s.gold); assertEquals(0, s.heroObservation().current.hp)
        interact(s, "healer"); assertTrue(s.recover(s.operation)); assertEquals(s.heroObservation().maximum, s.heroObservation().current)
        assertTrue(s.heroObservation().statuses.isEmpty()); s.close()
    }
    @Test fun battleEntryFailureBlocksInputAndRetryPreservesEncounter() {
        val storage = Storage(); val s = create(storage); enter(s)
        storage.reject = { text -> SessionCodec().decode(cloud.vinh.rebirthdungeon.data.save.codec.CheckpointCodec().open(text).second).battle != null }
        encounter(s, 1)
        assertTrue(s.blocked)
        val position = s.exploration.position; val encounter = s.export().encounter
        val b = s.battle!!
        assertFalse(s.battleCommand(EndTurnCommand, b.token, b.observe().commandCount))
        storage.reject = { false }; assertTrue(s.retrySave())
        val restored = create(storage)
        assertEquals(encounter, restored.export().encounter); assertEquals(position, restored.exploration.position)
        assertEquals(s.export().battle!!.random, restored.export().battle!!.random)
        restored.close(); s.close()
    }
    @Test fun failedVictoryCommitRestoresTerminalBattleThenAwardsOnlyOnce() {
        val storage = Storage(); val s = create(storage); enter(s); encounter(s, 1)
        storage.reject = { text ->
            val state = SessionCodec().decode(cloud.vinh.rebirthdungeon.data.save.codec.CheckpointCodec().open(text).second)
            state.battle == null && state.pendingGold > 0
        }
        win(s)
        assertTrue(s.blocked); assertEquals(10, s.pendingReward())
        storage.reject = { false }
        // Simulate abrupt termination: restore the terminal battle from the last durable slot.
        val resumed = create(storage); resumed.finishBattleIfReady(); assertEquals(10, resumed.pendingReward())
        val encoded = SessionCodec().encode(resumed.export())
        resumed.finishBattleIfReady(); assertEquals(encoded, SessionCodec().encode(resumed.export()))
        val firstEnemy = s.heroObservation().statuses.firstOrNull()?.source
        encounter(resumed, 2)
        assertTrue(resumed.battle!!.observe().actors.single { !it.player }.id.value > 2)
        firstEnemy?.let { assertNotEquals(it, resumed.battle!!.observe().actors.single { !it.player }.id) }
        resumed.close()
    }
    @Test fun savesAreDetachedChecksummedAndRejectCorruptGeometry() {
        val storage = Storage(); val s = create(storage); s.command(MoveTo(WorldPoint.pixels(260, 96))); repeat(60) { s.step() }
        val snapshot = s.export(); val codec = SessionCodec(); val decoded = codec.decode(codec.encode(snapshot))
        assertEquals(snapshot.exploration.position, decoded.exploration.position)
        assertThrows(UnsupportedOperationException::class.java) { (snapshot.supplies as MutableMap).clear() }
        s.checkpoint(); val keys = storage.slots.keys.sorted(); storage.slots[keys.last()] = "invalid"
        assertNotNull(repo(storage).load())
        storage.slots.keys.toList().forEach { storage.slots[it] = "invalid" }
        assertThrows(IllegalStateException::class.java) { repo(storage).load() }
    }
}
