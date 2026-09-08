package cloud.vinh.rebirthdungeon.game.replay

import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.content.frozenMap
import cloud.vinh.rebirthdungeon.game.squidsquad.AceRandomSource

/** Render-thread-owned. Cosmetic RNG is created separately and cannot enter this export. */
class RunRandomStreams private constructor(private val streams: Map<RandomStream, RestorableRandomSource>) {
    operator fun get(stream: RandomStream): RestorableRandomSource = requireNotNull(streams[stream]) {
        "Cosmetic randomness is not authoritative"
    }
    fun capture(): Map<RandomStream, RandomState> = frozenMap(streams.mapValues { it.value.capture() })
    companion object {
        private val authoritative = listOf(RandomStream.GENERATION, RandomStream.AI, RandomStream.COMBAT, RandomStream.LOOT)
        fun seeded(seed: Long): RunRandomStreams = RunRandomStreams(authoritative.associateWith {
            AceRandomSource(SeedDerivation.stream(seed, it))
        })
        fun restore(states: Map<RandomStream, RandomState>): RunRandomStreams {
            require(states.keys == authoritative.toSet()) { "Expected generation, AI, combat and loot states only" }
            return RunRandomStreams(authoritative.associateWith { AceRandomSource.restore(states.getValue(it)) })
        }
    }
}
