package cloud.vinh.rebirthdungeon.smoke

import com.github.tommyettinger.random.AceRandom
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.util.Arrays

/**
 * Smoke fixture for the Juniper RNG the project will wrap behind its own
 * `RandomSource` interfaces in Phase 2: identical seeds must reproduce
 * sequences, and a captured five-word state must continue the exact sequence.
 * Plain JVM test; no Gdx.app, no OpenGL.
 */
class AceRandomStateTest {

    @Test
    fun sameSeedReproducesSequenceAndDifferentSeedDiverges() {
        assertArrayEquals(draw(AceRandom(SEED), 64), draw(AceRandom(SEED), 64))
        assertFalse(Arrays.equals(draw(AceRandom(SEED), 64), draw(AceRandom(SEED + 1), 64)))
    }

    @Test
    fun capturedFiveWordStateContinuesTheExactSequence() {
        val source = AceRandom(SEED)
        draw(source, WARMUP_DRAWS)

        val state = LongArray(source.stateCount)
        for (i in state.indices) {
            state[i] = source.getSelectedState(i)
        }
        assertEquals(5, state.size)

        val expectedTail = draw(source, TAIL_DRAWS)

        val restored = AceRandom(SEED)
        for (i in state.indices) {
            restored.setSelectedState(i, state[i])
        }
        assertArrayEquals(expectedTail, draw(restored, TAIL_DRAWS))
    }

    private fun draw(random: AceRandom, count: Int): LongArray {
        val values = LongArray(count)
        for (i in 0 until count) {
            values[i] = random.nextLong()
        }
        return values
    }

    companion object {
        // Same 64-bit seed as the Java-era literal 0x9E3779B97F4A7C15, written
        // in two's-complement form because Kotlin hex literals stay positive.
        private const val SEED = -0x61C8864680B583EB
        private const val WARMUP_DRAWS = 32
        private const val TAIL_DRAWS = 16
    }
}
