package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.grid.GeneratedFloor
import cloud.vinh.rebirthdungeon.game.squidsquad.SquidDungeonGenerator
import com.github.tommyettinger.random.AceRandom
import com.github.yellowstonegames.place.DungeonProcessor
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Pins the SquidSquad DungeonProcessor adapter: seeded reproduction, the
 * x-first `char[x][y]` to y-up row-major translation (a transposition
 * would mirror the floor), detached project-owned output, and walkable
 * spawn/exit cells. Plain JVM test; no Gdx.app, no OpenGL. */
class SquidDungeonGeneratorTest {

    @Test
    fun identicalSeedReproducesIdenticalFloor() {
        val generator = SquidDungeonGenerator()
        val first = generator.generate(WIDTH, HEIGHT, SEED)
        val second = generator.generate(WIDTH, HEIGHT, SEED)

        assertEquals(first.floor.width, second.floor.width)
        assertEquals(first.floor.height, second.floor.height)
        val a = IntArray(first.floor.width * first.floor.height)
        val b = IntArray(a.size)
        for (x in 0 until first.floor.width)
            for (y in 0 until first.floor.height) {
                a[y * first.floor.width + x] = first.floor.tileAt(x, y)
                b[y * second.floor.width + x] = second.floor.tileAt(x, y)
            }
        assertArrayEquals(a, b)
        assertEquals(first.spawnX, second.spawnX)
        assertEquals(first.spawnY, second.spawnY)
        assertEquals(first.exitX, second.exitX)
        assertEquals(first.exitY, second.exitY)
    }

    @Test
    fun differentSeedProducesDifferentFloor() {
        val first = SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED)
        val second = SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED + 1)

        val width = first.floor.width
        val height = first.floor.height
        var differs = false
        for (x in 0 until width) {
            for (y in 0 until height) {
                differs = first.floor.tileAt(x, y) != second.floor.tileAt(x, y)
                if (differs) break
            }
            if (differs) break
        }
        assertTrue("two distinct seeds produced identical maps over the whole grid", differs)
    }

    @Test
    fun translationMatchesLibraryGridWithoutTransposition() {
        // Rebuild the expected tile grid straight from the library and compare
        // against the adapter output cell by cell. With non-square dimensions a
        // swapped x/y would fail immediately on shape or content.
        val floor = SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED)
        val expected = rawTiles(floor.floor.width, floor.floor.height, SEED)
        val actual = IntArray(expected.size)
        for (x in 0 until floor.floor.width)
            for (y in 0 until floor.floor.height)
                actual[y * floor.floor.width + x] = floor.floor.tileAt(x, y)
        assertArrayEquals(expected, actual)
    }

    @Test
    fun floorIsEnclosedByWalls() {
        val floor = SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED).floor
        for (x in 0 until floor.width) {
            assertEquals(FloorMap.WALL, floor.tileAt(x, 0))
            assertEquals(FloorMap.WALL, floor.tileAt(x, floor.height - 1))
        }
        for (y in 0 until floor.height) {
            assertEquals(FloorMap.WALL, floor.tileAt(0, y))
            assertEquals(FloorMap.WALL, floor.tileAt(floor.width - 1, y))
        }
    }

    @Test
    fun spawnAndExitAreWalkableAndDistinct() {
        val floor = SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED)
        assertTrue("spawn must be walkable", floor.floor.isWalkable(floor.spawnX, floor.spawnY))
        assertTrue("exit must be walkable", floor.floor.isWalkable(floor.exitX, floor.exitY))
        assertFalse("spawn and exit must not share one cell",
            floor.spawnX == floor.exitX && floor.spawnY == floor.exitY)
        assertNotEquals(-1, floor.exitX)
        assertNotEquals(-1, floor.exitY)
    }

    @Test
    fun returnedDataIsDetachedFromTheLibrary() {
        val generator = SquidDungeonGenerator()
        val first = generator.generate(WIDTH, HEIGHT, SEED)
        val second = generator.generate(WIDTH, HEIGHT, SEED)
        // Each call translates into a fresh project-owned FloorMap; no library
        // grid or RNG object escapes, and earlier results are never aliased.
        assertNotEquals(first.floor, second.floor)
        val snapshot = IntArray(first.floor.width * first.floor.height)
        for (x in 0 until first.floor.width)
            for (y in 0 until first.floor.height)
                snapshot[y * first.floor.width + x] = first.floor.tileAt(x, y)
        assertArrayEquals(snapshot, rawTiles(first.floor.width, first.floor.height, SEED))
    }

    private fun rawTiles(width: Int, height: Int, seed: Long): IntArray {
        val processor = DungeonProcessor(width, height, AceRandom(seed))
        val dungeon = processor.generate()
        assertEquals("adapter must pass requested dimensions through to the processor",
            width, dungeon.size)
        val tiles = IntArray(width * height)
        for (x in 0 until width)
            for (y in 0 until height)
                tiles[y * width + x] = expectedTile(dungeon[x][y])
        return tiles
    }

    companion object {
        private const val WIDTH = 48
        private const val HEIGHT = 27
        private const val SEED = 0x5DEECE66DL

        private fun expectedTile(glyph: Char): Int = when (glyph) {
            '#' -> FloorMap.WALL
            '+', '/' -> FloorMap.DOOR
            '>' -> FloorMap.EXIT
            else -> FloorMap.FLOOR
        }
    }
}
