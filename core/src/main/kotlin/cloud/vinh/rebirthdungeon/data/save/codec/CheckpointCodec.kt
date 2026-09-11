package cloud.vinh.rebirthdungeon.data.save.codec
import cloud.vinh.rebirthdungeon.game.projection.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.content.ContentVersion
import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.turns.*
import com.badlogic.gdx.utils.JsonReader
import java.security.MessageDigest
class UnsupportedCheckpoint(message: String) : IllegalArgumentException(message)
class CheckpointCodec {
    fun encode(s: BattleRestore): String = jsonText(listOf(2, s.runId, s.seed, listOf(s.version.schema, s.version.content, s.version.rules),
        s.nextEntityId, s.commandCount, s.turnCount, s.eventCount,
        s.actors.map { listOf(it.id.value, it.definition.value, it.player, it.hp, it.maxHp) },
        listOf(s.scheduler.tick, s.scheduler.active?.value, s.scheduler.nextSequence, s.scheduler.queue.map { listOf(it.actor.value, it.dueTick, it.insertionSequence) }),
        random(s.random), CombatCheckpointCodec.encode(s.combat)))
    fun decode(text: String): BattleRestore {
        val r = JsonReader().parse(text).record(12)
        if (r[0].int() != 2) throw UnsupportedCheckpoint("Unsupported battle version")
        val v = r[3].record(3); val t = r[9].record(4)
        if (v[0].int() != 2 || v[2].int() != 2) throw UnsupportedCheckpoint("Unsupported content/rules version")
        return BattleRestore(r[1].text(), r[2].long(), ContentVersion(v[0].int(), v[1].int(), v[2].int()), r[4].long(), r[5].long(), r[6].long(), r[7].long(),
            r[8].rows().map { a -> a.record(5); ActorState(EntityId(a[0].long()), ContentId(a[1].text()), a[2].bool(), a[3].int(), a[4].int()) },
            SchedulerState(t[0].long(), if (t[1].isNull) null else EntityId(t[1].long()), t[2].long(), t[3].rows().map { q ->
                q.record(3); TurnEntry(EntityId(q[0].long()), q[1].long(), q[2].long()) }),
            readRandom(r[10]), checkNotNull(CombatCheckpointCodec.decode(r[11].text())))
    }
    fun envelope(revision: Long, payload: String) = jsonText(listOf(2, revision, checksum(payload), payload))
    fun open(text: String): Pair<Long, String> {
        val r = JsonReader().parse(text).record(4)
        if (r[0].int() != 2) throw UnsupportedCheckpoint("Unsupported save version")
        val revision = r[1].long(); val payload = r[3].text()
        require(revision > 0 && r[2].text() == checksum(payload)) { "Invalid revision/checksum" }
        return revision to payload
    }
    private fun checksum(value: String) = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it.toInt() and 255) }
    companion object {
        internal fun random(states: Map<RandomStream, RandomState>) = states.entries.sortedBy { it.key.tag }.map { (id, s) -> listOf(id.name, s.algorithmId, s.formatVersion, s.hexWords()) }
        internal fun readRandom(v: com.badlogic.gdx.utils.JsonValue): Map<RandomStream, RandomState> {
            val rows = v.rows().map { it.record(4); RandomStream.valueOf(it[0].text()) to RandomState.fromHex(it[1].text(), it[2].int(), it[3].rows().map { w -> w.text() }) }
            require(rows.map { it.first }.distinct().size == rows.size)
            return rows.toMap()
        }
    }
}
