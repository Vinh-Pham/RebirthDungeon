package cloud.vinh.rebirthdungeon.presentation.input

import cloud.vinh.rebirthdungeon.game.commands.MoveCommand
import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.projection.DungeonObservation

/** A cancellable input intent, never simulation state. Routes use only remembered terrain/observed actors. */
class ExplorationWalk {
    private var runId: String? = null
    var destination: Cell? = null
        private set

    fun cancel() { destination = null; runId = null }

    fun start(view: DungeonObservation, target: Cell): Boolean {
        cancel()
        if (target == view.playerCell || pathStep(view, target) == null) return false
        destination = target; runId = view.runId
        return true
    }

    /** Replan after every committed step: doors and actor positions can change while walking. */
    fun next(view: DungeonObservation, inBattle: Boolean, defeated: Boolean): MoveCommand? {
        val target = destination ?: return null
        if (inBattle || defeated || view.reachedExit || view.runId != runId || view.playerCell == target) {
            cancel(); return null
        }
        val step = pathStep(view, target)
        if (step == null) cancel()
        return step
    }

    private fun pathStep(view: DungeonObservation, target: Cell): MoveCommand? {
        fun inside(cell: Cell) = cell.x in 0 until view.width && cell.y in 0 until view.height
        if (!inside(target)) return null
        val occupied = view.actors.filter { !it.player && it.hp > 0 }.map { it.cell }.toSet()
        fun passable(cell: Cell): Boolean {
            if (!inside(cell) || cell != target && cell in occupied) return false
            return when (view.tileAt(cell.x, cell.y)) {
                FloorMap.FLOOR, FloorMap.DOOR, FloorMap.OPEN_DOOR, FloorMap.EXIT -> true
                else -> false // Unknown terrain, walls and locked doors do not supply a route.
            }
        }
        if (!passable(target)) return null
        val start = view.playerCell
        val parents = HashMap<Cell, Cell>()
        val queue = java.util.ArrayDeque<Cell>()
        parents[start] = start; queue.add(start)
        while (!queue.isEmpty()) {
            val cell = queue.removeFirst()
            if (cell == target) {
                var step = cell
                while (parents.getValue(step) != start) step = parents.getValue(step)
                return MoveCommand(step.x - start.x, step.y - start.y)
            }
            // Stable four-neighbor order; no diagonal corner cutting or gameplay RNG.
            for (next in listOf(Cell(cell.x, cell.y + 1), Cell(cell.x + 1, cell.y), Cell(cell.x, cell.y - 1), Cell(cell.x - 1, cell.y))) {
                if (next !in parents && passable(next)) { parents[next] = cell; queue.addLast(next) }
            }
        }
        return null
    }
}
