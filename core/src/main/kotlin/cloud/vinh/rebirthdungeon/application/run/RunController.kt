package cloud.vinh.rebirthdungeon.application.run

import cloud.vinh.rebirthdungeon.application.persistence.CheckpointRepository
import cloud.vinh.rebirthdungeon.game.DungeonSimulation
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.events.OrderedEvent
import cloud.vinh.rebirthdungeon.game.projection.DungeonObservation

/** Serial render-thread entry point. Each accepted player/AI action checkpoints before the next. */
class RunController(private val simulation: DungeonSimulation, private val repository: CheckpointRepository,
    val token: Long, private val automaticLimit: Int = 1024) {
    private val owner = Thread.currentThread()
    private var halted = false
    private fun checkOwner() = check(Thread.currentThread() === owner) { "RunController must stay on its owning render thread" }
    private var busy = false
    private var closed = false
    private var saveRequired = false
    private val observedEvents = ArrayList<OrderedEvent>()
    var failure: String? = null
        private set
    init { require(automaticLimit > 0) }
    fun observe(): DungeonObservation = simulation.observe(observedEvents)
    fun submit(command: RunCommand, expectedToken: Long): CommandResult {
        checkOwner()
        if (closed || expectedToken != token) return CommandResult.rejected(CommandResult.Reason.STALE_SESSION)
        if (busy || saveRequired || halted) return CommandResult.rejected(CommandResult.Reason.SAVE_REQUIRED)
        busy = true
        try {
            observedEvents.clear()
            val result = simulation.apply(command)
            if (result.accepted()) {
                observedEvents.addAll(simulation.observe().events)
                saveRequired = true
                checkpointAndAdvance()
            }
            return result
        } catch (error: Exception) {
            halted = true; failure = "Simulation halted: ${error.message}"; throw error
        } finally { busy = false }
    }
    /** Also resumes a checkpoint taken between automatic actors. */
    fun startOrResume(): Boolean {
        checkOwner()
        check(!busy && !closed)
        busy = true
        try { saveRequired = true; return checkpointAndAdvance() } finally { busy = false }
    }
    fun retrySave(): Boolean {
        checkOwner()
        if (closed || busy || halted) return false
        busy = true
        try { return checkpointAndAdvance() } finally { busy = false }
    }
    fun checkpoint(): Boolean {
        checkOwner()
        if (closed || busy || halted) return false
        saveRequired = true
        return retrySave()
    }
    private fun checkpointAndAdvance(): Boolean {
        if (halted) return false
        var automatic = 0
        while (true) {
            if (saveRequired) {
                try { repository.save(simulation.restoreExport()); saveRequired = false }
                catch (error: Exception) { failure = error.message ?: error.toString(); return false }
            }
            if (simulation.needsPlayerInput()) { failure = null; return true }
            try {
                check(automatic++ < automaticLimit) { "Automatic actor guard exceeded $automaticLimit actions" }
                check(simulation.automatic().accepted()) { "Automatic action rejected" }
                observedEvents.addAll(simulation.observe().events)
                saveRequired = true
            } catch (error: Exception) {
                halted = true; failure = "Simulation halted: ${error.message}"; return false
            }
        }
    }
    fun close() { checkOwner(); if (!closed) { closed = true; simulation.dispose() } }
}
