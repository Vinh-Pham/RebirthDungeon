package cloud.vinh.rebirthdungeon.data.save

import cloud.vinh.rebirthdungeon.application.persistence.CheckpointRepository
import cloud.vinh.rebirthdungeon.data.save.codec.*
import cloud.vinh.rebirthdungeon.game.projection.RunRestore

interface CheckpointStorage {
    fun read(slot: String): String?
    /** Replace only this slot and close the write before returning. */
    fun write(slot: String, text: String)
}

/** One application-owned synchronous writer. Never overwrites the newest valid slot. */
class AlternatingCheckpointRepository(private val storage: CheckpointStorage, private val validate: (RunRestore) -> Unit) : CheckpointRepository {
    private val codec = CheckpointCodec()
    private data class ValidSlot(val name: String, val revision: Long, val state: RunRestore)
    private fun newest(): ValidSlot? {
        var present = false
        val valid = listOf("run-a.json", "run-b.json").mapNotNull { name ->
            val text = storage.read(name) ?: return@mapNotNull null
            present = true
            try {
                val (revision, payload) = codec.open(text)
                val state = codec.decode(payload); validate(state)
                ValidSlot(name, revision, state)
            } catch (future: UnsupportedCheckpoint) { throw future
            } catch (malformed: RuntimeException) { null }
        }
        check(!present || valid.isNotEmpty()) { "Both checkpoint slots are invalid; existing files preserved" }
        return valid.maxByOrNull { it.revision }
    }
    @Synchronized override fun load(): RunRestore? = newest()?.state
    @Synchronized override fun save(state: RunRestore) {
        validate(state)
        val previous = newest()
        val revision = Math.addExact(previous?.revision ?: 0L, 1L)
        val name = if (previous?.name == "run-a.json") "run-b.json" else "run-a.json"
        val payload = codec.encode(state)
        storage.write(name, codec.envelope(revision, payload))
        val (readRevision, readPayload) = codec.open(checkNotNull(storage.read(name)))
        check(readRevision == revision && readPayload == payload) { "Checkpoint read-back verification failed" }
        validate(codec.decode(readPayload))
    }
}
