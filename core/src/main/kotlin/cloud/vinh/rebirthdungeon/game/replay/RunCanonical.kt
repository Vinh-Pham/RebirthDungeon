package cloud.vinh.rebirthdungeon.game.replay

import cloud.vinh.rebirthdungeon.game.projection.RunRestore

/** Canonical, locale-independent replay comparison. No serializer/reflection or transient caches. */
object RunCanonical {
    fun state(s: RunRestore): String = buildString {
        append(s.runId).append('|').append(s.seed).append('|').append(s.version).append('|')
        append(s.floorIndex).append('|').append(s.generatorVersion).append('|').append(s.generationAttempt).append('|')
        append(s.nextEntityId).append('|').append(s.commandCount).append('|').append(s.turnCount).append('|')
        append(s.eventCount).append('|').append(s.reachedExit).append('|').append(s.floor.width).append('x').append(s.floor.height)
        append('|').append(s.floor.copyTiles().joinToString(","))
        append('|').append(s.explored().joinToString("") { if (it) "1" else "0" })
        append('|').append(s.remembered().joinToString(","))
        s.actors.sortedBy { it.id.value }.forEach { append('|').append(it) }
        append('|').append(s.scheduler.tick).append('|').append(s.scheduler.active?.value).append('|').append(s.scheduler.nextSequence)
        s.scheduler.queue.sortedWith(compareBy({ it.dueTick }, { it.insertionSequence }, { it.actor.value })).forEach { append('|').append(it) }
        s.random.entries.sortedBy { it.key.tag }.forEach { (key, value) ->
            append('|').append(key.tag).append(':').append(value.algorithmId).append(':').append(value.formatVersion)
            append(':').append(value.hexWords().joinToString(","))
        }
    }
}
