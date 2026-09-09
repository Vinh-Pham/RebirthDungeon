package cloud.vinh.rebirthdungeon.game.ecs.components

import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.StatModifier
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.ActiveStatus
import com.artemis.Component

class DiceHand : Component() {
    var open = false
    var selection: Selection? = null
    var locked: LockedAbility? = null
    val faces = IntArray(5)
    val kept = BooleanArray(5)
    var rerolls = 2
    fun clear() { open = false; selection = null; locked = null; faces.fill(0); kept.fill(false); rerolls = 2 }
}
/** Health owns HP current/max; these fields own MP/SP and all reservations, avoiding duplicate HP. */
class ResourcePools : Component() {
    var mp = 0
    var sp = 0
    var maxMp = 0
    var maxSp = 0
    var reserved = ResourceVector(0, 0, 0)
    var costFlat = ResourceVector(0, 0, 0)
    var costPercent = ResourceVector(0, 0, 0)
}
class Stats : Component() {
    var baseline: Map<ContentId, Int> = emptyMap()
    var modifiers: List<StatModifier> = emptyList()
    var effective: Map<ContentId, Int> = emptyMap()
}
class AbilityLoadout : Component() {
    var learned: Map<ContentId, String> = emptyMap()
    var equipment: List<String> = emptyList()
}
class StatusSet : Component() { val entries = ArrayList<ActiveStatus>() }
class Shield : Component() {
    var amount = 0
    var remaining = 0
    var skipBoundary = false
}
data class CooldownState(val remaining: Int, val skipBoundary: Boolean)
class Cooldowns : Component() { val entries = sortedMapOf<String, CooldownState>() }
