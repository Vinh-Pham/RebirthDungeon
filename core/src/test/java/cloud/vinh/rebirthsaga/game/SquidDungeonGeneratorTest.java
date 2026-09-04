package cloud.vinh.rebirthsaga.game;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import cloud.vinh.rebirthsaga.game.grid.FloorMap;
import cloud.vinh.rebirthsaga.game.grid.GeneratedFloor;
import cloud.vinh.rebirthsaga.game.squidsquad.SquidDungeonGenerator;
import com.github.tommyettinger.random.AceRandom;
import com.github.yellowstonegames.place.DungeonProcessor;
import org.junit.Test;

/** Pins the SquidSquad DungeonProcessor adapter: seeded reproduction, the
 * x-first {@code char[x][y]} to y-up row-major translation (a transposition
 * would mirror the floor), detached project-owned output, and walkable
 * spawn/exit cells. Plain JVM test; no Gdx.app, no OpenGL. */
public class SquidDungeonGeneratorTest {
    private static final int WIDTH = 48;
    private static final int HEIGHT = 27;
    private static final long SEED = 0x5DEECE66DL;

    private static int expectedTile(char glyph) {
        if(glyph == '#')
            return FloorMap.WALL;
        if(glyph == '+' || glyph == '/')
            return FloorMap.DOOR;
        if(glyph == '>')
            return FloorMap.EXIT;
        return FloorMap.FLOOR;
    }

    private static int[] rawTiles(int width, int height, long seed) {
        DungeonProcessor processor = new DungeonProcessor(width, height, new AceRandom(seed));
        char[][] dungeon = processor.generate();
        assertEquals("adapter must pass requested dimensions through to the processor",
                width, dungeon.length);
        int[] tiles = new int[width * height];
        for(int x = 0; x < width; x++)
            for(int y = 0; y < height; y++)
                tiles[y * width + x] = expectedTile(dungeon[x][y]);
        return tiles;
    }

    @Test
    public void identicalSeedReproducesIdenticalFloor() {
        SquidDungeonGenerator generator = new SquidDungeonGenerator();
        GeneratedFloor first = generator.generate(WIDTH, HEIGHT, SEED);
        GeneratedFloor second = generator.generate(WIDTH, HEIGHT, SEED);

        assertEquals(first.floor().width(), second.floor().width());
        assertEquals(first.floor().height(), second.floor().height());
        int[] a = new int[first.floor().width() * first.floor().height()];
        int[] b = new int[a.length];
        for(int x = 0; x < first.floor().width(); x++)
            for(int y = 0; y < first.floor().height(); y++) {
                a[y * first.floor().width() + x] = first.floor().tileAt(x, y);
                b[y * second.floor().width() + x] = second.floor().tileAt(x, y);
            }
        assertArrayEquals(a, b);
        assertEquals(first.spawnX(), second.spawnX());
        assertEquals(first.spawnY(), second.spawnY());
        assertEquals(first.exitX(), second.exitX());
        assertEquals(first.exitY(), second.exitY());
    }

    @Test
    public void differentSeedProducesDifferentFloor() {
        GeneratedFloor first = new SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED);
        GeneratedFloor second = new SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED + 1);

        int width = first.floor().width();
        int height = first.floor().height();
        boolean differs = false;
        for(int x = 0; x < width && !differs; x++)
            for(int y = 0; y < height && !differs; y++)
                differs = first.floor().tileAt(x, y) != second.floor().tileAt(x, y);
        assertTrue("two distinct seeds produced identical maps over the whole grid", differs);
    }

    @Test
    public void translationMatchesLibraryGridWithoutTransposition() {
        // Rebuild the expected tile grid straight from the library and compare
        // against the adapter output cell by cell. With non-square dimensions a
        // swapped x/y would fail immediately on shape or content.
        GeneratedFloor floor = new SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED);
        int[] expected = rawTiles(floor.floor().width(), floor.floor().height(), SEED);
        int[] actual = new int[expected.length];
        for(int x = 0; x < floor.floor().width(); x++)
            for(int y = 0; y < floor.floor().height(); y++)
                actual[y * floor.floor().width() + x] = floor.floor().tileAt(x, y);
        assertArrayEquals(expected, actual);
    }

    @Test
    public void floorIsEnclosedByWalls() {
        FloorMap floor = new SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED).floor();
        for(int x = 0; x < floor.width(); x++) {
            assertEquals(FloorMap.WALL, floor.tileAt(x, 0));
            assertEquals(FloorMap.WALL, floor.tileAt(x, floor.height() - 1));
        }
        for(int y = 0; y < floor.height(); y++) {
            assertEquals(FloorMap.WALL, floor.tileAt(0, y));
            assertEquals(FloorMap.WALL, floor.tileAt(floor.width() - 1, y));
        }
    }

    @Test
    public void spawnAndExitAreWalkableAndDistinct() {
        GeneratedFloor floor = new SquidDungeonGenerator().generate(WIDTH, HEIGHT, SEED);
        assertTrue("spawn must be walkable", floor.floor().isWalkable(floor.spawnX(), floor.spawnY()));
        assertTrue("exit must be walkable", floor.floor().isWalkable(floor.exitX(), floor.exitY()));
        assertFalse("spawn and exit must not share one cell",
                floor.spawnX() == floor.exitX() && floor.spawnY() == floor.exitY());
        assertNotEquals(-1, floor.exitX());
        assertNotEquals(-1, floor.exitY());
    }

    @Test
    public void returnedDataIsDetachedFromTheLibrary() {
        SquidDungeonGenerator generator = new SquidDungeonGenerator();
        GeneratedFloor first = generator.generate(WIDTH, HEIGHT, SEED);
        GeneratedFloor second = generator.generate(WIDTH, HEIGHT, SEED);
        // Each call translates into a fresh project-owned FloorMap; no library
        // grid or RNG object escapes, and earlier results are never aliased.
        assertNotEquals(first.floor(), second.floor());
        int[] snapshot = new int[first.floor().width() * first.floor().height()];
        for(int x = 0; x < first.floor().width(); x++)
            for(int y = 0; y < first.floor().height(); y++)
                snapshot[y * first.floor().width() + x] = first.floor().tileAt(x, y);
        assertArrayEquals(snapshot, rawTiles(first.floor().width(), first.floor().height(), SEED));
    }
}
