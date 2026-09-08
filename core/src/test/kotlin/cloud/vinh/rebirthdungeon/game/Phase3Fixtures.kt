package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.data.content.JacksonContentRepository
import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.ActorState
import java.io.File

internal object Phase3Fixtures {
    val content = JacksonContentRepository { File("../assets/data/$it").readText() }.load().catalog
    fun floor(vararg rows: String): FloorMap {
        val width = rows.first().length
        require(rows.all { it.length == width })
        return FloorMap(width, rows.size, IntArray(width * rows.size) { i -> when (rows[rows.size - 1 - i / width][i % width]) {
            '#' -> FloorMap.WALL; '+' -> FloorMap.DOOR; '/' -> FloorMap.OPEN_DOOR; 'L' -> FloorMap.LOCKED_DOOR
            '>' -> FloorMap.EXIT; else -> FloorMap.FLOOR
        } })
    }
    fun enemy(x: Int, y: Int, id: Long = 2, hp: Int = 10) = ActorState(EntityId(id), ContentId("actor.enemy"), Cell(x, y), false, true, true, 8, hp, 10)
    fun simulation(floor: FloorMap, x: Int = 1, y: Int = 1, enemies: List<ActorState> = emptyList()) =
        DungeonSimulation.create(floor, x, y, RunSession(71, content), enemies)
}
