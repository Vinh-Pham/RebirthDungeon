package cloud.vinh.rebirthsaga.smoke;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import com.github.tommyettinger.random.AceRandom;
import org.junit.Test;

/**
 * Smoke fixture for the Juniper RNG the project will wrap behind its own
 * {@code RandomSource} interfaces in Phase 2: identical seeds must reproduce
 * sequences, and a captured five-word state must continue the exact sequence.
 * Plain JVM test; no Gdx.app, no OpenGL.
 */
public class AceRandomStateTest {
    private static final long SEED = 0x9E3779B97F4A7C15L;
    private static final int WARMUP_DRAWS = 32;
    private static final int TAIL_DRAWS = 16;

    private static long[] draw(AceRandom random, int count) {
        long[] values = new long[count];
        for(int i = 0; i < count; i++) {
            values[i] = random.nextLong();
        }
        return values;
    }

    @Test
    public void sameSeedReproducesSequenceAndDifferentSeedDiverges() {
        assertArrayEquals(draw(new AceRandom(SEED), 64), draw(new AceRandom(SEED), 64));
        assertFalse(java.util.Arrays.equals(
                draw(new AceRandom(SEED), 64), draw(new AceRandom(SEED + 1), 64)));
    }

    @Test
    public void capturedFiveWordStateContinuesTheExactSequence() {
        AceRandom source = new AceRandom(SEED);
        draw(source, WARMUP_DRAWS);

        long[] state = new long[source.getStateCount()];
        for(int i = 0; i < state.length; i++) {
            state[i] = source.getSelectedState(i);
        }
        assertEquals(5, state.length);

        long[] expectedTail = draw(source, TAIL_DRAWS);

        AceRandom restored = new AceRandom(SEED);
        for(int i = 0; i < state.length; i++) {
            restored.setSelectedState(i, state[i]);
        }
        assertArrayEquals(expectedTail, draw(restored, TAIL_DRAWS));
    }
}
