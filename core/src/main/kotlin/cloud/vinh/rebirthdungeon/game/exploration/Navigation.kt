package cloud.vinh.rebirthdungeon.game.exploration

import cloud.vinh.rebirthdungeon.game.content.frozenList
import java.math.BigInteger
import java.util.PriorityQueue

/** 256 subpixels per world pixel. This precision is unrelated to navigation topology. */
data class WorldPoint(val x: Int, val y: Int) {
    init { require(x in -2_000_000..2_000_000 && y in -2_000_000..2_000_000) }
    operator fun plus(p: WorldPoint) = WorldPoint(x + p.x, y + p.y)
    companion object { const val SCALE = 256; fun pixels(x: Int, y: Int) = WorldPoint(x * SCALE, y * SCALE) }
}
fun cross(a: WorldPoint, b: WorldPoint, c: WorldPoint): Long =
    (b.x - a.x).toLong() * (c.y - a.y) - (b.y - a.y).toLong() * (c.x - a.x)
fun squared(a: WorldPoint, b: WorldPoint): Long = (a.x - b.x).toLong() * (a.x - b.x) + (a.y - b.y).toLong() * (a.y - b.y)
fun integerRoot(n: Long): Long {
    require(n >= 0)
    var lo = 0L; var hi = minOf(n, 4_000_000_000L) + 1
    while (lo + 1 < hi) { val mid = (lo + hi) / 2; if (mid <= n / mid) lo = mid else hi = mid }
    return lo
}
class NavPolygon(val id: Int, val room: Int, vertices: List<WorldPoint>) {
    val vertices = frozenList(vertices)
    val center = WorldPoint(vertices.sumOf { it.x.toLong() }.div(vertices.size).toInt(), vertices.sumOf { it.y.toLong() }.div(vertices.size).toInt())
    init {
        require(id >= 0 && room >= 0 && vertices.size in 3..16 && vertices.distinct().size == vertices.size)
        require(vertices.indices.all { cross(vertices[it], vertices[(it + 1) % vertices.size], vertices[(it + 2) % vertices.size]) > 0 }) { "Navigation polygons must be strictly convex and counterclockwise" }
    }
    fun contains(p: WorldPoint) = vertices.indices.all { cross(vertices[it], vertices[(it + 1) % vertices.size], p) >= 0 }
}
data class Portal(val a: Int, val b: Int, val left: WorldPoint, val right: WorldPoint)
class NavMesh(polygons: List<NavPolygon>, portals: List<Portal>) {
    val polygons = frozenList(polygons.sortedBy { it.id })
    val portals = frozenList(portals.sortedWith(compareBy({ minOf(it.a, it.b) }, { maxOf(it.a, it.b) })))
    init {
        require(polygons.isNotEmpty() && polygons.map { it.id }.distinct().size == polygons.size)
        require(portals.map { setOf(it.a, it.b) }.distinct().size == portals.size)
        portals.forEach { p ->
            require(p.a != p.b && p.left != p.right)
            listOf(p.a, p.b).forEach { id ->
                val polygon = polygons.single { it.id == id }
                require(polygon.contains(p.left) && polygon.contains(p.right))
                require(polygon.vertices.indices.any { i ->
                    cross(polygon.vertices[i], polygon.vertices[(i + 1) % polygon.vertices.size], p.left) == 0L &&
                        cross(polygon.vertices[i], polygon.vertices[(i + 1) % polygon.vertices.size], p.right) == 0L
                }) { "Portal must lie on a polygon edge" }
            }
        }
    }
}
fun interface NavigationQuery { fun path(from: WorldPoint, to: WorldPoint, rooms: Set<Int>): List<WorldPoint>? }

