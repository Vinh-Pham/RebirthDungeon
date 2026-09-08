package cloud.vinh.rebirthdungeon.game.squidsquad

import cloud.vinh.rebirthdungeon.game.algorithms.*
import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.grid.DungeonGrid
import com.github.yellowstonegames.grid.Coord
import com.github.yellowstonegames.grid.FOV
import com.github.yellowstonegames.grid.Measurement
import com.github.yellowstonegames.grid.Radius
import com.github.yellowstonegames.path.DijkstraMap

class SquidPathfinder : Pathfinder {
    override fun nextStep(grid: DungeonGrid, from: Cell, goal: Cell, blockers: List<Cell>): Cell? {
        val terrain = Array(grid.width) { x -> CharArray(grid.height) { y -> if (grid.passable(x, y)) '.' else '#' } }
        val map = DijkstraMap(terrain, Measurement.MANHATTAN)
        map.setGoal(goal.x, goal.y)
        map.scan(blockers.filter { it != from && it != goal }.map { Coord.get(it.x, it.y) })
        // Fixed N/E/S/W tie-break, no hidden library RNG or mutable path cache.
        val candidates = listOf(Cell(from.x, from.y + 1), Cell(from.x + 1, from.y), Cell(from.x, from.y - 1), Cell(from.x - 1, from.y))
        var best: Cell? = null
        var distance = map.gradientMap[from.x][from.y]
        for (cell in candidates) {
            if (!grid.passable(cell.x, cell.y) || cell in blockers && cell != goal) continue
            val value = map.gradientMap[cell.x][cell.y]
            if (value < distance) { best = cell; distance = value }
        }
        return best
    }
}

class SquidFieldOfView : FieldOfView {
    override fun visible(grid: DungeonGrid, origin: Cell, radius: Int): BooleanArray {
        val resistance = Array(grid.width) { x -> FloatArray(grid.height) { y -> if (grid.opaque(x, y)) 1f else 0f } }
        val light = Array(grid.width) { FloatArray(grid.height) }
        FOV.reuseFOV(resistance, light, origin.x, origin.y, radius.toFloat(), Radius.DIAMOND)
        return BooleanArray(grid.width * grid.height) { light[it % grid.width][it / grid.width] > 0f }
    }
}
