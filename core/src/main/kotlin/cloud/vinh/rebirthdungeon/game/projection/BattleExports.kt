package cloud.vinh.rebirthdungeon.game.projection
import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.turns.SchedulerState

data class ActorState(val id: EntityId, val definition: ContentId, val player: Boolean, val hp: Int, val maxHp: Int)
class BattleRestore(val runId: String, val seed: Long, val version: ContentVersion, val nextEntityId: Long,
    val commandCount: Long, val turnCount: Long, val eventCount: Long, actors: List<ActorState>,
    val scheduler: SchedulerState, random: Map<RandomStream, RandomState>, val combat: CombatRestore) {
    val actors = frozenList(actors.sortedBy { it.id.value }); val random = frozenMap(random)
}
class BattleObservation(val runId: String, val commandCount: Long, val turnCount: Long,
    val player: EntityId, actors: List<ActorState>, events: List<OrderedEvent>) {
    val actors = frozenList(actors); val events = frozenList(events)
}
