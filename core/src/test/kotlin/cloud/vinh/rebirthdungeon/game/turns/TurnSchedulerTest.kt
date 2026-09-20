package cloud.vinh.rebirthdungeon.game.turns

import cloud.vinh.rebirthdungeon.game.algorithms.RandomSource
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.squidsquad.AceRandomSource
import org.junit.Assert.*
import org.junit.Test

class TurnSchedulerTest {
    @Test fun speedOrderOneTurnPerRoundAndDeadSkip() {
        val noDraw = object : RandomSource { override fun nextLong(): Long = error("No tie must draw") }
        val s = TurnScheduler.create(listOf(TurnEntry(EntityId(1), 11), TurnEntry(EntityId(2), 12), TurnEntry(EntityId(3), 9)), noDraw)
        assertEquals(EntityId(2), s.active); s.begin(); s.useItem()
        s.finish(setOf(EntityId(1), EntityId(2))); assertEquals(EntityId(1), s.active); assertFalse(s.itemUsed)
        s.begin(); s.finish(setOf(EntityId(1), EntityId(2))); assertEquals(2L, s.round); assertEquals(EntityId(2), s.active)
        assertEquals(3L, s.sequence)
    }
    @Test fun tiesIgnoreInputOrderAndRestoreConsumesNoRandomness() {
        val entries = (1L..5L).map { TurnEntry(EntityId(it), 10) }
        val a = TurnScheduler.create(entries, AceRandomSource(71)); val b = TurnScheduler.create(entries.reversed(), AceRandomSource(71))
        assertEquals(a.order, b.order)
        a.begin(); a.useItem(); val resumed = TurnScheduler.restore(a.capture())
        assertTrue(resumed.started); assertTrue(resumed.itemUsed); assertEquals(a.order, resumed.order)
        repeat(20) { a.finish(entries.map { it.actor }.toSet()); resumed.finish(entries.map { it.actor }.toSet()); assertEquals(a.active, resumed.active); a.begin(); resumed.begin() }
    }
    @Test fun invalidQueueCannotRestore() {
        assertThrows(IllegalArgumentException::class.java) { TurnScheduler.restore(SchedulerState(listOf(TurnEntry(EntityId(1), 1), TurnEntry(EntityId(1), 1)), 0, 1, 1, false, false)) }
        assertThrows(IllegalArgumentException::class.java) { TurnScheduler.restore(SchedulerState(listOf(TurnEntry(EntityId(1), 1)), 0, 1, 1, false, true)) }
    }
}
