package cloud.vinh.rebirthdungeon.game.combat.dice

import cloud.vinh.rebirthdungeon.game.algorithms.RandomSource
import cloud.vinh.rebirthdungeon.game.content.*

data class HandScore(val pips: Int, val combination: Combination)
object DiceRules {
    fun score(faces: List<Int>): HandScore {
        require(faces.size == 5 && faces.all { it in 1..6 })
        val counts = faces.groupingBy { it }.eachCount().values.sortedDescending()
        val combination = when {
            counts[0] == 5 -> Combination.FIVE_OF_A_KIND
            counts[0] == 4 -> Combination.FOUR_OF_A_KIND
            counts == listOf(3, 2) -> Combination.FULL_HOUSE
            counts.size == 5 && faces.max() - faces.min() == 4 -> Combination.STRAIGHT
            counts[0] == 3 -> Combination.THREE_OF_A_KIND
            counts == listOf(2, 2, 1) -> Combination.TWO_PAIRS
            counts[0] == 2 -> Combination.ONE_PAIR
            else -> Combination.NONE
        }
        return HandScore(faces.sum(), combination)
    }
    fun sample(weights: List<Int>, random: RandomSource): Int {
        require(weights.size == 6 && weights.all { it >= 0 })
        val total = weights.sumOf { it.toLong() }
        require(total in 1..Int.MAX_VALUE.toLong())
        var ticket = random.nextInt(total.toInt())
        weights.forEachIndexed { index, weight -> if (ticket < weight) return index + 1 else ticket -= weight }
        error("Unreachable weight boundary")
    }
}
