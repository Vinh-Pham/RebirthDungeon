# Dungeon room gates

## Implemented behavior

Enemy rooms (including the boss room) have gates at their corridor openings. Entering an uncleared enemy room starts its encounter through the normal persisted command pipeline. Combat closes the room's gates; defeating the last living enemy opens them. Loot collection keeps its existing continuation flow. Entry, supply and memory-exit rooms have no gates.

The boss entrance remains closed until every non-boss encounter room is cleared. This includes chamber 4, which was formerly optional; supplies are not a prerequisite. Both exploration pathfinding/collision and the encounter command enforce the same rule. The battle scene displays the sealed gate and its status, and exploration shows open or closed doorway markers.

Gate status is derived from existing room kinds, cleared-room IDs and living battle enemies. No new save fields or save-version migration are needed. Reloading retains active battles and gate state. Older saves use room kinds rather than the former three-room `required` flags. A legacy exploration checkpoint inside the newly locked boss area resumes at the entrance so the character can clear the remaining rooms. Aren's memory uses the same enemy-room gates; its exit retains its existing completion rule.

Room-entry detection uses the existing nine-by-nine room bounds. Doorway cells are walkable room-edge cells with walkable floor immediately outside. New dungeon layouts with different room shapes must update these geometry helpers.

## Entrance exit

Each entrance has an original goddess statue. Click it or press E within 150 world pixels to open the existing exit confirmation. Cancel retains the run; Leave uses the normal abandonment transaction (or exits Aren's memory). Claimed rewards follow the existing return-to-town rules. The statue is unavailable during blocked input, busy writes, rewards and read-only sessions.
