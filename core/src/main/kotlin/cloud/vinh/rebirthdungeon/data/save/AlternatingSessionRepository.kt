package cloud.vinh.rebirthdungeon.data.save
import cloud.vinh.rebirthdungeon.application.session.*
import cloud.vinh.rebirthdungeon.data.save.codec.*
/** One serialized writer; incomplete writes can only damage the older slot. */
class AlternatingSessionRepository(private val storage: CheckpointStorage, private val validate: (SessionRestore) -> Unit) : SessionRepository {
    private val codec = SessionCodec(); private val envelope = CheckpointCodec()
    private data class Slot(val name: String, val revision: Long, val state: SessionRestore)
    private fun newest(): Slot? {
        var present = false
        val valid = listOf("session-a.json", "session-b.json").mapNotNull { name ->
            val text = storage.read(name) ?: return@mapNotNull null; present = true
            try { val (revision, payload) = envelope.open(text); val state = codec.decode(payload); validate(state); Slot(name, revision, state) }
            catch (future: UnsupportedCheckpoint) { throw future }
            catch (_: RuntimeException) { null }
        }
        check(!present || valid.isNotEmpty()) { "Both save slots are invalid; files preserved" }
        return valid.maxByOrNull { it.revision }
    }
    @Synchronized override fun load() = newest()?.state
    @Synchronized override fun save(state: SessionRestore) {
        validate(state)
        val previous = newest(); val name = if (previous?.name == "session-a.json") "session-b.json" else "session-a.json"
        val revision = Math.addExact(previous?.revision ?: 0, 1); val payload = codec.encode(state)
        storage.write(name, envelope.envelope(revision, payload))
        val read = envelope.open(checkNotNull(storage.read(name)))
        check(read.first == revision && read.second == payload) { "Save read-back failed" }; validate(codec.decode(read.second))
    }
}
