package cloud.vinh.rebirthsaga.game.grid;

/** Detached result of one dungeon generation attempt: the immutable floor plus
 * spawn and exit cells. Carries no library types, so a worker thread can hand
 * it to the render thread safely. */
public final class GeneratedFloor {
    private final FloorMap floor;
    private final int spawnX;
    private final int spawnY;
    private final int exitX;
    private final int exitY;

    public GeneratedFloor(FloorMap floor, int spawnX, int spawnY, int exitX, int exitY) {
        if(floor == null)
            throw new IllegalArgumentException("floor must not be null");
        if(!floor.isWalkable(spawnX, spawnY))
            throw new IllegalArgumentException("spawn (" + spawnX + ", " + spawnY + ") must be walkable");
        if(!floor.isWalkable(exitX, exitY))
            throw new IllegalArgumentException("exit (" + exitX + ", " + exitY + ") must be walkable");
        this.floor = floor;
        this.spawnX = spawnX;
        this.spawnY = spawnY;
        this.exitX = exitX;
        this.exitY = exitY;
    }

    public FloorMap floor() {
        return floor;
    }

    public int spawnX() {
        return spawnX;
    }

    public int spawnY() {
        return spawnY;
    }

    public int exitX() {
        return exitX;
    }

    public int exitY() {
        return exitY;
    }
}
