package cloud.vinh.rebirthsaga.game.algorithms;

import cloud.vinh.rebirthsaga.game.grid.GeneratedFloor;

/** Project interface in front of dungeon generation. Implementations must be
 * deterministic for identical arguments and must return detached data owned by
 * the project (no library grids, RNGs or mutable arrays escape). Pure Java:
 * callable from a worker thread. Reachability validation and bounded retries
 * arrive with the Phase 3 movement slice. */
public interface DungeonGenerator {
    GeneratedFloor generate(int width, int height, long seed);
}
