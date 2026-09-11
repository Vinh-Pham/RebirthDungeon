package cloud.vinh.rebirthdungeon.game.exploration

import cloud.vinh.rebirthdungeon.game.content.frozenList

sealed interface ExplorationCommand
data class MoveTo(val destination: WorldPoint) : ExplorationCommand
data class SetMoveDirection(val x: Int, val y: Int) : ExplorationCommand
data object StopMovement : ExplorationCommand
data class InteractWith(val id: String) : ExplorationCommand
data class TimedExplorationCommand(val tick: Long, val sequence: Long, val command: ExplorationCommand)
class ExplorationRestore(val tick: Long, val position: WorldPoint, val direction: WorldPoint, val remainder: Int,
    path: List<WorldPoint>, discovered: List<Int>, defeated: List<String>, val interaction: String?, val sequence: Long) {
    val path = frozenList(path); val discovered = frozenList(discovered); val defeated = frozenList(defeated)
}
class ExplorationObservation(val tick: Long, val position: WorldPoint, val previous: WorldPoint, val moving: Boolean,
    polygons: List<NavPolygon>, objects: List<WorldObject>, val room: Int, val town: Boolean, frontiers: List<WorldPoint>) {
    val polygons = frozenList(polygons); val objects = frozenList(objects); val frontiers = frozenList(frontiers)
}
class ExplorationSimulation(val area: ExplorationArea, state: ExplorationRestore? = null) {
    var position = state?.position ?: area.spawn; private set
    private var previous = position
    var tick = state?.tick ?: 0; private set
    private var sequence = state?.sequence ?: 0
    private var direction = state?.direction ?: WorldPoint(0, 0)
    private var remainder = state?.remainder ?: 0
    private val path = ArrayList(state?.path ?: emptyList())
    private val discovered = sortedSetOf<Int>().apply { addAll(state?.discovered ?: listOf(0)) }
    private val defeated = sortedSetOf<String>().apply { addAll(state?.defeated ?: emptyList()) }
    private var interaction = state?.interaction
    var reachedInteraction: WorldObject? = null; private set
    var encounter: WorldObject? = null; private set
    var message: String? = null; private set
    private val room get() = area.navigation.polygon(position, area.rooms)?.room ?: error("Player outside navigation")
    init {
        require(tick >= 0 && sequence >= 0 && remainder in 0..59)
        require(direction.x in -1..1 && direction.y in -1..1 && discovered.all { it in area.rooms })
        require(room in discovered && defeated.all { id -> area.objects.any { it.id == id && it.service == Service.ENEMY } })
        require((listOf(position) + path).zipWithNext().all { area.navigation.clear(it.first, it.second, allowedRooms()) })
        require(interaction == null || area.objects.any { it.id == interaction })
    }
    private fun allowedRooms(): Set<Int> = discovered // Frontier extension is a doorway point, not an undiscovered room route.
    private fun frontierPath(target: WorldPoint): List<WorldPoint>? {
        val candidate = area.mesh.portals.filter { p ->
            val a = area.mesh.polygons.single { it.id == p.a }.room; val b = area.mesh.polygons.single { it.id == p.b }.room
            (a in discovered) != (b in discovered)
        }.minByOrNull { squared(target, WorldPoint((it.left.x + it.right.x) / 2, (it.left.y + it.right.y) / 2)) } ?: return null
        val mid = WorldPoint((candidate.left.x + candidate.right.x) / 2, (candidate.left.y + candidate.right.y) / 2)
        if (squared(target, mid) > (12L * WorldPoint.SCALE) * (12L * WorldPoint.SCALE)) return null
        return area.navigation.path(position, mid, discovered)
    }
    fun submit(input: TimedExplorationCommand): Boolean {
        if (input.tick != tick || input.sequence != sequence || encounter != null || reachedInteraction != null) return false
        message = null
        val command = input.command
        when (command) {
            StopMovement -> stop()
            is SetMoveDirection -> {
                if (command.x !in -1..1 || command.y !in -1..1) return false
                stop(); direction = WorldPoint(command.x, command.y)
            }
            is MoveTo -> {
                val goal = area.navigation.destination(position, command.destination, discovered)
                val route = goal?.let { area.navigation.path(position, it, discovered) } ?: frontierPath(command.destination)
                if (route == null) { message = "That destination is unreachable."; return false }
                stop(); path.addAll(route)
            }
            is InteractWith -> {
                val obj = observe().objects.singleOrNull { it.id == command.id } ?: return false
                val route = area.navigation.path(position, obj.approach, discovered) ?: return false
                stop(); path.addAll(route); interaction = obj.id
            }
        }
        sequence++; return true
    }
    fun submit(command: ExplorationCommand) = submit(TimedExplorationCommand(tick, sequence, command))
    fun stop() { path.clear(); direction = WorldPoint(0, 0); interaction = null; previous = position }
    fun dismiss() { reachedInteraction = null; stop() }
    fun defeated(id: String) { require(area.objects.any { it.id == id }); defeated.add(id); encounter = null; stop() }
    fun allDefeated() = area.objects.filter { it.service == Service.ENEMY }.all { it.id in defeated }
    fun step() {
        if (encounter != null || reachedInteraction != null) return
        previous = position; tick++
        remainder += 72 * WorldPoint.SCALE
        var budget = remainder / 60; remainder %= 60
        if (direction != WorldPoint(0, 0)) {
            val scale = if (direction.x != 0 && direction.y != 0) 181 else 256
            val to = WorldPoint(position.x + direction.x * budget * scale / 256, position.y + direction.y * budget * scale / 256)
            if (area.navigation.clear(position, to, area.rooms)) position = to
        } else while (path.isNotEmpty() && budget > 0) {
            val target = path.first(); val length = integerRoot(squared(position, target)).toInt()
            val to = if (length <= budget) target else WorldPoint(position.x + ((target.x - position.x).toLong() * budget / length).toInt(), position.y + ((target.y - position.y).toLong() * budget / length).toInt())
            if (!area.navigation.clear(position, to, allowedRooms())) { stop(); break }
            position = to
            if (length <= budget) { path.removeAt(0); budget -= length } else budget = 0
        }
        // Crossing/reaching a doorway reveals its adjoining room, enabling the next click into it.
        area.mesh.polygons.filter { it.contains(position) }.forEach { discovered.add(it.room) }
        val visible = observe().objects
        encounter = visible.filter { it.service == Service.ENEMY && squared(it.position, position) <= it.radius.toLong() * it.radius &&
            area.navigation.clear(position, it.position, area.rooms) }.sortedWith(compareBy({ squared(it.position, position) }, { it.id })).firstOrNull()
        if (encounter != null) { stop(); return }
        val obj = visible.singleOrNull { it.id == interaction }
        if (obj != null && squared(position, obj.approach) <= 4L * WorldPoint.SCALE * 4 * WorldPoint.SCALE) {
            reachedInteraction = obj; stop()
        }
    }
    fun observe(): ExplorationObservation {
        val current = room
        return ExplorationObservation(tick, position, previous, path.isNotEmpty() || direction != WorldPoint(0, 0),
            area.mesh.polygons.filter { it.room in discovered }, area.objects.filter { it.id !in defeated && it.room == current &&
                (it.service != Service.ENEMY || area.navigation.clear(position, it.position, setOf(current))) }, current, area.town, area.mesh.portals.filter { p ->
                val a = area.mesh.polygons.single { it.id == p.a }.room; val b = area.mesh.polygons.single { it.id == p.b }.room
                (a in discovered) != (b in discovered)
            }.map { WorldPoint((it.left.x + it.right.x) / 2, (it.left.y + it.right.y) / 2) })
    }
    fun restoreExport() = ExplorationRestore(tick, position, direction, remainder, path, discovered.toList(), defeated.toList(), interaction, sequence)
}
