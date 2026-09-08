package cloud.vinh.rebirthdungeon.game.squidsquad

import cloud.vinh.rebirthdungeon.game.algorithms.DungeonGenerator
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.grid.GeneratedFloor
import com.github.tommyettinger.random.AceRandom
import com.github.yellowstonegames.place.DungeonProcessor

/** SquidSquad adapter: one seeded [DungeonProcessor] attempt per call.
 * Every call constructs its own [AceRandom] from the seed, so identical
 * seeds reproduce identical floors and no RNG state leaks between attempts.
 * The library's x-first `char[x][y]` grid is translated into the project
 * y-up row-major [FloorMap]; only project values escape. */
class SquidDungeonGenerator : DungeonGenerator {

    override fun generate(width: Int, height: Int, seed: Long): GeneratedFloor {
        val processor = DungeonProcessor(width, height, AceRandom(seed))
        val dungeon = processor.generate()
        val mapWidth = dungeon.size
        val mapHeight = dungeon[0].size
        val tiles = IntArray(mapWidth * mapHeight)

        var spawnX = -1
        var spawnY = -1
        var exitX = -1
        var exitY = -1
        var firstWalkableX = -1
        var firstWalkableY = -1

        // SquidSquad arrays are x-first; the project grid is row-major by y, so
        // tiles[y * mapWidth + x] receives dungeon[x][y]. Any transposition shows
        // up in the adapter tests as a mirrored floor.
        for (x in 0 until mapWidth) {
            for (y in 0 until mapHeight) {
                val glyph = dungeon[x][y]
                var tile = FloorMap.FLOOR
                if (glyph == '#') {
                    tile = FloorMap.WALL
                } else if (glyph == '+' || glyph == '/') {
                    tile = if (glyph == '/') FloorMap.OPEN_DOOR else FloorMap.DOOR
                } else if (glyph == '>') {
                    tile = FloorMap.EXIT
                    exitX = x
                    exitY = y
                } else if (glyph == '<') {
                    spawnX = x
                    spawnY = y
                }
                if (tile != FloorMap.WALL && firstWalkableX < 0) {
                    firstWalkableX = x
                    firstWalkableY = y
                }
                tiles[y * mapWidth + x] = tile
            }
        }

        // Fallbacks when the output carries no stair glyphs: prefer the
        // processor's reported stair coords, then the scan-order extremes.
        if (spawnX < 0) {
            val stairsUp = processor.stairsUp
            if (stairsUp != null) {
                // Coord stores short fields; the project grid is int-based.
                spawnX = stairsUp.x.toInt()
                spawnY = stairsUp.y.toInt()
            } else {
                spawnX = firstWalkableX
                spawnY = firstWalkableY
            }
        }
        if (exitX < 0) {
            val stairsDown = processor.stairsDown
            if (stairsDown != null) {
                exitX = stairsDown.x.toInt()
                exitY = stairsDown.y.toInt()
            } else {
                exitX = lastWalkableX(tiles, mapWidth, mapHeight)
                exitY = lastWalkableY(tiles, mapWidth, mapHeight)
            }
        }

        // A fallback cell must still be walkable; if it is not, use the scan
        // extremes, which are walkable by construction.
        if (!walkableAt(tiles, mapWidth, mapHeight, spawnX, spawnY)) {
            spawnX = firstWalkableX
            spawnY = firstWalkableY
        }
        if (!walkableAt(tiles, mapWidth, mapHeight, exitX, exitY)) {
            exitX = lastWalkableX(tiles, mapWidth, mapHeight)
            exitY = lastWalkableY(tiles, mapWidth, mapHeight)
        }

        return GeneratedFloor(FloorMap(mapWidth, mapHeight, tiles), spawnX, spawnY, exitX, exitY)
    }

    private fun walkableAt(tiles: IntArray, width: Int, height: Int, x: Int, y: Int): Boolean {
        if (x < 0 || y < 0 || x >= width || y >= height)
            return false
        return tiles[y * width + x] != FloorMap.WALL
    }

    private fun lastWalkableX(tiles: IntArray, width: Int, height: Int): Int {
        for (x in width - 1 downTo 0)
            for (y in height - 1 downTo 0)
                if (walkableAt(tiles, width, height, x, y))
                    return x
        return -1
    }

    private fun lastWalkableY(tiles: IntArray, width: Int, height: Int): Int {
        for (x in width - 1 downTo 0)
            for (y in height - 1 downTo 0)
                if (walkableAt(tiles, width, height, x, y))
                    return y
        return -1
    }
}
