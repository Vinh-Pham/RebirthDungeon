package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.ecs.components.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.ActorState
import com.artemis.World
import java.util.TreeMap

/** Internal ECS access and per-action context. The index stores IDs only, never a second actor model. */
internal class RunWorld(val session: RunSession, val pathfinder: Pathfinder, val fov: FieldOfView) {
    lateinit var world: World
    val entities = TreeMap<Long, Int>()
    val pending = PendingCommand()
    val combat = CombatRuntime(this)
    private var lastVisionCell: Cell? = null
    private var lastOpacity = -1L
    val grid get() = session.grid
    val scheduler get() = session.scheduler
    fun entity(id: EntityId): Int = entities.getValue(id.value)
    fun cell(id: EntityId): Cell = world.getMapper(GridPosition::class.java).get(entity(id)).let { Cell(it.x, it.y) }
    fun isPlayer(id: EntityId): Boolean = world.getMapper(PlayerControlled::class.java).has(entity(id))
    fun player(): EntityId = entities.keys.map(::EntityId).single { isPlayer(it) }
    fun actor(id: EntityId): ActorState {
        val e = entity(id)
        val identity = world.getMapper(StableIdentity::class.java).get(e)
        val health = world.getMapper(Health::class.java).get(e)
        return ActorState(id, ContentId(identity.definition), cell(id), isPlayer(id),
            world.getMapper(AiControlled::class.java).has(e), world.getMapper(Blocker::class.java).has(e),
            world.getMapper(Vision::class.java).get(e).radius, health.current, health.maximum)
    }
    fun reject(reason: CommandResult.Reason) { pending.result = CommandResult.rejected(reason) }
    fun validate() {
        if (session.defeated) return reject(CommandResult.Reason.TERMINAL)
        val active = scheduler.active ?: return reject(CommandResult.Reason.NOT_PLAYER_TURN)
        pending.actor = active
        val automatic = pending.command == AutomaticCommand
        if (isPlayer(active) == automatic) return reject(CommandResult.Reason.NOT_PLAYER_TURN)
        if (automatic) { pending.result = CommandResult.ACCEPTED; return }
        validateIntent(active, checkNotNull(pending.command))
    }
    private fun validateIntent(actor: EntityId, command: RunCommand) {
        if (session.combatEnabled && isPlayer(actor) && combat.validate(actor, command)) return
        if (!session.combatEnabled && command !is MoveCommand && command != WaitCommand)
            return reject(CommandResult.Reason.COMBAT_DISABLED)
        if (command == WaitCommand) { pending.result = CommandResult.ACCEPTED; return }
        val move = command as? MoveCommand ?: return reject(CommandResult.Reason.NOT_PLAYER_TURN)
        if (!((move.dx == 0 && move.dy in listOf(-1, 1)) || (move.dy == 0 && move.dx in listOf(-1, 1))))
            return reject(CommandResult.Reason.NOT_CARDINAL)
        val from = cell(actor); val target = Cell(from.x + move.dx, from.y + move.dy)
        if (!grid.inside(target.x, target.y)) return reject(CommandResult.Reason.OUT_OF_BOUNDS)
        val occupant = grid.occupant(target.x, target.y)
        if (occupant != null && session.combatEnabled && isPlayer(actor) && !isPlayer(occupant)) {
            pending.hostile = occupant; pending.finishesActivation = false; pending.result = CommandResult.ACCEPTED; return
        }
        if (occupant != null) return reject(if (isPlayer(actor) != isPlayer(occupant)) CommandResult.Reason.HOSTILE_CONTACT else CommandResult.Reason.OCCUPIED)
        val tile = grid.tile(target.x, target.y)
        if (tile == FloorMap.LOCKED_DOOR) return reject(CommandResult.Reason.LOCKED_DOOR)
        if (tile == FloorMap.WALL) return reject(CommandResult.Reason.BLOCKED)
        pending.target = target
        pending.opensDoor = tile == FloorMap.DOOR
        pending.result = CommandResult.ACCEPTED
    }
    fun enemyIntent() {
        if (!pending.accepted() || pending.command != AutomaticCommand) return
        val actor = checkNotNull(pending.actor)
        val from = cell(actor); val goal = cell(player())
        val state = actor(actor)
        val canSee = fov.visible(grid, from, state.vision)[grid.index(goal.x, goal.y)]
        val blockers = entities.keys.map(::EntityId).filter { it != actor && actor(it).blocks }.map(::cell)
        val next = if (canSee) pathfinder.nextStep(grid, from, goal, blockers) else null
        if (session.combatEnabled && kotlin.math.abs(from.x - goal.x) + kotlin.math.abs(from.y - goal.y) == 1) {
            pending.hostile = player(); return
        }
        // Movement-only sessions preserve the Phase 3 checkpoint contract.
        if (next == null || next == goal) { pending.target = null; return }
        validateIntent(actor, MoveCommand(next.x - from.x, next.y - from.y))
        if (!pending.accepted()) { pending.result = CommandResult.ACCEPTED; pending.target = null; pending.opensDoor = false }
    }
    private fun seen(cell: Cell): Boolean = session.visible[grid.index(cell.x, cell.y)]
    fun emit(event: DomainEvent, observed: Boolean) {
        check(session.eventCount < Long.MAX_VALUE)
        val ordered = OrderedEvent(++session.eventCount, event)
        pending.events.add(ordered)
        if (observed) pending.observedEvents.add(ordered)
    }
    fun move() {
        if (!pending.accepted() || pending.opensDoor) return
        val id = checkNotNull(pending.actor)
        val to = pending.target ?: return
        val from = cell(id)
        if (actor(id).blocks) grid.move(id, from, to)
        world.getMapper(GridPosition::class.java).get(entity(id)).apply { x = to.x; y = to.y }
        emit(ActorMoved(id, from, to), isPlayer(id) || seen(from) && seen(to))
    }
    fun interact() {
        if (!pending.accepted()) return
        if (!pending.finishesActivation || pending.command !is MoveCommand && pending.command != WaitCommand && pending.command != AutomaticCommand) return
        val id = checkNotNull(pending.actor)
        if (pending.opensDoor) {
            val target = checkNotNull(pending.target); grid.openDoor(target)
            emit(DoorOpened(id, target), isPlayer(id) || seen(target))
        } else if (pending.target == null) emit(ActorWaited(id), isPlayer(id) || seen(cell(id)))
        if (isPlayer(id) && grid.tile(cell(id).x, cell(id).y) == FloorMap.EXIT && !session.reachedExit) {
            session.reachedExit = true
            emit(ExitReached(id, cell(id)), true)
        }
    }
    fun cleanup() {
        if (!pending.accepted()) return
        val dead = entities.keys.map(::EntityId).filter { actor(it).hp <= 0 }
        for (id in dead) {
            if (isPlayer(id)) {
                if (!session.defeated) { grid.remove(id, cell(id)); session.defeated = true }
                continue // Retain identity and the final observation; HP remains owned by Health.
            }
            val state = actor(id)
            if (state.blocks) grid.remove(id, state.cell)
            emit(ActorRemoved(id, state.cell), seen(state.cell))
            world.delete(entity(id)); entities.remove(id.value)
        }
        scheduler.removeAll(dead.toSet())
    }
    fun visibility() {
        if (!pending.accepted()) return
        refreshVisibility()
    }
    fun refreshVisibility() {
        val player = player(); val origin = cell(player)
        if (origin == lastVisionCell && grid.opacityRevision == lastOpacity) return
        session.visible = fov.visible(grid, origin, actor(player).vision)
        for (i in session.visible.indices) if (session.visible[i]) {
            session.explored[i] = true
            session.remembered[i] = grid.tile(i % grid.width, i / grid.width)
        }
        lastVisionCell = origin; lastOpacity = grid.opacityRevision
    }
    fun finalizeTurn() {
        if (!pending.accepted()) return
        if (pending.command != AutomaticCommand) session.commandCount++
        if (!pending.finishesActivation) return
        session.turnCount++
        if (session.combatEnabled) {
            val actor = checkNotNull(pending.actor)
            emit(ActivationEnded(actor), actor.value in entities && (isPlayer(actor) || seen(cell(actor))))
            combat.evaluateOutcome()
        }
        // Cleanup can remove the acting entity. Never finalize the newly selected actor in its place.
        if (scheduler.active == pending.actor) scheduler.finish()
        pending.command = null
    }
}
