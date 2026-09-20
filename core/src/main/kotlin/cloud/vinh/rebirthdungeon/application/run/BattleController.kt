package cloud.vinh.rebirthdungeon.application.run

import cloud.vinh.rebirthdungeon.application.persistence.CheckpointRepository
import cloud.vinh.rebirthdungeon.game.BattleSimulation
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.combat.abilities.BattleRules
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*

/** One pending resolved result; persistence retry never executes a command again. */
class BattleController(private val simulation: BattleSimulation, private val repository: CheckpointRepository,
    val token: Long, private val automaticLimit: Int = 1024) {
    private val owner = Thread.currentThread()
    private var halted = false
    private var busy = false
    private var closed = false
    private var saveRequired = false
    private var committed: BattleRestore = simulation.restoreExport()
    private var pending: BattleRestore? = null
    var failure: String? = null; private set
    init { require(automaticLimit > 0) }
    private fun checkOwner() = check(Thread.currentThread() === owner)
    fun selectionFailure(skill: ContentId, target: EntityId): String? {
        val c = combatObservation()
        return BattleRules.failure(c.actors.single { it.id == EntityId(1) }, c.actors.firstOrNull { it.id == target }, simulation.session.content.skills[skill])?.label()
    }
    fun battleView(presenting: Boolean = false): BattleView {
        val blocked = failure?.let { "Save failed: $it — Retry save" } ?: when {
            closed -> "Session closed"
            busy || saveRequired -> "Saving"
            committed.combat.outcome != null -> "${committed.combat.outcome} — returning to exploration"
            presenting -> "Presenting — Skip to continue"
            else -> null
        }
        return BattleView.create(token, committed.commandCount, committed.runId, combatObservation(), simulation.session.content, blocked)
    }
    fun combatObservation() = CombatObservation(committed.combat.outcome, committed.combat.defeated,
        committed.combat.participants.isNotEmpty() || committed.combat.outcome != null, committed.combat.actors, committed.scheduler)
    fun observe() = BattleObservation(committed.runId, committed.commandCount, committed.turnCount, EntityId(1), committed.actors, committed.history)
    fun submit(command: RunCommand, expectedToken: Long, expectedRevision: Long? = null): CommandResult {
        checkOwner()
        if (closed || expectedToken != token || expectedRevision != committed.commandCount) return CommandResult.rejected(CommandResult.Reason.STALE_SESSION)
        if (busy || saveRequired || halted) return CommandResult.rejected(CommandResult.Reason.SAVE_REQUIRED)
        if (command !is BattleActionCommand || command.turn.actor != EntityId(1)) return CommandResult.rejected(CommandResult.Reason.NOT_PLAYER_TURN)
        busy = true
        try {
            val result = simulation.apply(command)
            if (result.accepted()) { stage(); checkpointAndAdvance() }
            return result
        } catch (error: Exception) { halted = true; failure = "Simulation halted: ${error.message}"; throw error }
        finally { busy = false }
    }
    private fun stage() { pending = simulation.restoreExport(); saveRequired = true }
    fun startOrResume(deferEnemy: Boolean = false): Boolean {
        checkOwner(); check(!busy && !closed); busy = true
        try { stage(); return checkpointAndAdvance(deferEnemy) } finally { busy = false }
    }
    fun advanceAutomatic(): Boolean = retrySave()
    fun retrySave(): Boolean {
        checkOwner(); if (closed || busy || halted) return false; busy = true
        try { return checkpointAndAdvance() } finally { busy = false }
    }
    fun checkpoint(): Boolean {
        checkOwner(); if (closed || busy || halted) return false
        if (!saveRequired) stage()
        return retrySave()
    }
    private fun checkpointAndAdvance(deferEnemy: Boolean = false): Boolean {
        if (halted) return false
        var automatic = 0
        while (true) {
            if (saveRequired) {
                val candidate = checkNotNull(pending)
                try { repository.save(candidate) }
                catch (error: Exception) { failure = error.message ?: error.toString(); return false }
                committed = candidate; pending = null; saveRequired = false
            }
            if (simulation.isFinished() || simulation.needsPlayerInput() || deferEnemy && simulation.combatObservation().turn.started) { failure = null; return true }
            try {
                check(automatic++ < automaticLimit) { "Automatic actor guard exceeded $automaticLimit actions" }
                check(simulation.automatic().accepted()) { "Automatic command rejected" }
                stage()
            } catch (error: Exception) { halted = true; failure = "Simulation halted: ${error.message}"; return false }
        }
    }
    /** Authoritative candidate for session-owned persistence; never use this for rendering. */
    fun restoreExport() = pending ?: committed
    fun close() { checkOwner(); if (!closed) { closed = true; simulation.dispose() } }
}
