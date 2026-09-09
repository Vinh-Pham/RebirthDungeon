package cloud.vinh.rebirthdungeon.game.turns

import cloud.vinh.rebirthdungeon.game.content.frozenList
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import java.util.PriorityQueue

data class TurnEntry(val actor: EntityId, val dueTick: Long, val insertionSequence: Long)
class SchedulerState(val tick: Long, val active: EntityId?, val nextSequence: Long, queue: List<TurnEntry>) {
    val queue = frozenList(queue)
}

/** Active actor is removed from the queue. Ties never depend on ECS iteration. */
class TurnScheduler private constructor(state: SchedulerState) {
    private val order = compareBy<TurnEntry>({ it.dueTick }, { it.insertionSequence }, { it.actor.value })
    private val queue = PriorityQueue(order)
    var tick = state.tick
        private set
    var active = state.active
        private set
    private var nextSequence = state.nextSequence
    init {
        require(tick >= 0 && nextSequence >= 0)
        require(state.queue.all { it.dueTick >= tick && it.insertionSequence in 0 until nextSequence })
        require(state.queue.map { it.actor }.distinct().size == state.queue.size)
        require(state.queue.map { it.insertionSequence }.distinct().size == state.queue.size)
        require(state.queue.none { it.actor == active })
        queue.addAll(state.queue)
    }
    fun finish() {
        val actor = checkNotNull(active)
        check(tick <= Long.MAX_VALUE - ACTION_COST && nextSequence < Long.MAX_VALUE) { "Turn counters exhausted" }
        queue.add(TurnEntry(actor, tick + ACTION_COST, nextSequence++))
        select()
    }
    fun remove(actor: EntityId) = removeAll(setOf(actor))
    /** Remove every casualty before selecting, including simultaneous activation-end deaths. */
    fun removeAll(actors: Set<EntityId>) {
        queue.removeAll { it.actor in actors }
        if (active in actors) select()
    }
    private fun select() {
        val next = queue.poll()
        active = next?.actor
        if (next != null) tick = next.dueTick
    }
    fun capture() = SchedulerState(tick, active, nextSequence, queue.toList().sortedWith(order))
    companion object {
        const val ACTION_COST = 100L
        fun create(actors: List<EntityId>): TurnScheduler {
            require(actors.isNotEmpty() && actors.distinct().size == actors.size)
            return TurnScheduler(SchedulerState(0, actors.first(), actors.size.toLong(), actors.drop(1).mapIndexed { i, id -> TurnEntry(id, 0, i + 1L) }))
        }
        fun restore(state: SchedulerState) = TurnScheduler(state)
    }
}
