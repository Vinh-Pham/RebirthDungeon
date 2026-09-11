package cloud.vinh.rebirthdungeon.data.save.codec
import com.badlogic.gdx.utils.*
internal fun jsonTree(v: Any?): JsonValue = when (v) {
    null -> JsonValue(JsonValue.ValueType.nullValue)
    is String -> JsonValue(v)
    is Int -> JsonValue(v.toLong())
    is Long -> JsonValue(v.toString())
    is Boolean -> JsonValue(v)
    is List<*> -> JsonValue(JsonValue.ValueType.array).also { n -> v.forEach { n.addChild(jsonTree(it)) } }
    else -> error("Nonprimitive JSON value")
}
internal fun jsonText(v: Any?) = jsonTree(v).toJson(JsonWriter.OutputType.json)
internal fun JsonValue.record(n: Int): JsonValue { require(isArray && size == n); return this }
internal fun JsonValue.rows(): List<JsonValue> { require(isArray); return toList() }
internal fun JsonValue.text(): String { require(isString); return asString() }
internal fun JsonValue.int(): Int { require(isLong && asLong() in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong()); return asInt() }
internal fun JsonValue.long(): Long = text().also { require(it.matches(Regex("-?(0|[1-9][0-9]*)"))) }.toLong()
internal fun JsonValue.bool(): Boolean { require(isBoolean); return asBoolean() }
