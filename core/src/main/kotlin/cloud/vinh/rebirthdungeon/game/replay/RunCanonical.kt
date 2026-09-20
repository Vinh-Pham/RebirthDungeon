package cloud.vinh.rebirthdungeon.game.replay

import cloud.vinh.rebirthdungeon.game.projection.BattleRestore

/** Canonical, locale-independent replay comparison. No serializer/reflection or transient caches. */
object RunCanonical {
    fun state(s: BattleRestore): String = buildString {
        append(s.runId).append('|').append(s.seed).append('|').append(s.version).append('|')
        append(s.nextEntityId).append('|').append(s.commandCount).append('|').append(s.turnCount).append('|').append(s.eventCount)
        s.actors.sortedBy { it.id.value }.forEach { append('|').append(it) }
        append('|').append(s.scheduler.cursor).append('|').append(s.scheduler.round).append('|').append(s.scheduler.sequence).append('|').append(s.scheduler.started).append('|').append(s.scheduler.itemUsed)
        s.scheduler.order.forEach { append('|').append(it) }
        s.combat.actors.forEach { append('|').append(it.canonical()) }
        append('|').append(s.combat.outcome).append('|').append(s.combat.participants).append('|').append(s.historyTruncated).append('|').append(s.history)
        s.random.entries.sortedBy { it.key.tag }.forEach { (key, value) ->
            append('|').append(key.tag).append(':').append(value.algorithmId).append(':').append(value.formatVersion)
            append(':').append(value.hexWords().joinToString(","))
        }
    }
}
