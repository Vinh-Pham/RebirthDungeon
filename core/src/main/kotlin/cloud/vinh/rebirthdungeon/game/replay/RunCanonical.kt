package cloud.vinh.rebirthdungeon.game.replay

import cloud.vinh.rebirthdungeon.game.projection.BattleRestore

/** Canonical, locale-independent replay comparison. No serializer/reflection or transient caches. */
object RunCanonical {
    fun state(s: BattleRestore): String = buildString {
        append(s.runId).append('|').append(s.seed).append('|').append(s.version).append('|')
        append(s.nextEntityId).append('|').append(s.commandCount).append('|').append(s.turnCount).append('|').append(s.eventCount)
        s.actors.sortedBy { it.id.value }.forEach { append('|').append(it) }
        append('|').append(s.scheduler.tick).append('|').append(s.scheduler.active?.value).append('|').append(s.scheduler.nextSequence)
        s.scheduler.queue.sortedWith(compareBy({ it.dueTick }, { it.insertionSequence }, { it.actor.value })).forEach { append('|').append(it) }
        s.random.entries.sortedBy { it.key.tag }.forEach { (key, value) ->
            append('|').append(key.tag).append(':').append(value.algorithmId).append(':').append(value.formatVersion)
            append(':').append(value.hexWords().joinToString(","))
        }
    }
}
