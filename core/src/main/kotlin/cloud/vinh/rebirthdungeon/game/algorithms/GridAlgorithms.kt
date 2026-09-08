package cloud.vinh.rebirthdungeon.game.algorithms

import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.grid.DungeonGrid

fun interface Pathfinder { fun nextStep(grid: DungeonGrid, from: Cell, goal: Cell, blockers: List<Cell>): Cell? }
fun interface FieldOfView { fun visible(grid: DungeonGrid, origin: Cell, radius: Int): BooleanArray }
