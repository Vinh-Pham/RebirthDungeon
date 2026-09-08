package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.algorithms.RandomSource

/** Finite fixture; exhaustion fails instead of silently cycling or inventing draws. */
class SequenceRandomSource(vararg values: Long) : RandomSource {
    private val values = values.clone()
    var draws = 0
        private set
    override fun nextLong(): Long = values.getOrElse(draws) { error("Sequence RNG exhausted at $draws") }.also { draws++ }
}
