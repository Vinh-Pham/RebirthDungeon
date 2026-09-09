package cloud.vinh.rebirthdungeon.game.combat.statuses

import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.*

data class ActiveStatus(val definition: ContentId, val source: EntityId, val remaining: Int, val skipBoundary: Boolean)

object StatusRules {
    /** Null means a lower-priority application was ignored, including its attempted refresh. */
    fun apply(existing: List<ActiveStatus>, definitions: Map<ContentId, StatusDefinition>,
        status: ContentId, source: EntityId, duringOwnerActivation: Boolean): List<ActiveStatus>? {
        val definition = definitions.getValue(status)
        val previous = existing.singleOrNull { definitions.getValue(it.definition).group == definition.group }
        if (previous != null && definitions.getValue(previous.definition).priority > definition.priority) return null
        return frozenList((existing.filterNot { it == previous } + ActiveStatus(status, source, definition.duration, duringOwnerActivation))
            .sortedBy { definitions.getValue(it.definition).group.value })
    }
}
