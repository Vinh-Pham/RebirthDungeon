package cloud.vinh.rebirthdungeon.game.squidsquad

import cloud.vinh.rebirthdungeon.game.algorithms.RandomState
import cloud.vinh.rebirthdungeon.game.algorithms.RestorableRandomSource
import com.github.tommyettinger.random.AceRandom

class AceRandomSource(seed: Long) : RestorableRandomSource {
    private val random = AceRandom(seed)
    override fun nextLong(): Long = random.nextLong()
    override fun capture(): RandomState = RandomState(ALGORITHM, FORMAT, (0 until 5).map { random.getSelectedState(it) })

    companion object {
        const val ALGORITHM = "juniper.ace"
        const val FORMAT = 1
        fun restore(state: RandomState): AceRandomSource {
            require(state.algorithmId == ALGORITHM) { "Unknown RNG algorithm: ${state.algorithmId}" }
            require(state.formatVersion == FORMAT) { "Unsupported RNG state version: ${state.formatVersion}" }
            require(state.words.size == 5) { "AceRandom requires exactly five state words" }
            val result = AceRandomSource(0L)
            state.words.forEachIndexed { index, word -> result.random.setSelectedState(index, word) }
            return result
        }
    }
}
