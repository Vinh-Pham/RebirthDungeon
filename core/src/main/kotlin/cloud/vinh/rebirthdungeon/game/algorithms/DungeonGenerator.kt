package cloud.vinh.rebirthdungeon.game.algorithms

import cloud.vinh.rebirthdungeon.game.grid.GeneratedFloor

/** Project interface in front of dungeon generation. Implementations must be
 * deterministic for identical arguments and must return detached data owned by
 * the project (no library grids, RNGs or mutable arrays escape). Pure JVM
 * code, callable from a worker thread. FloorGeneration owns reachability
 * validation and bounded deterministic retries. */
fun interface DungeonGenerator {
    fun generate(width: Int, height: Int, seed: Long): GeneratedFloor
}
