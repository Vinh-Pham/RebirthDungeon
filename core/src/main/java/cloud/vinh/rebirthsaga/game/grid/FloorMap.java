package cloud.vinh.rebirthsaga.game.grid;

/** Project-owned floor data translated from a generator's output. Storage is a
 * flattened row-major {@code int[]} with {@code y = 0} at the bottom (y-up);
 * cell {@code (x, y)} lives at index {@code y * width + x}. Static terrain such
 * as floors and walls lives here, not in the ECS. Immutable, so a detached
 * result can be shared between worker and render thread. */
public final class FloorMap {
    public static final int WALL = 0;
    public static final int FLOOR = 1;
    public static final int DOOR = 2;
    public static final int EXIT = 3;

    private final int width;
    private final int height;
    private final int[] tiles;

    public FloorMap(int width, int height, int[] tilesRowMajorYUp) {
        if(width < 1 || height < 1)
            throw new IllegalArgumentException("FloorMap needs positive dimensions, got " + width + "x" + height);
        if(tilesRowMajorYUp == null || tilesRowMajorYUp.length != width * height)
            throw new IllegalArgumentException("tiles array must hold exactly width*height entries");
        this.width = width;
        this.height = height;
        this.tiles = tilesRowMajorYUp.clone();
    }

    public int width() {
        return width;
    }

    public int height() {
        return height;
    }

    public int tileAt(int x, int y) {
        requireInside(x, y);
        return tiles[index(x, y)];
    }

    public boolean isWalkable(int x, int y) {
        if(!isInside(x, y))
            return false;
        int tile = tiles[index(x, y)];
        return tile == FLOOR || tile == DOOR || tile == EXIT;
    }

    public boolean isInside(int x, int y) {
        return x >= 0 && y >= 0 && x < width && y < height;
    }

    private void requireInside(int x, int y) {
        if(!isInside(x, y))
            throw new IndexOutOfBoundsException("cell (" + x + ", " + y + ") outside " + width + "x" + height + " floor");
    }

    private int index(int x, int y) {
        return y * width + x;
    }
}
