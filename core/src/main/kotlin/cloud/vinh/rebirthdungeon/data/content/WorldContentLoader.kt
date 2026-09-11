package cloud.vinh.rebirthdungeon.data.content
import cloud.vinh.rebirthdungeon.data.content.dto.*
import cloud.vinh.rebirthdungeon.game.exploration.*
import cloud.vinh.rebirthdungeon.game.content.ContentCatalog
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import com.fasterxml.jackson.databind.*
import com.fasterxml.jackson.databind.json.JsonMapper
import com.fasterxml.jackson.core.JsonParser
class WorldContentLoader {
    fun load(text: String, catalog: ContentCatalog): WorldContent = try {
        val mapper = JsonMapper.builder().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS, DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT).disable(MapperFeature.ALLOW_COERCION_OF_SCALARS).build()
        val d = mapper.readValue(text, WorldDto::class.java)
        fun point(p: List<Int>?): WorldPoint { require(p?.size == 2); return WorldPoint.pixels(p[0], p[1]) }
        fun room(r: RoomDto) = RoomTemplate(requireNotNull(r.id), requireNotNull(r.polygons).map { polygon -> polygon.map(::point) }, point(r.entry), point(r.exit), point(r.spawn))
        val content = WorldContent(requireNotNull(d.version), room(requireNotNull(d.town)), requireNotNull(d.objects).map {
            WorldObject(requireNotNull(it.id), requireNotNull(it.name), point(it.position), point(it.approach), 0, requireNotNull(it.service), requireNotNull(it.text))
        }, requireNotNull(d.templates).map(::room), requireNotNull(d.offers).map {
            ShopOffer(ContentId(requireNotNull(it.potion)), requireNotNull(it.price), requireNotNull(it.capacity))
        }, requireNotNull(d.rooms), requireNotNull(d.attempts), requireNotNull(d.reward), requireNotNull(d.startingGold), ContentId(requireNotNull(d.encounter)))
        require(content.offers.all { it.potion in catalog.potions } && content.encounter in catalog.encounters)
        AreaBuilder.town(content)
        content.templates.forEach { t ->
            val mesh = NavMesh(t.polygons.mapIndexed { i, p -> NavPolygon(i, 0, p) }, emptyList())
            require(mesh.polygons.any { it.contains(t.entry) } && mesh.polygons.any { it.contains(t.exit) } && mesh.polygons.any { it.contains(t.spawn) })
        }
        content
    } catch (e: Exception) { throw ContentException("world.json: ${e.message}", e) }
}
