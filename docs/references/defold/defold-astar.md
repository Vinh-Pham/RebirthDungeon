# A* Path Finding

[Upstream documentation](https://github.com/selimanac/defold-astar) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

This is the MicroPather-based **selimanac/defold-astar** native extension. Use it for tile-grid click-to-move and NPC approach. Its dependency example is `https://github.com/selimanac/defold-astar/archive/master.zip`; pin a release/commit and include it in the custom-engine build checks.

The [API wiki](https://github.com/selimanac/defold-astar/wiki) was also inspected for this guide. It documents the native `astar` global, including multi-map APIs; verify the pinned release includes those APIs before adopting them.

## API and coordinates

Call `astar.setup(width, height, direction, allocate, typical_adjacent, ...)` before populating and solving a map. Use `astar.set_map(world)` for tile data and `astar.set_costs(costs)` for passable tile IDs and their directional costs. Omitted tile IDs in the cost table are impassable; costs are not simply a Boolean occupancy list.

`astar.solve(start_x, start_y, end_x, end_y, ...)` returns `status, size, total_cost, path`. Handle `astar.SOLVED`, `astar.NO_SOLUTION`, and `astar.START_END_SAME`. Path entries include `x`, `y`, and `id`; the path includes its starting tile.

The default coordinate/table indexing is one-based; `use_zero` changes it. Map data begins at the top left; a map flip does not itself change coordinate conventions. Keep screen-to-world and world-to-grid conversion in one tested adapter, including negative Defold tilemap origins.

For multi-map ownership the wiki supplies `astar.new_map_id()` and `astar.delete_map(map_id)`. It also documents `set_at`, `reset_cache`, and `reset`. Dispose maps when their owning screen/run ends and invalidate path caches when gates or obstacles change.

## Project contract

Use four-direction routes initially. Eight-direction movement needs verified corner-cutting and actor-clearance behavior before activation. Build the grid from the same occupancy as collision geometry, inflated for actor size where needed. A* returns routes; the player controller still owns movement and collision resolution.

Keyboard input cancels a route; clicking an NPC targets a reachable cell in interaction range. Avoid solving every frame. Stop or replan if the next waypoint becomes blocked. Never persist native map handles; recreate maps from saved layout/gate data.

Verify blocked goals, disconnected rooms, same-cell clicks, row/column orientation, indexing, gate opening, cache invalidation, repeated load/unload, and deterministic path costs in the actual engine. Plain Lua mocks only verify adapter callers.

## Consuming project contract

Use the [town traversal](../../gameplay/towns.md) and [gates](../../gameplay/dungeon-gates.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
