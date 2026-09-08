package cloud.vinh.rebirthdungeon.game.projection

import cloud.vinh.rebirthdungeon.game.algorithms.RandomState
import cloud.vinh.rebirthdungeon.game.algorithms.RandomStream
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.turns.SchedulerState

data class ActorState(val id: EntityId, val definition: ContentId, val cell: Cell, val player: Boolean,
    val ai: Boolean, val blocks: Boolean, val vision: Int, val hp: Int, val maxHp: Int)

/** Full restore export. Never pass this to rendering or HUD code. */
class RunRestore(val runId: String, val seed: Long, val version: ContentVersion, val floorIndex: Int,
    val generatorVersion: Int, val generationAttempt: Int, val nextEntityId: Long,
    val commandCount: Long, val turnCount: Long, val eventCount: Long, val reachedExit: Boolean,
    val floor: FloorMap, actors: List<ActorState>, explored: BooleanArray, remembered: IntArray,
    val scheduler: SchedulerState, random: Map<RandomStream, RandomState>) {
    val actors = frozenList(actors.sortedBy { it.id.value })
    private val exploredCells = explored.clone()
    private val rememberedTiles = remembered.clone()
    val random = frozenMap(random)
    fun explored() = exploredCells.clone()
    fun remembered() = rememberedTiles.clone()
}

data class ObservedActor(val id: EntityId, val definition: ContentId, val cell: Cell, val player: Boolean, val hp: Int, val maxHp: Int)

/** Only remembered terrain and currently visible actors escape to presentation. */
class DungeonObservation(val runId: String, val commandCount: Long, val turnCount: Long, val tick: Long,
    val player: EntityId, val playerCell: Cell, val reachedExit: Boolean, val width: Int, val height: Int,
    terrain: IntArray, visible: BooleanArray, actors: List<ObservedActor>, events: List<OrderedEvent>) {
    private val terrain = terrain.clone()
    private val visible = visible.clone()
    val actors = frozenList(actors)
    val events = frozenList(events)
    fun tileAt(x: Int, y: Int): Int = terrain[y * width + x]
    fun visibleAt(x: Int, y: Int): Boolean = visible[y * width + x]
}
