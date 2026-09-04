package cloud.vinh.rebirthsaga.game.squidsquad;

import cloud.vinh.rebirthsaga.game.algorithms.DungeonGenerator;
import cloud.vinh.rebirthsaga.game.grid.FloorMap;
import cloud.vinh.rebirthsaga.game.grid.GeneratedFloor;
import com.github.tommyettinger.random.AceRandom;
import com.github.yellowstonegames.place.DungeonProcessor;

/** SquidSquad adapter: one seeded {@link DungeonProcessor} attempt per call.
 * Every call constructs its own {@link AceRandom} from the seed, so identical
 * seeds reproduce identical floors and no RNG state leaks between attempts.
 * The library's x-first {@code char[x][y]} grid is translated into the project
 * y-up row-major {@link FloorMap}; only project values escape. */
public final class SquidDungeonGenerator implements DungeonGenerator {

    @Override
    public GeneratedFloor generate(int width, int height, long seed) {
        DungeonProcessor processor = new DungeonProcessor(width, height, new AceRandom(seed));
        char[][] dungeon = processor.generate();
        int mapWidth = dungeon.length;
        int mapHeight = dungeon[0].length;
        int[] tiles = new int[mapWidth * mapHeight];

        int spawnX = -1;
        int spawnY = -1;
        int exitX = -1;
        int exitY = -1;
        int firstWalkableX = -1;
        int firstWalkableY = -1;

        // SquidSquad arrays are x-first; the project grid is row-major by y, so
        // tiles[y * mapWidth + x] receives dungeon[x][y]. Any transposition shows
        // up in the adapter tests as a mirrored floor.
        for(int x = 0; x < mapWidth; x++) {
            for(int y = 0; y < mapHeight; y++) {
                char glyph = dungeon[x][y];
                int tile = FloorMap.FLOOR;
                if(glyph == '#') {
                    tile = FloorMap.WALL;
                } else if(glyph == '+' || glyph == '/') {
                    tile = FloorMap.DOOR;
                } else if(glyph == '>') {
                    tile = FloorMap.EXIT;
                    exitX = x;
                    exitY = y;
                } else if(glyph == '<') {
                    spawnX = x;
                    spawnY = y;
                }
                if(tile != FloorMap.WALL && firstWalkableX < 0) {
                    firstWalkableX = x;
                    firstWalkableY = y;
                }
                tiles[y * mapWidth + x] = tile;
            }
        }

        // Fallbacks when the output carries no stair glyphs: prefer the
        // processor's reported stair coords, then the scan-order extremes.
        if(spawnX < 0) {
            if(processor.stairsUp != null) {
                spawnX = processor.stairsUp.getX();
                spawnY = processor.stairsUp.getY();
            } else {
                spawnX = firstWalkableX;
                spawnY = firstWalkableY;
            }
        }
        if(exitX < 0) {
            if(processor.stairsDown != null) {
                exitX = processor.stairsDown.getX();
                exitY = processor.stairsDown.getY();
            } else {
                exitX = lastWalkableX(tiles, mapWidth, mapHeight);
                exitY = lastWalkableY(tiles, mapWidth, mapHeight);
            }
        }

        // A fallback cell must still be walkable; if it is not, use the scan
        // extremes, which are walkable by construction.
        if(!walkableAt(tiles, mapWidth, mapHeight, spawnX, spawnY)) {
            spawnX = firstWalkableX;
            spawnY = firstWalkableY;
        }
        if(!walkableAt(tiles, mapWidth, mapHeight, exitX, exitY)) {
            exitX = lastWalkableX(tiles, mapWidth, mapHeight);
            exitY = lastWalkableY(tiles, mapWidth, mapHeight);
        }

        return new GeneratedFloor(new FloorMap(mapWidth, mapHeight, tiles), spawnX, spawnY, exitX, exitY);
    }

    private boolean walkableAt(int[] tiles, int width, int height, int x, int y) {
        if(x < 0 || y < 0 || x >= width || y >= height)
            return false;
        int tile = tiles[y * width + x];
        return tile != FloorMap.WALL;
    }

    private int lastWalkableX(int[] tiles, int width, int height) {
        for(int x = width - 1; x >= 0; x--)
            for(int y = height - 1; y >= 0; y--)
                if(walkableAt(tiles, width, height, x, y))
                    return x;
        return -1;
    }

    private int lastWalkableY(int[] tiles, int width, int height) {
        for(int x = width - 1; x >= 0; x--)
            for(int y = height - 1; y >= 0; y--)
                if(walkableAt(tiles, width, height, x, y))
                    return y;
        return -1;
    }
}