/** Exact rational clipping: no floating point predicates or sampled collision tests. */
private data class Fraction(val n: BigInteger, val d: BigInteger) : Comparable<Fraction> {
    override fun compareTo(other: Fraction) = (n * other.d).compareTo(other.n * d)
    companion object {
        val ZERO = Fraction(BigInteger.ZERO, BigInteger.ONE); val ONE = Fraction(BigInteger.ONE, BigInteger.ONE)
        fun of(n: Long, d: Long) = if (d < 0) Fraction(BigInteger.valueOf(-n), BigInteger.valueOf(-d)) else Fraction(BigInteger.valueOf(n), BigInteger.valueOf(d))
    }
}
class PolygonNavigation(val mesh: NavMesh) : NavigationQuery {
    fun polygon(p: WorldPoint, rooms: Set<Int>) = mesh.polygons.firstOrNull { it.room in rooms && it.contains(p) }
    fun clear(from: WorldPoint, to: WorldPoint, rooms: Set<Int>): Boolean {
        val intervals = mesh.polygons.filter { it.room in rooms }.mapNotNull { p ->
            var low = Fraction.ZERO; var high = Fraction.ONE
            for (i in p.vertices.indices) {
                val a = p.vertices[i]; val b = p.vertices[(i + 1) % p.vertices.size]
                val start = cross(a, b, from); val end = cross(a, b, to); val slope = end - start
                if (slope == 0L) { if (start < 0) return@mapNotNull null }
                else {
                    val t = Fraction.of(-start, slope)
                    if (slope > 0) low = maxOf(low, t) else high = minOf(high, t)
                }
                if (low > high) return@mapNotNull null
            }
            low to high
        }.sortedWith(compareBy({ it.first }, { it.second }))
        var covered = Fraction.ZERO
        for ((start, end) in intervals) { if (start > covered) return false; covered = maxOf(covered, end) }
        return covered >= Fraction.ONE
    }
    override fun path(from: WorldPoint, to: WorldPoint, rooms: Set<Int>): List<WorldPoint>? {
        val start = polygon(from, rooms) ?: return null
        val goal = polygon(to, rooms) ?: return null
        if (clear(from, to, rooms)) return listOf(to)
        data class Node(val id: Int, val g: Long, val f: Long)
        val byId = mesh.polygons.associateBy { it.id }
        val queue = PriorityQueue<Node>(compareBy({ it.f }, { it.id }, { it.g }))
        val costs = hashMapOf(start.id to 0L); val parent = HashMap<Int, Pair<Int, Portal>>()
        queue.add(Node(start.id, 0, 0))
        while (queue.isNotEmpty()) {
            val n = queue.remove(); if (costs[n.id] != n.g) continue
            if (n.id == goal.id) {
                val portals = ArrayList<Pair<WorldPoint, WorldPoint>>(); var id = goal.id
                while (id != start.id) {
                    val (previous, portal) = parent.getValue(id)
                    val a = byId.getValue(previous).center; val b = byId.getValue(id).center
                    portals.add(if (cross(a, b, portal.left) > cross(a, b, portal.right)) portal.left to portal.right else portal.right to portal.left)
                    id = previous
                }
                portals.reverse()
                val result = funnel(from, to, portals)
                check((listOf(from) + result).zipWithNext().all { clear(it.first, it.second, rooms) }) { "Invalid funnel corridor" }
                return result
            }
            for (p in mesh.portals.filter { it.a == n.id || it.b == n.id }) {
                val next = if (p.a == n.id) p.b else p.a
                if (byId.getValue(next).room !in rooms) continue
                val g = n.g + integerRoot(squared(byId.getValue(n.id).center, byId.getValue(next).center)) + 1
                if (g < (costs[next] ?: Long.MAX_VALUE)) {
                    costs[next] = g; parent[next] = n.id to p
                    // Rounded-up edge costs keep the rounded-down Euclidean heuristic admissible.
                    val heuristic = integerRoot(squared(byId.getValue(next).center, goal.center))
                    queue.add(Node(next, g, g + heuristic))
                }
            }
        }
        return null
    }
    fun destination(from: WorldPoint, requested: WorldPoint, rooms: Set<Int>, tolerance: Int = 4 * WorldPoint.SCALE): WorldPoint? {
        if (polygon(requested, rooms) != null) return requested.takeIf { path(from, it, rooms) != null }
        // Only project onto the boundary visible from the origin; never snap into another room through a wall.
        val candidates = mesh.polygons.filter { it.room in rooms }.flatMap { p -> p.vertices.indices.map { i ->
            val a = p.vertices[i]; val b = p.vertices[(i + 1) % p.vertices.size]
            val length = squared(a, b)
            val dot = ((requested.x - a.x).toLong() * (b.x - a.x) + (requested.y - a.y).toLong() * (b.y - a.y)).coerceIn(0, length)
            WorldPoint(a.x + (BigInteger.valueOf((b.x - a.x).toLong()) * BigInteger.valueOf(dot) / BigInteger.valueOf(length)).toInt(), a.y + (BigInteger.valueOf((b.y - a.y).toLong()) * BigInteger.valueOf(dot) / BigInteger.valueOf(length)).toInt())
        } }.distinct().sortedWith(compareBy({ squared(it, requested) }, { it.x }, { it.y }))
        return candidates.firstOrNull { squared(it, requested) <= tolerance.toLong() * tolerance && clear(from, it, rooms) }
    }
}

/** Portal funnel with counterclockwise geometric predicates. */
internal fun funnel(start: WorldPoint, end: WorldPoint, corridor: List<Pair<WorldPoint, WorldPoint>>): List<WorldPoint> {
    val portals = listOf(start to start) + corridor + listOf(end to end)
    val result = ArrayList<WorldPoint>(); var apex = start; var left = start; var right = start
    var apexIndex = 0; var leftIndex = 0; var rightIndex = 0; var i = 1
    while (i < portals.size) {
        val (newLeft, newRight) = portals[i]
        if (cross(apex, right, newRight) >= 0) {
            if (apex == right || cross(apex, left, newRight) < 0) { right = newRight; rightIndex = i }
            else {
                result.add(left); apex = left; apexIndex = leftIndex
                left = apex; right = apex; leftIndex = apexIndex; rightIndex = apexIndex; i = apexIndex + 1; continue
            }
        }
        if (cross(apex, left, newLeft) <= 0) {
            if (apex == left || cross(apex, right, newLeft) > 0) { left = newLeft; leftIndex = i }
            else {
                result.add(right); apex = right; apexIndex = rightIndex
                left = apex; right = apex; leftIndex = apexIndex; rightIndex = apexIndex; i = apexIndex + 1; continue
            }
        }
        i++
    }
    if (result.lastOrNull() != end) result.add(end)
    return result
}
