package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.content.ContentCatalog
import cloud.vinh.rebirthdungeon.game.grid.DungeonGrid
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams
import cloud.vinh.rebirthdungeon.game.turns.TurnScheduler

/** Authoritative non-component state; all mutation is serialized by the run controller. */
class RunSession(val seed: Long, val content: ContentCatalog, val random: RunRandomStreams = RunRandomStreams.seeded(seed),
    val runId: String = "run.${java.lang.Long.toHexString(seed)}") {
    init { require(runId.matches(Regex("[a-zA-Z0-9_.-]{1,100}"))) }
    internal fun initialized() = this::grid.isInitialized
    internal lateinit var grid: DungeonGrid
    internal lateinit var scheduler: TurnScheduler
    internal var floorIndex = 0
    internal var generatorVersion = 1
    internal var generationAttempt = 0
    internal var nextEntityId = 1L
    internal var commandCount = 0L
    internal var turnCount = 0L
    internal var eventCount = 0L
    internal var reachedExit = false
    internal var explored = BooleanArray(0)
    internal var remembered = IntArray(0)
    internal var visible = BooleanArray(0)
}
