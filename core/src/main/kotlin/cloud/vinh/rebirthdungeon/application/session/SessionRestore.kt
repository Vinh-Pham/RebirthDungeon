package cloud.vinh.rebirthdungeon.application.session
import cloud.vinh.rebirthdungeon.game.exploration.*
import cloud.vinh.rebirthdungeon.game.projection.*
import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId

enum class SessionMode { EXPLORATION, BATTLE }
class SessionRestore(val version: ContentVersion, val worldVersion: Int, val seed: Long, val expedition: Long, val operation: Long,
    val town: Boolean, placements: List<RoomPlacement>, val exploration: ExplorationRestore,
    val gold: Int, supplies: Map<ContentId, Int>, val pendingGold: Int, pendingSupplies: Map<ContentId, Int>,
    val hero: CombatActorObservation?, val battle: BattleRestore?, val encounter: String?, random: Map<RandomStream, RandomState>, val notice: String) {
    val mode = if (battle == null) SessionMode.EXPLORATION else SessionMode.BATTLE
    val placements = frozenList(placements); val supplies = frozenMap(supplies); val pendingSupplies = frozenMap(pendingSupplies)
    val random = frozenMap(random)
}
interface SessionRepository { fun load(): SessionRestore?; fun save(state: SessionRestore) }
