package cloud.vinh.rebirthdungeon.bootstrap

import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.grid.*

/** Explicit developer-only fixture; never selected by normal navigation or shipped content. */
object CombatAcceptance {
    val enabled get() = System.getenv("REBIRTH_COMBAT_ARENA") == "1"
    fun floor(): FloorGenerationResult.Success? {
        if (!enabled) return null
        val width = 8; val height = 5
        val tiles = IntArray(width * height) { i ->
            if (i % width == 0 || i % width == width - 1 || i / width == 0 || i / width == height - 1) FloorMap.WALL else FloorMap.FLOOR
        }
        tiles[2 * width + 6] = FloorMap.EXIT
        return FloorGenerationResult.Success(GeneratedFloor(FloorMap(width, height, tiles), 2, 2, 6, 2), 0, Cell(3, 2))
    }
}
