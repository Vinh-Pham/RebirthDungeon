package cloud.vinh.rebirthdungeon.presentation

import cloud.vinh.rebirthdungeon.presentation.input.InputOwnership
import cloud.vinh.rebirthdungeon.presentation.animation.*
import cloud.vinh.rebirthdungeon.application.run.BattleController
import cloud.vinh.rebirthdungeon.application.persistence.CheckpointRepository
import cloud.vinh.rebirthdungeon.game.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.BattleRestore
import org.junit.Assert.*
import org.junit.Test

class BattlePresentationTest {
    @Test fun pointerOwnershipSurvivesCrossingPanelsAndCancelsAndSuppressesRepeat() {
        val p = InputOwnership(); val ui = InputOwnership.Owner.UI; val world = InputOwnership.Owner.WORLD; val blocked = InputOwnership.Owner.BLOCKED
        assertEquals(ui, p.down(0, ui)); assertEquals(blocked, p.down(1, world))
        assertEquals(ui, p.owner(0)); assertEquals(ui, p.up(0)); assertEquals(blocked, p.up(1))
        assertEquals(world, p.down(0, world)); p.cancel(); assertEquals(blocked, p.up(0))
        assertTrue(p.keyDown(5)); assertFalse(p.keyDown(5)); p.keyUp(5); assertTrue(p.keyDown(5))
    }
    @Test fun availabilityAndSkippingNeverChangeCommittedTurn() {
        val sim = BattleSimulation.create(BattleSession(71, CombatFixtures.content), listOf(CombatFixtures.enemy(hp = 999)))
        val c = BattleController(sim, object : CheckpointRepository { override fun load(): BattleRestore? = null; override fun save(state: BattleRestore) {} }, 1)
        try {
            c.startOrResume(); assertTrue(c.battleView().attack.enabled); assertFalse(c.battleView().wait.enabled)
            assertFalse(c.battleView(true).attack.enabled)
            val before = sim.canonicalState(); val tracks = CombatTracks()
            tracks.accept(c.observe(), false); tracks.skip(); repeat(30) { tracks.advance(0.1f); c.battleView() }
            assertEquals(before, sim.canonicalState())
        } finally { c.close() }
    }
    @Test fun committedFeedbackIsConsumedOnceAcrossSkipAndReplay() {
        val sim = BattleSimulation.create(BattleSession(71, CombatFixtures.content), listOf(CombatFixtures.enemy()))
        var attacks = 0; var damage = 0
        val tracks = CombatTracks(object : CombatFeedback { override fun attack() { attacks++ }; override fun damage() { damage++ } })
        try {
            sim.automatic(); sim.apply(AttackCommand(sim.turnRef(), EntityId(2)))
            val view = sim.observe(); val before = sim.canonicalState()
            tracks.accept(view, true); assertTrue(tracks.playing); assertEquals(1, attacks); assertEquals(1, damage)
            tracks.skip(); tracks.accept(view, true); repeat(10) { tracks.advance(0.1f) }
            assertFalse(tracks.playing); assertEquals(1, attacks); assertEquals(1, damage); assertEquals(before, sim.canonicalState())
        } finally { sim.dispose() }
    }
}
