package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.ecs.components.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.ActorState
import com.artemis.World
import java.util.TreeMap

internal class BattleWorld(val session: BattleSession) {
    lateinit var world: World
    val entities = TreeMap<Long, Int>()
    val pending = PendingCommand()
    val combat = CombatRuntime(this)
    val scheduler get() = session.scheduler
    fun entity(id: EntityId): Int = entities.getValue(id.value)
    fun isPlayer(id: EntityId): Boolean = world.getMapper(PlayerControlled::class.java).has(entity(id))
    fun player() = EntityId(1)
    fun actor(id: EntityId): ActorState {
        val e = entity(id); val identity = world.getMapper(StableIdentity::class.java).get(e)
        val health = world.getMapper(Health::class.java).get(e)
        return ActorState(id, ContentId(identity.definition), isPlayer(id), health.current, health.maximum)
    }
    fun reject(reason: CommandResult.Reason) { pending.result = CommandResult.rejected(reason) }
    fun validate() {
        if (session.defeated || session.encounterOutcome != null) return reject(CommandResult.Reason.TERMINAL)
        val active = scheduler.active
        if (actor(active).hp <= 0) return reject(CommandResult.Reason.NOT_PLAYER_TURN)
        pending.actor = active
        combat.validate(active, checkNotNull(pending.command))
    }
    fun emit(event: DomainEvent, observed: Boolean) {
        val ordered = OrderedEvent(Math.addExact(session.eventCount, 1L), event, scheduler.round, scheduler.sequence, Math.addExact(session.commandCount, 1L), session.runId)
        session.eventCount = ordered.sequence
        pending.events.add(ordered); if (observed) pending.observedEvents.add(ordered)
    }
    fun cleanup() {
        if (!pending.accepted()) return
        pending.events.mapNotNull { (it.event as? DamageDealt)?.target }.distinct().filter { actor(it).hp == 0 }.forEach { emit(ActorRemoved(it), true) }
    }
    fun finalizeTurn() {
        if (!pending.accepted()) return
        if (pending.finishesActivation) {
            session.turnCount = Math.addExact(session.turnCount, 1L)
            emit(ActivationEnded(checkNotNull(pending.actor)), true)
            if (session.encounterOutcome == null) scheduler.finish(entities.keys.map(::EntityId).filter { actor(it).hp > 0 }.toSet())
        }
        session.commandCount = Math.addExact(session.commandCount, 1L)
        session.history.addAll(pending.events)
        while (session.history.size > 100) {
            val operation = session.history.first().operation
            session.history.removeAll { it.operation == operation }; session.historyTruncated = true
        }
    }
}
