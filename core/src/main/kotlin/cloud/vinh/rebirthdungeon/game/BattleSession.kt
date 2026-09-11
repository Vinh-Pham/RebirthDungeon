package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.content.ContentCatalog
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams
import cloud.vinh.rebirthdungeon.game.turns.TurnScheduler

/** One encounter's authoritative state, independent of exploration coordinates. */
class BattleSession(val seed: Long, val content: ContentCatalog, val random: RunRandomStreams = RunRandomStreams.seeded(seed),
    val runId: String = "battle.${java.lang.Long.toHexString(seed)}",
    val combatLoadout: cloud.vinh.rebirthdungeon.game.combat.abilities.CombatLoadout? = null) {
    internal val combatEnabled = true
    internal lateinit var scheduler: TurnScheduler
    internal var nextEntityId = 3L
    internal var commandCount = 0L
    internal var turnCount = 0L
    internal var eventCount = 0L
    internal val encounterParticipants = sortedSetOf<Long>()
    internal var encounterOutcome: cloud.vinh.rebirthdungeon.game.combat.abilities.EncounterOutcome? = null
    internal var defeated = false
}
