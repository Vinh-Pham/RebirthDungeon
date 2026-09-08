package cloud.vinh.rebirthdungeon.application.persistence

import cloud.vinh.rebirthdungeon.game.projection.RunRestore

/** Serialized whole-run checkpoint boundary; returns only after read-back verification. */
interface CheckpointRepository {
    fun load(): RunRestore?
    fun save(state: RunRestore)
}
