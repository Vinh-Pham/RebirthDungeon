package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.events.OrderedEvent
import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.events.ActorMoved
import cloud.vinh.rebirthdungeon.game.projection.MovementSnapshot
import cloud.vinh.rebirthdungeon.game.commands.CommandResult
import cloud.vinh.rebirthdungeon.game.commands.MoveCommand
import cloud.vinh.rebirthdungeon.game.commands.PendingCommand
import cloud.vinh.rebirthdungeon.game.ecs.components.GridPosition
import cloud.vinh.rebirthdungeon.game.ecs.components.PlayerControlled
import cloud.vinh.rebirthdungeon.game.ecs.systems.CleanupSystem
import cloud.vinh.rebirthdungeon.game.ecs.systems.CommandValidationSystem
import cloud.vinh.rebirthdungeon.game.ecs.systems.MovementSystem
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import com.artemis.BaseEntitySystem
import com.artemis.ComponentMapper
import com.artemis.World
import com.artemis.WorldConfigurationBuilder
import ktx.artemis.allOf
import ktx.artemis.entity
import ktx.artemis.mapperFor
import ktx.artemis.with

/** Command-driven artemis-odb spike for Phase 1: one [World], explicit
 * system registration order, and exactly one synchronous `process()` per
 * resolved command. Idle frames must not advance anything — rendering only
 * reads [playerX]/[playerY]. Owns its world; dispose when the
 * owning screen goes away. The full RunController replaces this slice in
 * Phase 3. */
class DungeonSimulation private constructor(
    private val world: World,
    val floor: FloorMap,
    private val pending: PendingCommand,
    private val playerEntity: Int,
    private val stepCounter: StepCounterSystem,
    val session: RunSession?
) {
    private val mPosition: ComponentMapper<GridPosition> = world.mapperFor()
    private var acceptedCommands = 0
    private val stablePlayer = EntityId(1)
    private var lastEvents: List<OrderedEvent> = emptyList()

    fun snapshot(): MovementSnapshot =
        MovementSnapshot(acceptedCommands.toLong(), stablePlayer,
            Cell(playerX(), playerY()), lastEvents)

    /** Resolves one command synchronously on the calling thread: sets the
     * pending context, runs one `world.process()`, and copies the result
     * out after the flush. Rejections leave authoritative state untouched. */
    fun apply(command: MoveCommand): CommandResult {
        val from = Cell(playerX(), playerY())
        pending.resetAll()
        pending.move = command
        world.process()
        val result = pending.result
        pending.resetAll()
        val resolved = checkNotNull(result) { "command pipeline produced no result for $command" }
        if (resolved.accepted()) {
            acceptedCommands++
            lastEvents = listOf(OrderedEvent(acceptedCommands.toLong(),
                ActorMoved(stablePlayer, from,
                    Cell(playerX(), playerY()))))
        }
        return resolved
    }

    fun playerX(): Int = mPosition.get(playerEntity).x

    fun playerY(): Int = mPosition.get(playerEntity).y

    /** Accepted commands since creation; presentation counter, never saved. */
    fun acceptedCommandCount(): Int = acceptedCommands

    /** Completed `world.process()` calls; proves idle frames do not step
     * the simulation. Diagnostics evidence, not gameplay state. */
    fun completedSteps(): Int = stepCounter.steps

    fun dispose() {
        world.dispose()
    }

    /** Counts completed `world.process()` calls; diagnostics evidence
     * that only explicit commands step the simulation. */
    private class StepCounterSystem : BaseEntitySystem(allOf()) {
        var steps = 0

        override fun processSystem() {
            steps++
        }
    }

    companion object {
        /** Builds the world on the calling thread (the render thread in production).
         * System registration order is the pipeline order: validation, movement,
         * then cleanup, with the step counter last. The player entity is created
         * after the world exists and resolved by the systems through their aspect
         * subscription, never through a cached id (artemis recycles ids). */
        fun create(floor: FloorMap, spawnX: Int, spawnY: Int, session: RunSession? = null): DungeonSimulation {
            val pending = PendingCommand()
            val counter = StepCounterSystem()

            val configuration = WorldConfigurationBuilder()
                // Slot numbers (100/200/800) are documentation labels; execution
                // order is fixed by registration order below.
                .with(
                    CommandValidationSystem(pending, floor.width, floor.height),
                    MovementSystem(pending, floor),
                    CleanupSystem(pending),
                    counter
                )
                .build()
            val world = World(configuration)

            // ktx-artemis entity builder: create the entity and configure its
            // components in one type-safe block (replaces mapper.create calls).
            val player = world.entity {
                with<GridPosition> {
                    x = spawnX
                    y = spawnY
                }
                with<PlayerControlled>()
            }

            return DungeonSimulation(world, floor, pending, player, counter, session)
        }
    }
}
