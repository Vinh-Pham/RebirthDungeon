package cloud.vinh.rebirthdungeon.game.grid

/** Detached result of one dungeon generation attempt: the immutable floor plus
 * spawn and exit cells. Carries no library types, so a worker thread can hand
 * it to the render thread safely. */
class GeneratedFloor(
    val floor: FloorMap,
    val spawnX: Int,
    val spawnY: Int,
    val exitX: Int,
    val exitY: Int
) {
    init {
        if (!floor.isWalkable(spawnX, spawnY))
            throw IllegalArgumentException("spawn ($spawnX, $spawnY) must be walkable")
        if (!floor.isWalkable(exitX, exitY))
            throw IllegalArgumentException("exit ($exitX, $exitY) must be walkable")
    }
}
