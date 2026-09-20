package cloud.vinh.rebirthdungeon.game.turns

import cloud.vinh.rebirthdungeon.game.algorithms.RandomSource
import cloud.vinh.rebirthdungeon.game.content.frozenList
import cloud.vinh.rebirthdungeon.game.identity.EntityId

data class TurnEntry(val actor: EntityId, val speed: Int)
class SchedulerState(order: List<TurnEntry>, val cursor: Int, val round: Long, val sequence: Long,
    val started: Boolean, val itemUsed: Boolean) {
    val order = frozenList(order)
    val active get() = order[cursor].actor
}
/** Captured order never changes; living membership is supplied by the battle World. */
class TurnScheduler private constructor(state: SchedulerState) {
    val order = state.order
    var cursor = state.cursor; private set
    var round = state.round; private set
    var sequence = state.sequence; private set
    var started = state.started; private set
    var itemUsed = state.itemUsed; private set
    val active get() = order[cursor].actor
    init {
        require(order.isNotEmpty() && order.map { it.actor }.distinct().size == order.size)
        require(order.all { it.speed > 0 } && order.zipWithNext().all { it.first.speed >= it.second.speed })
        require(cursor in order.indices && round > 0 && sequence > 0 && (started || !itemUsed))
    }
    fun begin() { check(!started); started = true; itemUsed = false }
    fun useItem() { check(started && !itemUsed); itemUsed = true }
    fun finish(living: Set<EntityId>) {
        check(started && living.isNotEmpty())
        do {
            cursor++
            if (cursor == order.size) { cursor = 0; round = Math.addExact(round, 1L) }
        } while (active !in living)
        sequence = Math.addExact(sequence, 1L); started = false; itemUsed = false
    }
    fun capture() = SchedulerState(order, cursor, round, sequence, started, itemUsed)
    companion object {
        fun create(actors: List<TurnEntry>, random: RandomSource): TurnScheduler {
            require(actors.isNotEmpty() && actors.map { it.actor }.distinct().size == actors.size)
            val order = actors.groupBy { it.speed }.toSortedMap(reverseOrder()).values.flatMap { group ->
                val tied = group.sortedBy { it.actor.value }.toMutableList()
                for (i in tied.lastIndex downTo 1) { val j = random.nextInt(i + 1); val a = tied[i]; tied[i] = tied[j]; tied[j] = a }
                tied
            }
            return TurnScheduler(SchedulerState(order, 0, 1, 1, false, false))
        }
        fun restore(state: SchedulerState) = TurnScheduler(state)
    }
}
