package cloud.vinh.rebirthdungeon.game.grid

import cloud.vinh.rebirthdungeon.game.algorithms.DungeonGenerator
import cloud.vinh.rebirthdungeon.game.algorithms.SeedDerivation
import cloud.vinh.rebirthdungeon.game.content.GenerationProfile
import cloud.vinh.rebirthdungeon.game.events.Cell
import java.util.ArrayDeque

sealed interface FloorGenerationResult {
    data class Success(val floor: GeneratedFloor, val attempt: Int, val enemy: Cell?) : FloorGenerationResult
    data class Failure(val attempts: Int, val reason: String) : FloorGenerationResult
}

/** Each attempt is isolated. No generation failure changes a live floor or RNG stream. */
class FloorGeneration(private val generator: DungeonGenerator) {
    fun generate(seed: Long, floorIndex: Int, profile: GenerationProfile): FloorGenerationResult {
        require(floorIndex >= 0 && profile.maxAttempts in 1..100)
        var reason = "No attempts"
        repeat(profile.maxAttempts) { attempt ->
            try {
                val result = generator.generate(profile.width, profile.height,
                    SeedDerivation.floorAttempt(seed, floorIndex, profile.generatorVersion, attempt))
                val floor = result.floor
                require(floor.width == profile.width && floor.height == profile.height) { "Unexpected dimensions" }
                val spawn = Cell(result.spawnX, result.spawnY)
                val exit = Cell(result.exitX, result.exitY)
                require(spawn != exit && floor.tileAt(spawn.x, spawn.y) == FloorMap.FLOOR) { "Invalid spawn/exit" }
                require(floor.tileAt(exit.x, exit.y) in listOf(FloorMap.FLOOR, FloorMap.EXIT)) { "Exit must be on open terrain" }
                require((0 until floor.width).all { floor.tileAt(it, 0) == FloorMap.WALL && floor.tileAt(it, floor.height - 1) == FloorMap.WALL } &&
                    (0 until floor.height).all { floor.tileAt(0, it) == FloorMap.WALL && floor.tileAt(floor.width - 1, it) == FloorMap.WALL }) { "Generated floor must have a wall boundary" }
                val path = reachablePath(floor, spawn, exit)
                require(path.isNotEmpty()) { "Exit is not reachable" }
                val tiles = floor.copyTiles()
                tiles[exit.y * floor.width + exit.x] = FloorMap.EXIT
                // Keep the demonstration hostile off the authored spawn-to-exit route.
                val reachable = reachableCells(floor, spawn)
                val enemy = (0 until tiles.size).map { Cell(it % floor.width, it / floor.width) }
                    .filter { floor.tileAt(it.x, it.y) == FloorMap.FLOOR && it !in path && it != spawn &&
                        kotlin.math.abs(it.x - spawn.x) + kotlin.math.abs(it.y - spawn.y) >= 6 && it in reachable }
                    .maxByOrNull { kotlin.math.abs(it.x - spawn.x) + kotlin.math.abs(it.y - spawn.y) }
                require(enemy != null) { "No safe enemy spawn outside exit route" }
                return FloorGenerationResult.Success(GeneratedFloor(FloorMap(floor.width, floor.height, tiles), spawn.x, spawn.y, exit.x, exit.y), attempt, enemy)
            } catch (invalid: IllegalArgumentException) { reason = invalid.message ?: "Invalid generated floor" }
        }
        return FloorGenerationResult.Failure(profile.maxAttempts, reason)
    }
    companion object {
        private fun reachableCells(floor: FloorMap, start: Cell): Set<Cell> {
            val visited = HashSet<Cell>(); val queue = ArrayDeque<Cell>(); visited.add(start); queue.add(start)
            while (queue.isNotEmpty()) {
                val cell = queue.removeFirst()
                for (next in listOf(Cell(cell.x, cell.y + 1), Cell(cell.x + 1, cell.y), Cell(cell.x, cell.y - 1), Cell(cell.x - 1, cell.y))) {
                    if (floor.isWalkable(next.x, next.y) && visited.add(next)) queue.add(next)
                }
            }
            return visited
        }
        /** Closed unlocked doors are traversable by opening; locked doors are not. */
        fun reachablePath(floor: FloorMap, from: Cell, to: Cell): List<Cell> {
            if (!floor.isWalkable(from.x, from.y) || !floor.isWalkable(to.x, to.y)) return emptyList()
            val previous = IntArray(floor.width * floor.height) { -1 }
            val start = from.y * floor.width + from.x
            val end = to.y * floor.width + to.x
            val queue = ArrayDeque<Int>()
            queue.add(start); previous[start] = start
            while (queue.isNotEmpty() && previous[end] == -1) {
                val i = queue.removeFirst(); val x = i % floor.width; val y = i / floor.width
                for (cell in listOf(Cell(x, y + 1), Cell(x + 1, y), Cell(x, y - 1), Cell(x - 1, y))) {
                    if (!floor.isWalkable(cell.x, cell.y)) continue
                    val n = cell.y * floor.width + cell.x
                    if (previous[n] == -1) { previous[n] = i; queue.add(n) }
                }
            }
            if (previous[end] == -1) return emptyList()
            val path = ArrayList<Cell>(); var i = end
            while (i != start) { path.add(Cell(i % floor.width, i / floor.width)); i = previous[i] }
            path.add(from); path.reverse(); return path
        }
    }
}
