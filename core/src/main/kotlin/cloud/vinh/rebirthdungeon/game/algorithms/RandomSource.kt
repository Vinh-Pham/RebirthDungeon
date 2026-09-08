package cloud.vinh.rebirthdungeon.game.algorithms

import cloud.vinh.rebirthdungeon.game.content.frozenList

/** Exclusive positive bound; invalid requests consume no draw. No clock/default seed. */
interface RandomSource {
    fun nextLong(): Long
    fun nextInt(bound: Int): Int {
        require(bound > 0) { "bound must be positive" }
        // Rejection sampling of 63 unsigned bits, avoiding modulo bias.
        var bits: Long
        var value: Long
        do {
            bits = nextLong().ushr(1)
            value = bits % bound
        } while (bits - value + (bound - 1) < 0)
        return value.toInt()
    }
}

interface RestorableRandomSource : RandomSource {
    fun capture(): RandomState
}

class RandomState(val algorithmId: String, val formatVersion: Int, words: List<Long>) {
    val words: List<Long> = frozenList(words)
    fun hexWords(): List<String> = frozenList(words.map { java.lang.Long.toHexString(it).padStart(16, '0') })
    companion object {
        fun fromHex(algorithmId: String, formatVersion: Int, words: List<String>): RandomState =
            RandomState(algorithmId, formatVersion, words.map {
                require(it.matches(Regex("[0-9a-fA-F]{16}"))) { "RNG words require exactly 16 hexadecimal digits" }
                java.lang.Long.parseUnsignedLong(it, 16)
            })
    }
    override fun equals(other: Any?): Boolean = other is RandomState &&
        algorithmId == other.algorithmId && formatVersion == other.formatVersion && words == other.words
    override fun hashCode(): Int = 31 * (31 * algorithmId.hashCode() + formatVersion) + words.hashCode()
}

/** Explicit fixed tags are a versioned contract; never use enum ordinals or String.hashCode. */
enum class RandomStream(val tag: Long) {
    GENERATION(0x47454e01), AI(0x41490001), COMBAT(0x44494345), LOOT(0x4c4f4f54), COSMETIC(0x56495301)
}

object SeedDerivation {
    const val VERSION = 1
    // SplitMix64 finalizer, wrapping signed 64-bit arithmetic and logical shifts.
    private fun mix(input: Long): Long {
        var z = input
        z = (z xor z.ushr(30)) * -4658895280553007687L
        z = (z xor z.ushr(27)) * -7723592293110705685L
        return z xor z.ushr(31)
    }
    fun stream(runSeed: Long, stream: RandomStream): Long = mix(runSeed xor stream.tag)
    fun floorAttempt(runSeed: Long, floorIndex: Int, generatorVersion: Int, attempt: Int): Long {
        require(floorIndex >= 0 && generatorVersion > 0 && attempt >= 0)
        var seed = stream(runSeed, RandomStream.GENERATION)
        seed = mix(seed xor floorIndex.toLong())
        seed = mix(seed xor generatorVersion.toLong())
        return mix(seed xor attempt.toLong())
    }
}
