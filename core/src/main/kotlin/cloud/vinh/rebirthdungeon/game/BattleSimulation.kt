package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.ecs.components.*
import cloud.vinh.rebirthdungeon.game.ecs.systems.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import cloud.vinh.rebirthdungeon.game.turns.TurnScheduler
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams
import com.artemis.World
import com.artemis.WorldConfigurationBuilder

class BattleSimulation private constructor(val session: BattleSession) {
    private val run = BattleWorld(session)
    private val world = World(WorldConfigurationBuilder().with(CommandValidationSystem(run), EnemyIntentSystem(run),
        DiceSystem(run), AbilitySystem(run), DamageSystem(run), StatusSystem(run), CleanupSystem(run), TurnFinalizationSystem(run)).build())
    private var processing = false; private var disposed = false
    init { run.world = world }
    fun apply(command: RunCommand): CommandResult {
        check(!processing && !disposed); processing = true
        try { run.pending.reset(command); world.process(); return checkNotNull(run.pending.result) }
        finally { processing = false }
    }
    internal fun automatic() = apply(AutomaticCommand)
    fun selectionFailure(skill: ContentId, target: EntityId) = run.combat.selectionFailure(run.player(), skill, target)
    fun isDefeated() = session.defeated
    fun isFinished() = session.encounterOutcome != null
    fun needsPlayerInput() = isFinished() || session.scheduler.active == run.player()
    fun combatObservation() = run.combat.observation()
    fun observe(events: List<OrderedEvent> = run.pending.observedEvents) = BattleObservation(session.runId, session.commandCount,
        session.turnCount, run.player(), run.entities.keys.map { run.actor(EntityId(it)) }, events)
    fun events(): List<OrderedEvent> = frozenList(run.pending.events)
    fun restoreExport() = BattleRestore(session.runId, session.seed, session.content.version, session.nextEntityId,
        session.commandCount, session.turnCount, session.eventCount, run.entities.keys.map { run.actor(EntityId(it)) },
        session.scheduler.capture(), session.random.capture(), checkNotNull(run.combat.export()))
    fun canonicalState() = cloud.vinh.rebirthdungeon.game.replay.RunCanonical.state(restoreExport()) + "|combat=" + run.combat.canonical()
    fun dispose() { if (!disposed) { disposed = true; world.dispose() } }
    /** Pure transient hero editor used outside battle; never advances initiative. */
    fun potion(potion: ContentId) { run.combat.potion(run.player(), potion) }
    fun recoverHero() { run.combat.recoverHero() }
    private fun install(actors: List<ActorState>) {
        actors.sortedBy { it.id.value }.forEach { a ->
            val e = world.create(); val edit = world.edit(e)
            edit.create(StableIdentity::class.java).apply { value = a.id.value; definition = a.definition.value }
            edit.create(Health::class.java).apply { current = a.hp; maximum = a.maxHp }
            if (a.player) edit.create(PlayerControlled::class.java) else edit.create(AiControlled::class.java)
            run.entities[a.id.value] = e; run.combat.install(a.id)
        }
    }
    companion object {
        fun create(session: BattleSession, enemies: List<ActorState> = emptyList(), hero: CombatActorObservation? = null): BattleSimulation {
            require(enemies.size <= 1 && enemies.all { !it.player && it.id != EntityId(1) && it.hp > 0 })
            val d = session.content.actors.getValue(ContentId("actor.hero"))
            val actors = listOf(ActorState(EntityId(1), d.id, true, hero?.current?.hp ?: d.resources.hp, hero?.maximum?.hp ?: d.resources.hp)) + enemies
            session.nextEntityId = Math.addExact(maxOf(2L, actors.maxOf { it.id.value }, hero?.statuses?.maxOfOrNull { it.source.value } ?: 1L), 1L)
            session.scheduler = TurnScheduler.create(actors.map { it.id })
            val result = BattleSimulation(session)
            try {
                result.install(actors)
                if (hero != null) result.run.combat.restore(CombatRestore(hero.current.hp == 0, if (hero.current.hp == 0) cloud.vinh.rebirthdungeon.game.combat.abilities.EncounterOutcome.DEFEAT else null, emptyList(), listOf(hero) + result.combatObservation().actors.filter { it.id != EntityId(1) }))
                if (hero?.current?.hp == 0) session.scheduler.remove(EntityId(1))
                session.encounterParticipants.addAll(enemies.map { it.id.value })
                return result
            } catch (e: Exception) { result.dispose(); throw e }
        }
        fun validateRestore(state: BattleRestore, content: ContentCatalog) {
            require(state.version == content.version && state.commandCount >= 0 && state.turnCount >= 0 && state.eventCount >= 0)
            require(state.actors.size in 1..2 && state.actors.count { it.player } == 1 && state.actors.single { it.player }.id == EntityId(1))
            require(state.actors.all { it.definition in content.actors && it.hp in 0..it.maxHp && it.maxHp > 0 && it.id.value < state.nextEntityId })
            val scheduled = state.scheduler.queue.map { it.actor } + listOfNotNull(state.scheduler.active)
            require(scheduled.distinct().size == scheduled.size && scheduled.toSet() == state.actors.filter { it.hp > 0 }.map { it.id }.toSet())
            TurnScheduler.restore(state.scheduler)
            state.combat.validate(state, content)
        }
        fun restore(state: BattleRestore, content: ContentCatalog): BattleSimulation {
            validateRestore(state, content)
            val session = BattleSession(state.seed, content, RunRandomStreams.restore(state.random), state.runId)
            session.scheduler = TurnScheduler.restore(state.scheduler); session.nextEntityId = state.nextEntityId
            session.commandCount = state.commandCount; session.turnCount = state.turnCount; session.eventCount = state.eventCount
            val result = BattleSimulation(session)
            try { result.install(state.actors); result.run.combat.restore(state.combat); return result }
            catch (e: Exception) { result.dispose(); throw e }
        }
    }
}
