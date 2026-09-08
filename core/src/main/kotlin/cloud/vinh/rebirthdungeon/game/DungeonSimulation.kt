package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.ecs.components.*
import cloud.vinh.rebirthdungeon.game.ecs.systems.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.grid.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams
import cloud.vinh.rebirthdungeon.game.content.ContentCatalog
import cloud.vinh.rebirthdungeon.game.squidsquad.*
import cloud.vinh.rebirthdungeon.game.turns.TurnScheduler
import com.artemis.World
import com.artemis.WorldConfigurationBuilder
import ktx.artemis.entity
import ktx.artemis.with

/** One World per run. Every action completes the whole registered pipeline before any export. */
class DungeonSimulation private constructor(val session: RunSession, private val run: RunWorld) {
    private val world = World(WorldConfigurationBuilder().with(
        CommandValidationSystem(run), EnemyIntentSystem(run), MovementSystem(run), InteractionSystem(run),
        CleanupSystem(run), VisibilitySystem(run), TurnFinalizationSystem(run)
    ).build())
    private var processing = false
    private var disposed = false
    private var steps = 0
    init { run.world = world }
    val floor: FloorMap get() = session.grid.floor()
    fun apply(command: RunCommand): CommandResult {
        check(!processing && !disposed) { "Simulation is processing or disposed" }
        processing = true
        try {
            run.pending.reset(command)
            world.process(); steps++
            return checkNotNull(run.pending.result)
        } finally { processing = false }
    }
    internal fun automatic(): CommandResult = apply(AutomaticCommand)
    fun needsPlayerInput(): Boolean = session.scheduler.active?.let { run.isPlayer(it) } == true
    fun playerX() = run.cell(run.player()).x
    fun playerY() = run.cell(run.player()).y
    fun acceptedCommandCount() = session.commandCount.toInt()
    fun completedSteps() = steps
    fun snapshot() = MovementSnapshot(session.commandCount, run.player(), run.cell(run.player()), run.pending.observedEvents)
    fun events(): List<OrderedEvent> = cloud.vinh.rebirthdungeon.game.content.frozenList(run.pending.events)
    fun observe(events: List<OrderedEvent> = run.pending.observedEvents): DungeonObservation {
        check(!processing)
        val player = run.player()
        val actors = run.entities.keys.map(::EntityId).map(run::actor).filter { it.player || session.visible[session.grid.index(it.cell.x, it.cell.y)] }
            .map { ObservedActor(it.id, it.definition, it.cell, it.player, it.hp, it.maxHp) }
        return DungeonObservation(session.runId, session.commandCount, session.turnCount, session.scheduler.tick,
            player, run.cell(player), session.reachedExit, session.grid.width, session.grid.height,
            session.remembered, session.visible, actors, events)
    }
    fun restoreExport(): RunRestore {
        check(!processing && !disposed)
        return RunRestore(session.runId, session.seed, session.content.version, session.floorIndex, session.generatorVersion,
            session.generationAttempt, session.nextEntityId, session.commandCount, session.turnCount, session.eventCount,
            session.reachedExit, floor, run.entities.keys.map(::EntityId).map(run::actor), session.explored, session.remembered,
            session.scheduler.capture(), session.random.capture())
    }
    fun dispose() { if (!disposed) { world.dispose(); disposed = true } }
    private fun install(actors: List<ActorState>) {
        require(actors.count { it.player } == 1 && actors.map { it.id }.distinct().size == actors.size)
        actors.sortedBy { it.id.value }.forEach { a ->
            require(a.definition in session.content.actors && a.vision in 1..64 && a.maxHp > 0 && a.hp in 0..a.maxHp)
            require(!a.player || a.hp > 0)
            require(a.player != a.ai && a.blocks) { "Phase 3 actors must be blocking player or AI" }
            val e = world.entity {
                with<StableIdentity> { value = a.id.value; definition = a.definition.value }
                with<GridPosition> { x = a.cell.x; y = a.cell.y }
                with<Vision> { radius = a.vision }
                with<Health> { current = a.hp; maximum = a.maxHp }
                with<Blocker>()
                if (a.player) with<PlayerControlled>() else with<AiControlled>()
            }
            run.entities[a.id.value] = e
            session.grid.place(a.id, a.cell)
        }
        run.refreshVisibility()
    }
    companion object {
        fun create(floor: FloorMap, spawnX: Int, spawnY: Int, session: RunSession,
            enemies: List<ActorState> = emptyList(), generationAttempt: Int = 0): DungeonSimulation {
            check(!session.initialized()) { "RunSession already owns a World" }
            val hero = session.content.actors.getValue(ContentId("actor.hero"))
            val actors = listOf(ActorState(EntityId(1), hero.id, Cell(spawnX, spawnY), true, false, true, 8, hero.resources.hp, hero.resources.hp)) + enemies
            require(actors.size <= 1024 && actors.maxOf { it.id.value } < Long.MAX_VALUE)
            require(generationAttempt >= 0)
            session.grid = DungeonGrid(floor)
            session.explored = BooleanArray(floor.width * floor.height)
            session.remembered = IntArray(floor.width * floor.height) { -1 }
            session.visible = BooleanArray(floor.width * floor.height)
            session.nextEntityId = actors.maxOf { it.id.value } + 1
            session.generationAttempt = generationAttempt
            session.scheduler = TurnScheduler.create(actors.map { it.id }.sortedBy { it.value })
            val result = DungeonSimulation(session, RunWorld(session, SquidPathfinder(), SquidFieldOfView()))
            try { result.install(actors) } catch (failure: Exception) { result.dispose(); throw failure }
            return result
        }
        fun validateRestore(state: RunRestore, content: ContentCatalog) {
            require(state.version == content.version) { "Checkpoint content/rules version does not match" }
            require(state.floorIndex >= 0 && state.generatorVersion == 1 && state.generationAttempt >= 0)
            require(state.commandCount >= 0 && state.turnCount >= state.commandCount && state.eventCount >= state.turnCount)
            require(state.eventCount < Long.MAX_VALUE - 4096 && state.turnCount < Long.MAX_VALUE - 4096)
            require(state.scheduler.tick <= Long.MAX_VALUE - 200 && state.scheduler.nextSequence < Long.MAX_VALUE - 4096)
            require(state.scheduler.tick % 100 == 0L && state.scheduler.queue.all { it.dueTick % 100 == 0L })
            require(state.actors.isNotEmpty() && state.actors.size <= 1024 && state.nextEntityId > state.actors.maxOf { it.id.value })
            val size = state.floor.width * state.floor.height
            require(state.explored().size == size && state.remembered().size == size)
            val explored = state.explored()
            state.remembered().forEachIndexed { i, tile -> require(if (explored[i]) tile in FloorMap.WALL..FloorMap.LOCKED_DOOR else tile == -1) }
            val scheduled = state.scheduler.queue.map { it.actor } + listOfNotNull(state.scheduler.active)
            require(scheduled.toSet() == state.actors.map { it.id }.toSet() && scheduled.size == state.actors.size)
            require(state.scheduler.active != null)
            val grid = DungeonGrid(state.floor)
            require(state.actors.count { it.player } == 1)
            require(state.runId.matches(Regex("[a-zA-Z0-9_.-]{1,100}")))
            state.actors.forEach { a ->
                require(a.definition in content.actors && a.vision in 1..64 && a.maxHp > 0 && a.hp in 0..a.maxHp)
                require(a.player != a.ai && a.blocks && a.hp > 0)
                grid.place(a.id, a.cell)
            }
            TurnScheduler.restore(state.scheduler)
            RunRandomStreams.restore(state.random)
        }
        fun restore(state: RunRestore, content: ContentCatalog): DungeonSimulation {
            validateRestore(state, content)
            val session = RunSession(state.seed, content, RunRandomStreams.restore(state.random), state.runId)
            session.grid = DungeonGrid(state.floor); session.scheduler = TurnScheduler.restore(state.scheduler)
            session.floorIndex = state.floorIndex; session.generatorVersion = state.generatorVersion; session.generationAttempt = state.generationAttempt
            session.nextEntityId = state.nextEntityId; session.commandCount = state.commandCount; session.turnCount = state.turnCount
            session.eventCount = state.eventCount; session.reachedExit = state.reachedExit
            session.explored = state.explored(); session.remembered = state.remembered(); session.visible = BooleanArray(state.floor.width * state.floor.height)
            val result = DungeonSimulation(session, RunWorld(session, SquidPathfinder(), SquidFieldOfView()))
            try { result.install(state.actors) } catch (failure: Exception) { result.dispose(); throw failure }
            return result
        }
    }
}
