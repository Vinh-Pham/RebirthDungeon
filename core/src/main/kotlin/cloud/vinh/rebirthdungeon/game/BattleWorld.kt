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
        val active = scheduler.active ?: return reject(CommandResult.Reason.NOT_PLAYER_TURN)
        pending.actor = active
        val automatic = pending.command == AutomaticCommand
        if (isPlayer(active) == automatic) return reject(CommandResult.Reason.NOT_PLAYER_TURN)
        if (automatic) { pending.result = CommandResult.ACCEPTED; return }
        combat.validate(active, checkNotNull(pending.command))
    }
    fun enemyIntent() {
        if (pending.accepted() && pending.command == AutomaticCommand) pending.hostile = player()
    }
    fun emit(event: DomainEvent, observed: Boolean) {
        val ordered = OrderedEvent(++session.eventCount, event)
        pending.events.add(ordered); if (observed) pending.observedEvents.add(ordered)
    }
    fun cleanup() {
        if (!pending.accepted()) return
        val dead = entities.keys.map(::EntityId).filter { actor(it).hp <= 0 }
        for (id in dead) {
            if (isPlayer(id)) { session.defeated = true; continue }
            emit(ActorRemoved(id), true); world.delete(entity(id)); entities.remove(id.value)
        }
        scheduler.removeAll(dead.toSet())
    }
    fun finalizeTurn() {
        if (!pending.accepted()) return
        session.commandCount++
        if (!pending.finishesActivation) return
        session.turnCount++
        emit(ActivationEnded(checkNotNull(pending.actor)), true)
        combat.evaluateOutcome()
        if (scheduler.active == pending.actor) scheduler.finish()
        pending.command = null
    }
}
