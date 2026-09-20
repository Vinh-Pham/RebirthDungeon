package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.ecs.components.*
import cloud.vinh.rebirthdungeon.game.ecs.systems.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import cloud.vinh.rebirthdungeon.game.turns.*
import cloud.vinh.rebirthdungeon.game.algorithms.RandomStream
import cloud.vinh.rebirthdungeon.game.combat.abilities.EnemyPolicy
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams
import com.artemis.World
import com.artemis.WorldConfigurationBuilder

class BattleSimulation private constructor(val session: BattleSession) {
    private val run = BattleWorld(session)
    private val world = World(WorldConfigurationBuilder().with(CommandValidationSystem(run), TurnStartSystem(run), AbilitySystem(run), DamageSystem(run), StatusSystem(run), CleanupSystem(run), TurnFinalizationSystem(run)).build())
    private var processing = false; private var disposed = false
    init { run.world = world }
    fun apply(command: RunCommand): CommandResult {
        check(!processing && !disposed); processing = true
        try { run.pending.reset(command); world.process(); return checkNotNull(run.pending.result) }
        finally { processing = false }
    }
    internal fun automatic() = apply(if (!session.scheduler.started) BeginTurnCommand(turnRef()) else EnemyPolicy.choose(session.runId, combatObservation(), session.content))
    fun turnRef() = run.combat.turnRef()
    fun selectionFailure(skill: ContentId, target: EntityId) = run.combat.selectionFailure(run.player(), skill, target)
    fun isDefeated() = session.defeated
    fun isFinished() = session.encounterOutcome != null
    fun needsPlayerInput() = isFinished() || session.scheduler.started && session.scheduler.active == run.player()
    fun combatObservation() = run.combat.observation()
    fun observe(events: List<OrderedEvent> = session.history) = BattleObservation(session.runId, session.commandCount,
        session.turnCount, run.player(), run.entities.keys.map { run.actor(EntityId(it)) }, events)
    fun events(): List<OrderedEvent> = frozenList(run.pending.events)
    fun restoreExport() = BattleRestore(session.runId, session.seed, session.content.version, session.nextEntityId,
        session.commandCount, session.turnCount, session.eventCount, run.entities.keys.map { run.actor(EntityId(it)) },
        session.scheduler.capture(), session.random.capture(), run.combat.export(), session.history, session.historyTruncated)
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
            session.scheduler = TurnScheduler.create(listOf(TurnEntry(EntityId(1), 1)), session.random[RandomStream.COMBAT])
            val result = BattleSimulation(session)
            try {
                result.install(actors)
                if (hero != null) result.run.combat.restore(CombatRestore(hero.current.hp == 0, if (hero.current.hp == 0) cloud.vinh.rebirthdungeon.game.combat.abilities.EncounterOutcome.DEFEAT else null, emptyList(), listOf(hero) + result.combatObservation().actors.filter { it.id != EntityId(1) }))
                session.scheduler = TurnScheduler.create(actors.map { a ->
                    val speed = if (a.player) 10 + result.combatObservation().actors.single { it.id == a.id }.stats.getValue(ContentId("stat.dex")) / 10 else session.content.actors.getValue(a.definition).speed
                    TurnEntry(a.id, speed)
                }, session.random[RandomStream.COMBAT])
                session.encounterParticipants.addAll(enemies.map { it.id.value })
                return result
            } catch (e: Exception) { result.dispose(); throw e }
        }
        fun validateRestore(state: BattleRestore, content: ContentCatalog) {
            require(state.version == content.version && state.commandCount >= 0 && state.turnCount >= 0 && state.eventCount >= 0)
            require(state.actors.size in 1..2 && state.actors.count { it.player } == 1 && state.actors.single { it.player }.id == EntityId(1))
            require(state.actors.all { it.definition in content.actors && it.hp in 0..it.maxHp && it.maxHp > 0 && it.id.value < state.nextEntityId })
            TurnScheduler.restore(state.scheduler)
            require(state.scheduler.order.map { it.actor }.toSet() == state.actors.map { it.id }.toSet())
            require(state.combat.outcome != null || state.actors.single { it.id == state.scheduler.active }.hp > 0)
            require(state.scheduler.sequence == state.turnCount + (if (state.combat.outcome == null) 1L else 0L) || state.actors.size == 1)
            require(state.history.size <= 100 && state.history.zipWithNext().all { it.first.sequence < it.second.sequence && it.first.operation <= it.second.operation })
            require(state.history.all { it.battle == state.runId && it.sequence <= state.eventCount && it.operation <= state.commandCount && it.turn <= state.scheduler.sequence && it.round <= state.scheduler.round })
            TurnScheduler.restore(state.scheduler)
            state.combat.validate(state, content)
            val actors = state.actors.map { it.id }.toSet()
            fun actor(id: EntityId) = require(id in actors)
            fun resources(v: ResourceVector) = require(v.hp >= 0 && v.mp >= 0 && v.spTenths >= 0)
            state.history.groupBy { it.operation }.values.forEach { batch -> require(batch.map { it.turn to it.round }.distinct().size == 1) }
            require(state.history.count { it.event is EncounterEnded } <= 1)
            state.history.forEach { ordered ->
                when (val e = ordered.event) {
                    is CostsPaid -> { actor(e.actor); resources(e.cost) }
                    is AbilityUsed -> { actor(e.actor); actor(e.target); require(e.skill in content.skills) }
                    is ItemUsed -> { actor(e.actor); require(e.item in content.potions) }
                    is DamageDealt -> { actor(e.target); require(e.source.value < state.nextEntityId && e.hpDamage >= 0 && e.shieldAbsorbed >= 0) }
                    is StatusApplied -> { actor(e.target); require(e.source.value < state.nextEntityId && (e.status in content.statuses || e.status.value == "skill.defend")) }
                    is StatusExpired -> { actor(e.target); require(e.status in content.statuses || e.status.value == "skill.defend") }
                    is ShieldGranted -> { actor(e.actor); require(e.amount >= 0 && e.duration > 0) }
                    is ResourcesRecovered -> { actor(e.actor); resources(e.actual) }
                    is Waited -> actor(e.actor)
                    is TurnStarted -> actor(e.actor)
                    is ActivationEnded -> actor(e.actor)
                    is ActorRemoved -> actor(e.actor)
                    is EncounterEnded -> require(e.outcome == state.combat.outcome)
                }
            }
        }
        fun restore(state: BattleRestore, content: ContentCatalog): BattleSimulation {
            validateRestore(state, content)
            val session = BattleSession(state.seed, content, RunRandomStreams.restore(state.random), state.runId)
            session.scheduler = TurnScheduler.restore(state.scheduler); session.nextEntityId = state.nextEntityId
            session.history.addAll(state.history); session.historyTruncated = state.historyTruncated
            session.commandCount = state.commandCount; session.turnCount = state.turnCount; session.eventCount = state.eventCount
            val result = BattleSimulation(session)
            try { result.install(state.actors); result.run.combat.restore(state.combat); return result }
            catch (e: Exception) { result.dispose(); throw e }
        }
    }
}
