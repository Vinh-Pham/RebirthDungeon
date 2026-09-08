package cloud.vinh.rebirthdungeon.game.grid

import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.identity.EntityId

/** Mutable run terrain and derived O(1) occupancy; owned by one simulation. */
class DungeonGrid(map: FloorMap) {
    val width = map.width
    val height = map.height
    private val tiles = map.copyTiles()
    private val occupants = LongArray(tiles.size)
    var opacityRevision = 0L
        private set
    fun inside(x: Int, y: Int) = x in 0 until width && y in 0 until height
    fun index(x: Int, y: Int): Int { require(inside(x, y)); return y * width + x }
    fun tile(x: Int, y: Int) = tiles[index(x, y)]
    fun occupant(x: Int, y: Int): EntityId? = occupants[index(x, y)].takeIf { it != 0L }?.let(::EntityId)
    fun passable(x: Int, y: Int): Boolean = inside(x, y) && tile(x, y) in listOf(FloorMap.FLOOR, FloorMap.OPEN_DOOR, FloorMap.EXIT)
    fun opaque(x: Int, y: Int) = tile(x, y) in listOf(FloorMap.WALL, FloorMap.DOOR, FloorMap.LOCKED_DOOR)
    fun place(id: EntityId, cell: Cell) {
        require(passable(cell.x, cell.y)) { "Actor on impassable cell $cell" }
        val i = index(cell.x, cell.y)
        require(occupants[i] == 0L) { "Actor overlap at $cell" }
        occupants[i] = id.value
    }
    fun remove(id: EntityId, cell: Cell) {
        val i = index(cell.x, cell.y)
        check(occupants[i] == id.value)
        occupants[i] = 0
    }
    fun move(id: EntityId, from: Cell, to: Cell) {
        check(passable(to.x, to.y) && occupant(to.x, to.y) == null)
        remove(id, from); place(id, to)
    }
    fun openDoor(cell: Cell) {
        val i = index(cell.x, cell.y)
        check(tiles[i] == FloorMap.DOOR)
        tiles[i] = FloorMap.OPEN_DOOR
        opacityRevision++
    }
    fun floor(): FloorMap = FloorMap(width, height, tiles)
}
