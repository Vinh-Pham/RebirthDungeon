package cloud.vinh.rebirthdungeon.data.save.codec

import cloud.vinh.rebirthdungeon.data.save.dto.*
import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.content.ContentVersion
import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import cloud.vinh.rebirthdungeon.game.turns.*
import com.badlogic.gdx.utils.Json
import com.badlogic.gdx.utils.JsonWriter
import com.badlogic.gdx.utils.JsonReader
import com.badlogic.gdx.utils.JsonValue
import java.security.MessageDigest

class UnsupportedCheckpoint(message: String) : IllegalArgumentException(message)

/** LibGDX JSON, not the content Jackson mapper. No application/graphics startup required. */
class CheckpointCodec {
    private fun json() = Json().apply {
        setUsePrototypes(false); setTypeName(null); setIgnoreUnknownFields(false)
        setOutputType(JsonWriter.OutputType.json)
    }
    fun encode(state: RunRestore): String {
        val dto = RunCheckpointDto().apply {
            runId = state.runId; seed = java.lang.Long.toHexString(state.seed).padStart(16, '0')
            contentVersion = state.version.content; rulesVersion = state.version.rules; contentSchema = state.version.schema
            floorIndex = state.floorIndex; generatorVersion = state.generatorVersion; generationAttempt = state.generationAttempt
            nextEntityId = state.nextEntityId.toString(); commandCount = state.commandCount.toString()
            turnCount = state.turnCount.toString(); eventCount = state.eventCount.toString(); reachedExit = state.reachedExit
            width = state.floor.width; height = state.floor.height; tiles = state.floor.copyTiles()
            explored = state.explored(); remembered = state.remembered()
            actors = state.actors.sortedBy { it.id.value }.map { a -> ActorDto().apply {
                id = a.id.value.toString(); definition = a.definition.value; x = a.cell.x; y = a.cell.y
                player = a.player; ai = a.ai; blocks = a.blocks; vision = a.vision; hp = a.hp; maxHp = a.maxHp
            } }.toTypedArray()
            tick = state.scheduler.tick.toString(); activeActor = state.scheduler.active?.value?.toString() ?: ""
            nextSequence = state.scheduler.nextSequence.toString()
            queue = state.scheduler.queue.sortedWith(compareBy({ it.dueTick }, { it.insertionSequence }, { it.actor.value })).map { t -> TurnDto().apply {
                actor = t.actor.value.toString(); dueTick = t.dueTick.toString(); insertionSequence = t.insertionSequence.toString()
            } }.toTypedArray()
            random = state.random.entries.sortedBy { it.key.tag }.map { (key, value) -> RandomDto().apply {
                stream = key.name; algorithm = value.algorithmId; format = value.formatVersion; words = value.hexWords().toTypedArray()
            } }.toTypedArray()
        }
        return json().toJson(dto)
    }
    fun decode(payload: String): RunRestore {
        val root = JsonReader().parse(payload)
        val schema = root.get("contentSchema")
        val rules = root.get("rulesVersion")
        if (schema?.isLong == true && schema.asLong() != 1L || rules?.isLong == true && rules.asLong() != 1L)
            throw UnsupportedCheckpoint("Unsupported content schema/rules version")
        fields(root, "run", "runId seed contentVersion rulesVersion contentSchema floorIndex generatorVersion generationAttempt nextEntityId commandCount turnCount eventCount reachedExit width height tiles explored remembered actors tick activeActor nextSequence queue random")
        root.get("actors").forEach { fields(it, "actor", "id definition x y player ai blocks vision hp maxHp") }
        root.get("queue").forEach { fields(it, "turn", "actor dueTick insertionSequence") }
        root.get("random").forEach { fields(it, "random", "stream algorithm format words") }
        val d = json().fromJson(RunCheckpointDto::class.java, payload)
        if (d.contentSchema != 1 || d.rulesVersion != 1) throw UnsupportedCheckpoint("Unsupported content schema/rules version")
        require(d.seed.matches(Regex("[0-9a-f]{16}"))) { "Invalid seed encoding" }
        val actors = d.actors.map { ActorState(EntityId(long(it.id)), ContentId(it.definition), Cell(it.x, it.y),
            it.player, it.ai, it.blocks, it.vision, it.hp, it.maxHp) }
        val random = d.random.map { RandomStream.valueOf(it.stream) to RandomState.fromHex(it.algorithm, it.format, it.words.toList()) }
        require(random.map { it.first }.distinct().size == random.size) { "Duplicate RNG stream" }
        return RunRestore(d.runId, java.lang.Long.parseUnsignedLong(d.seed, 16), ContentVersion(d.contentSchema, d.contentVersion, d.rulesVersion),
            d.floorIndex, d.generatorVersion, d.generationAttempt, long(d.nextEntityId), long(d.commandCount), long(d.turnCount), long(d.eventCount),
            d.reachedExit, FloorMap(d.width, d.height, d.tiles), actors, d.explored, d.remembered,
            SchedulerState(long(d.tick), d.activeActor.takeIf { it.isNotEmpty() }?.let { EntityId(long(it)) }, long(d.nextSequence),
                d.queue.map { TurnEntry(EntityId(long(it.actor)), long(it.dueTick), long(it.insertionSequence)) }), random.toMap())
    }
    fun envelope(revision: Long, payload: String): String = json().toJson(CheckpointEnvelopeDto().apply {
        this.revision = revision.toString(); this.payload = payload; checksum = checksum(payload)
    })
    fun open(text: String): Pair<Long, String> {
        val root = JsonReader().parse(text)
        val version = root.get("schemaVersion")
        if (version?.isLong == true && version.asLong() != 1L) throw UnsupportedCheckpoint("Unsupported checkpoint schema ${version.asLong()}")
        fields(root, "envelope", "schemaVersion revision checksum payload")
        val e = json().fromJson(CheckpointEnvelopeDto::class.java, text)
        if (e.schemaVersion != 1) throw UnsupportedCheckpoint("Unsupported checkpoint schema ${e.schemaVersion}")
        val revision = long(e.revision)
        require(revision > 0 && e.checksum == checksum(e.payload)) { "Invalid checkpoint revision/checksum" }
        return revision to e.payload
    }
    private fun fields(value: JsonValue, path: String, names: String) {
        require(value.isObject) { "$path must be an object" }
        val expected = names.split(" ").toSet()
        val actual = value.map { it.name }
        require(actual.size == expected.size && actual.toSet() == expected && value.none { it.isNull }) { "$path: missing, duplicate, unknown or null field" }
        val integers = setOf("schemaVersion", "contentVersion", "rulesVersion", "contentSchema", "floorIndex", "generatorVersion", "generationAttempt", "width", "height", "x", "y", "vision", "hp", "maxHp", "format")
        val booleans = setOf("reachedExit", "player", "ai", "blocks")
        val arrays = setOf("tiles", "explored", "remembered", "actors", "queue", "random", "words")
        value.forEach { field ->
            val valid = when (field.name) {
                in integers -> field.isLong && field.asLong() in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong()
                in booleans -> field.isBoolean
                in arrays -> field.isArray && field.all { child -> when (field.name) {
                    "tiles", "remembered" -> child.isLong && child.asLong() in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong()
                    "explored" -> child.isBoolean
                    "words" -> child.isString
                    else -> child.isObject
                } }
                else -> field.isString
            }
            require(valid) { "$path.${field.name}: invalid JSON type" }
        }
    }
    private fun long(value: String): Long {
        require(value.matches(Regex("0|[1-9][0-9]*"))) { "Invalid unsigned decimal counter: $value" }
        return value.toLong()
    }
    private fun checksum(value: String): String = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it.toInt() and 255) }
}
