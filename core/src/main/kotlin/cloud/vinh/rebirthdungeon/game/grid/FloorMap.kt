package cloud.vinh.rebirthdungeon.game.grid

/** Project-owned floor data translated from a generator's output. Storage is a
 * flattened row-major `IntArray` with `y = 0` at the bottom (y-up);
 * cell `(x, y)` lives at index `y * width + x`. Static terrain such
 * as floors and walls lives here, not in the ECS. Immutable, so a detached
 * result can be shared between worker and render thread. */
class FloorMap(val width: Int, val height: Int, tilesRowMajorYUp: IntArray) {

    private val tiles = tilesRowMajorYUp.clone()

    init {
        if (width < 1 || height < 1)
            throw IllegalArgumentException("FloorMap needs positive dimensions, got ${width}x$height")
        if (tilesRowMajorYUp.size != width * height)
            throw IllegalArgumentException("tiles array must hold exactly width*height entries")
    }

    fun tileAt(x: Int, y: Int): Int {
        requireInside(x, y)
        return tiles[index(x, y)]
    }

    fun isWalkable(x: Int, y: Int): Boolean {
        if (!isInside(x, y))
            return false
        val tile = tiles[index(x, y)]
        return tile == FLOOR || tile == DOOR || tile == EXIT
    }

    fun isInside(x: Int, y: Int): Boolean = x >= 0 && y >= 0 && x < width && y < height

    private fun requireInside(x: Int, y: Int) {
        if (!isInside(x, y))
            throw IndexOutOfBoundsException("cell ($x, $y) outside ${width}x$height floor")
    }

    private fun index(x: Int, y: Int): Int = y * width + x

    companion object {
        const val WALL = 0
        const val FLOOR = 1
        const val DOOR = 2
        const val EXIT = 3
    }
}
