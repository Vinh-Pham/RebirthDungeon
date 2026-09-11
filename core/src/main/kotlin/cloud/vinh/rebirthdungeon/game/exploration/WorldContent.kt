package cloud.vinh.rebirthdungeon.game.exploration

import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import cloud.vinh.rebirthdungeon.game.algorithms.RandomSource

enum class Service { TALK, SHOP, RECOVER, DUNGEON, EXIT, ENEMY }
data class WorldObject(val id: String, val name: String, val position: WorldPoint, val approach: WorldPoint,
    val room: Int, val service: Service, val text: String, val encounter: ContentId? = null, val radius: Int = 24 * WorldPoint.SCALE)
class RoomTemplate(val id: String, polygons: List<List<WorldPoint>>, val entry: WorldPoint, val exit: WorldPoint, val spawn: WorldPoint) {
    val polygons = frozenList(polygons.map(::frozenList))
    init { require(id.isNotBlank() && polygons.isNotEmpty()) }
}
data class ShopOffer(val potion: ContentId, val price: Int, val capacity: Int)
class WorldContent(val version: Int, val town: RoomTemplate, objects: List<WorldObject>, templates: List<RoomTemplate>,
    offers: List<ShopOffer>, val rooms: Int, val attempts: Int, val reward: Int, val startingGold: Int, val encounter: ContentId) {
    val objects = frozenList(objects); val templates = frozenList(templates); val offers = frozenList(offers)
    init {
        require(version == 1 && templates.isNotEmpty() && rooms in 2..12 && attempts in 1..100)
        require(reward in 1..10000 && startingGold in 0..100000 && offers.isNotEmpty())
        require(offers.map { it.potion }.distinct().size == offers.size && offers.all { it.price in 1..10000 && it.capacity in 1..99 })
        require(objects.map { it.id }.distinct().size == objects.size)
        require(templates.map { it.id }.distinct().size == templates.size)
    }
}
data class RoomPlacement(val template: String, val offset: WorldPoint, val room: Int)
class ExplorationArea(val id: String, val town: Boolean, val mesh: NavMesh, val spawn: WorldPoint,
    objects: List<WorldObject>, placements: List<RoomPlacement>) {
    val objects = frozenList(objects); val placements = frozenList(placements)
    val navigation = PolygonNavigation(mesh)
    val rooms = mesh.polygons.map { it.room }.toSet()
    init {
        require(navigation.polygon(spawn, rooms) != null)
        require(objects.map { it.id }.distinct().size == objects.size)
        objects.forEach { require(navigation.path(spawn, it.approach, rooms) != null) { "Unreachable object ${it.id}" } }
    }
}
object AreaBuilder {
    private fun portals(polygons: List<NavPolygon>): List<Portal> {
        val result = ArrayList<Portal>()
        for (i in polygons.indices) for (j in i + 1 until polygons.size) {
            val a = polygons[i]; val b = polygons[j]
            val common = ArrayList<WorldPoint>()
            for (u in a.vertices.indices) for (v in b.vertices.indices) {
                val p = a.vertices[u]; val q = a.vertices[(u + 1) % a.vertices.size]
                val r = b.vertices[v]; val s = b.vertices[(v + 1) % b.vertices.size]
                if (cross(p, q, r) != 0L || cross(p, q, s) != 0L) continue
                common.addAll(listOf(p, q, r, s).filter { a.contains(it) && b.contains(it) })
            }
            val points = common.distinct().sortedWith(compareBy({ it.x }, { it.y }))
            if (points.size >= 2 && points.first() != points.last()) result.add(Portal(a.id, b.id, points.first(), points.last()))
        }
        return result
    }
    private fun overlap(a: NavPolygon, b: NavPolygon): Boolean {
        fun separated(p: NavPolygon, q: NavPolygon) = p.vertices.indices.any { i ->
            q.vertices.all { cross(p.vertices[i], p.vertices[(i + 1) % p.vertices.size], it) <= 0 }
        }
        return !separated(a, b) && !separated(b, a)
    }
    fun build(content: WorldContent, placements: List<RoomPlacement>, town: Boolean): ExplorationArea {
        require(placements.size == if (town) 1 else content.rooms)
        require(placements.map { it.room } == placements.indices.toList())
        val polygons = ArrayList<NavPolygon>(); val objects = ArrayList<WorldObject>()
        var spawn: WorldPoint? = null
        placements.forEach { placement ->
            val template = if (town) content.town else content.templates.single { it.id == placement.template }
            require(template.id == placement.template)
            template.polygons.forEach { points -> polygons.add(NavPolygon(polygons.size, placement.room, points.map { it + placement.offset })) }
            if (spawn == null) spawn = template.spawn + placement.offset
            if (!town && placement.room > 0) {
                val point = template.spawn + placement.offset
                objects.add(WorldObject("encounter.${placement.room}", "Dungeon sentinel", point, point, placement.room, Service.ENEMY,
                    "A hostile sentinel guards this room.", content.encounter))
            }
            if (!town && placement == placements.last()) {
                val point = WorldPoint(template.exit.x - 12 * WorldPoint.SCALE, template.exit.y) + placement.offset
                objects.add(WorldObject("exit", "Return to town", point, point, placement.room, Service.EXIT, "Defeat the sentinels to leave with your rewards."))
            }
        }
        for (i in polygons.indices) for (j in i + 1 until polygons.size) require(!overlap(polygons[i], polygons[j])) { "Overlapping room geometry" }
        val mesh = NavMesh(polygons, portals(polygons))
        val area = ExplorationArea(if (town) "town" else "dungeon", town, mesh, checkNotNull(spawn), if (town) content.objects else objects, placements)
        require(mesh.polygons.all { area.navigation.path(area.spawn, it.center, area.rooms) != null }) { "Disconnected room graph" }
        return area
    }
    fun town(content: WorldContent) = build(content, listOf(RoomPlacement(content.town.id, WorldPoint(0, 0), 0)), true)
    fun dungeon(content: WorldContent, random: RandomSource): ExplorationArea {
        repeat(content.attempts) {
            val placements = ArrayList<RoomPlacement>(); var connector: WorldPoint? = null
            repeat(content.rooms) { room ->
                val template = content.templates[random.nextInt(content.templates.size)]
                val offset = connector?.let { WorldPoint(it.x - template.entry.x, it.y - template.entry.y) } ?: WorldPoint(0, 0)
                placements.add(RoomPlacement(template.id, offset, room)); connector = template.exit + offset
            }
            try { return build(content, placements, false) } catch (_: IllegalArgumentException) { /* bounded regeneration */ }
        }
        error("Could not assemble a connected dungeon after ${content.attempts} attempts")
    }
}
