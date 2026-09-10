package cloud.vinh.rebirthdungeon.presentation.animation

import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.projection.DungeonObservation

interface CombatFeedback {
    fun attack()
    fun damage()
    object Silent : CombatFeedback { override fun attack() {} ; override fun damage() {} }
}
data class CombatTrack(val actor: EntityId, val cell: Cell, val kind: String, val amount: Int = 0, val from: Cell? = null)

/** Consumes observed events once. Cosmetic time, skipping and restoration never submit commands. */
class CombatTracks(private val feedback: CombatFeedback = CombatFeedback.Silent) {
    private var runId = ""
    private var consumed = 0L
    private var remaining = 0f
    private val active = ArrayList<CombatTrack>()
    var reducedMotion = false
    val playing get() = remaining > 0
    val progress get() = (1f - remaining / 0.35f).coerceIn(0f, 1f)
    val tracks: List<CombatTrack> get() = active.toList()
    fun accept(view: DungeonObservation, animate: Boolean) {
        if (view.runId != runId) { runId = view.runId; consumed = 0; skip() }
        val visible = view.actors.associateBy { it.id }
        val fresh = view.events.filter { it.sequence > consumed }
        consumed = maxOf(consumed, fresh.maxOfOrNull { it.sequence } ?: 0)
        if (!animate) { skip(); return }
        val observedCells = visible.mapValues { it.value.cell } + fresh.map { it.event }.filterIsInstance<ActorRemoved>().associate { it.actor to it.cell }
        fresh.forEach { ordered ->
            val event = ordered.event
            val track = when (event) {
                is ActorMoved -> visible[event.actor]?.takeIf { view.visibleAt(event.from.x, event.from.y) }?.let {
                    CombatTrack(it.id, event.to, "move", from = event.from)
                }
                is AbilityUsed -> visible[event.actor]?.let { CombatTrack(it.id, it.cell, "attack") }
                is DamageDealt -> observedCells[event.target]?.let { CombatTrack(event.target, it, "damage", event.hpDamage) }
                // The removal cell itself was exported only when visible at event time.
                is ActorRemoved -> CombatTrack(event.actor, event.cell, "death")
                else -> null
            }
            if (track != null) {
                if (track.kind == "attack") feedback.attack()
                if (track.kind == "damage") feedback.damage()
                if (!reducedMotion) { active.add(track); while (active.size > 32) active.removeAt(0); remaining = 0.35f }
            }
        }
    }
    fun advance(delta: Float) { remaining = (remaining - delta.coerceIn(0f, 0.1f)).coerceAtLeast(0f); if (!playing) active.clear() }
    fun skip() { remaining = 0f; active.clear() }
}
