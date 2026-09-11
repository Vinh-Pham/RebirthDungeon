package cloud.vinh.rebirthdungeon.application.persistence

import cloud.vinh.rebirthdungeon.game.projection.BattleRestore

/** Serialized whole-run checkpoint boundary; returns only after read-back verification. */
interface CheckpointRepository {
    fun load(): BattleRestore?
    fun save(state: BattleRestore)
}
