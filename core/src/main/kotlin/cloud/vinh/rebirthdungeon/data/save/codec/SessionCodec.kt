package cloud.vinh.rebirthdungeon.data.save.codec
import cloud.vinh.rebirthdungeon.application.session.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import cloud.vinh.rebirthdungeon.game.exploration.*
import cloud.vinh.rebirthdungeon.game.projection.CombatRestore
import com.badlogic.gdx.utils.*
class SessionCodec {
    private val battle = CheckpointCodec()
    private fun point(p: WorldPoint) = listOf(p.x, p.y)
    private fun point(p: JsonValue): WorldPoint { p.record(2); return WorldPoint(p[0].int(), p[1].int()) }
    private fun counts(m: Map<ContentId, Int>) = m.entries.sortedBy { it.key.value }.map { listOf(it.key.value, it.value) }
    private fun counts(v: JsonValue): Map<ContentId, Int> {
        val pairs = v.rows().map { it.record(2); ContentId(it[0].text()) to it[1].int() }
        require(pairs.map { it.first }.distinct().size == pairs.size); return pairs.toMap()
    }
    fun encode(s: SessionRestore): String {
        val e = s.exploration
        return jsonText(listOf(3, listOf(s.version.schema, s.version.content, s.version.rules), s.worldVersion, s.seed, s.expedition, s.operation, s.town,
            s.placements.map { listOf(it.template, point(it.offset), it.room) },
            listOf(e.tick, point(e.position), point(e.direction), e.remainder, e.path.map(::point), e.discovered, e.defeated, e.interaction, e.sequence),
            s.gold, counts(s.supplies), s.pendingGold, counts(s.pendingSupplies),
            s.hero?.let { CombatCheckpointCodec.encode(CombatRestore(false, null, emptyList(), listOf(it))) },
            s.battle?.let(battle::encode), s.encounter, CheckpointCodec.random(s.random), s.notice))
    }
    fun decode(text: String): SessionRestore {
        val r = JsonReader().parse(text).record(18)
        if (r[0].int() != 3) throw UnsupportedCheckpoint("Unsupported session version")
        val v = r[1].record(3); val e = r[8].record(9)
        if (v[0].int() != 2 || v[2].int() != 2) throw UnsupportedCheckpoint("Unsupported content/rules version")
        return SessionRestore(ContentVersion(v[0].int(), v[1].int(), v[2].int()), r[2].int(), r[3].long(), r[4].long(), r[5].long(), r[6].bool(),
            r[7].rows().map { it.record(3); RoomPlacement(it[0].text(), point(it[1]), it[2].int()) },
            ExplorationRestore(e[0].long(), point(e[1]), point(e[2]), e[3].int(), e[4].rows().map(::point), e[5].rows().map { it.int() }, e[6].rows().map { it.text() }, if (e[7].isNull) null else e[7].text(), e[8].long()),
            r[9].int(), counts(r[10]), r[11].int(), counts(r[12]), if (r[13].isNull) null else checkNotNull(CombatCheckpointCodec.decode(r[13].text())).actors.single(),
            if (r[14].isNull) null else battle.decode(r[14].text()), if (r[15].isNull) null else r[15].text(), CheckpointCodec.readRandom(r[16]), r[17].text())
    }
}
