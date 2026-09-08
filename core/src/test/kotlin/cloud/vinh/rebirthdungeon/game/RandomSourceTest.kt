package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams
import cloud.vinh.rebirthdungeon.game.squidsquad.AceRandomSource
import org.junit.Assert.*
import org.junit.Test

class RandomSourceTest {
    @Test fun restoreContinuesEveryStreamAndCosmeticsAreIndependent() {
        val a = RunRandomStreams.seeded(Long.MIN_VALUE)
        val b = RunRandomStreams.seeded(Long.MIN_VALUE)
        val cosmetic = AceRandomSource(SeedDerivation.stream(Long.MIN_VALUE, RandomStream.COSMETIC))
        repeat(71) { cosmetic.nextLong() }
        a.capture().keys.forEach { stream -> repeat(37) { assertEquals(a[stream].nextLong(), b[stream].nextLong()) } }
        val saved = a.capture()
        val restored = RunRandomStreams.restore(saved)
        a.capture().keys.forEach { stream -> repeat(100) { assertEquals(a[stream].nextLong(), restored[stream].nextLong()) } }
        repeat(27) { b[RandomStream.AI].nextLong() }
        val untouched = RunRandomStreams.restore(saved)
        listOf(RandomStream.COMBAT, RandomStream.LOOT, RandomStream.GENERATION).forEach {
            assertEquals(untouched[it].nextLong(), b[it].nextLong())
        }
        assertEquals(4, saved.size)
        assertEquals(4, saved.values.toSet().size)
        assertThrows(IllegalArgumentException::class.java) { a[RandomStream.COSMETIC] }
        assertThrows(IllegalArgumentException::class.java) { RunRandomStreams.restore(saved - RandomStream.AI) }
        assertThrows(IllegalArgumentException::class.java) { RunRandomStreams.restore(saved + (RandomStream.COSMETIC to cosmetic.capture())) }
    }

    @Test fun fullSignedStateIsDetachedAndValidated() {
        val words = mutableListOf(Long.MIN_VALUE, Long.MAX_VALUE, -1L, 0L, 42L)
        val state = RandomState(AceRandomSource.ALGORITHM, 1, words)
        words[0] = 9
        assertEquals(Long.MIN_VALUE, state.words[0])
        assertEquals(state, AceRandomSource.restore(state).capture())
        assertEquals(listOf("8000000000000000", "7fffffffffffffff", "ffffffffffffffff", "0000000000000000", "000000000000002a"), state.hexWords())
        assertEquals(state, RandomState.fromHex(state.algorithmId, state.formatVersion, state.hexWords()))
        assertThrows(IllegalArgumentException::class.java) { RandomState.fromHex(state.algorithmId, 1, listOf("-1")) }
        assertThrows(UnsupportedOperationException::class.java) { (state.words as MutableList<Long>)[0] = 9 }
        listOf(RandomState("unknown", 1, state.words), RandomState(AceRandomSource.ALGORITHM, 2, state.words),
            RandomState(AceRandomSource.ALGORITHM, 1, listOf(1L))).forEach {
            assertThrows(IllegalArgumentException::class.java) { AceRandomSource.restore(it) }
        }
    }

    @Test fun boundedDrawRejectsBiasAndInvalidBoundsDoNotConsume() {
        val source = SequenceRandomSource(-1L, 10L, 0L)
        assertThrows(IllegalArgumentException::class.java) { source.nextInt(0) }
        assertEquals(0, source.draws)
        assertEquals(2, source.nextInt(3)) // max 63-bit value rejected, 5 mod 3 accepted
        assertEquals(2, source.draws)
        assertEquals(0, source.nextInt(1))
        assertThrows(IllegalStateException::class.java) { source.nextLong() }
    }

    @Test fun attemptSeedsHaveStableInputsAndSeparateDomains() {
        val baseline = SeedDerivation.floorAttempt(123, 0, 1, 0)
        assertEquals(-3633694389194832376L, baseline) // Seed-derivation v1 golden vector
        val seeds = setOf(baseline, SeedDerivation.floorAttempt(124, 0, 1, 0), SeedDerivation.floorAttempt(123, 1, 1, 0),
            SeedDerivation.floorAttempt(123, 0, 2, 0), SeedDerivation.floorAttempt(123, 0, 1, 1))
        assertEquals(5, seeds.size)
        assertEquals(5, RandomStream.entries.map { SeedDerivation.stream(123, it) }.toSet().size)
        assertThrows(IllegalArgumentException::class.java) { SeedDerivation.floorAttempt(1, -1, 1, 0) }
        assertThrows(IllegalArgumentException::class.java) { SeedDerivation.floorAttempt(1, 0, 0, 0) }
        assertThrows(IllegalArgumentException::class.java) { SeedDerivation.floorAttempt(1, 0, 1, -1) }
    }
}
