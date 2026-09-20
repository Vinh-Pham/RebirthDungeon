# Alby rooms, gates and exit

**Implemented first-slice rooms, gates and entrance exit.** Follow the eight-room layout in [game-plan.md](../game-plan.md): entrance, **three required encounter rooms**, boss room, two optional side rooms (one encounter and one supplies room), and a reward room beyond the boss. The optional encounter is never a fourth boss requirement.

## Gate rules

Entering an uncleared encounter starts its saved battle and seals its exits until resolution. Required spider-contact, trapped-chest and switch encounters each produce a distinct clear flag after victory. The boss gate opens only when all three required flags are committed. The optional encounter may seal its own room while active, but skipping it must still permit the boss.

Defeat ends the run. Confirmed abandonment exits under the retained-reward policy. Boss death alone is not a successful dungeon clear: commit the goddess statue’s return to Town1. Gate animations, collisions and quest notifications cannot advance these flags.

Persist generated room/corridor/door geometry, encounter IDs, required membership, clear flags, active battle, return position and gate checkpoint in the same run envelope. Derive open/closed presentation from validated saved facts and reject inconsistent references. Loading never regenerates an existing layout or retroactively converts an optional room into a requirement.

## Collision and A*

Author room templates with explicit entrance/exit cells and interaction/spawn positions. Do not assume every room is nine-by-nine or infer doors from one old layout helper. Validate required-room connectivity, clearance, legal spawns and boss access across at least 1,000 deterministic seeds.

Gate collision and A* costs must use the same occupancy. Update/invalidate route caches after committed gate changes and cancel/replan blocked routes. Recreate native map handles on load; keep world-to-grid origin/index conversion in the shared adapter. World state is rebuilt when returning from the separate Monarch battle screen.

## Entrance exit

An original statue/exit marker at the entrance supports pointer selection and E within its authored interaction range. Open a Druid/Monarch confirmation; Cancel changes nothing, Leave submits abandonment. Disable interaction during writes, rewards and other blocked phases. Claimed rewards/EXP remain; no successful-clear credit is awarded.

Later Aren's memory uses its own encounter membership and explicit scenario exit, not Alby's three-room boss gate. Tests cover active battle resume, gate reopening, optional-room skipping, blocked boss access, cache changes, saved return position and exit cancellation/commit.

Implemented entrance exit: click the entrance marker inside Alby to walk back to it and open **Leave the dungeon?**, or press E nearby. **Cancel** (or Escape) keeps the current run. **Leave dungeon** ends the run and saves the character on the tile directly in front of the town gate, retaining earned rewards and experience. Leaving does not count as clearing Alby. A failed save preserves the current run until a successful retry.

Room-gate update: generated maps now save door cells at every monster room’s actual corridor boundaries. Required rooms lock all forward and side passages until that room’s saved victory; incoming doors permit approach and backtracking. Every uncleared monster room starts battle on entry, during which all its doors are sealed, including the optional encounter and boss. The boss approach still requires the three main encounters; the optional branch is never required for main-route progress. Amber barred doors are closed, and teal doorways are open. Walking, map occupancy and native A* share the same gate rule; gate changes discard old routes and rebuild native maps. Older layouts derive doors from their saved geometry, without regenerating the dungeon; an older character saved directly on a newly closed doorway is placed inside its owning room.

Treasure-room update: the boss grants EXP and **one treasure chest key**, replacing its ordinary gold/item reward offer. Its east gate opens to an eighth, walkable reward room. Five chests contain saved hidden offers; opening an unopened chest costs one key and creates a pending reward offer in the same transaction. Each chest can be opened once, and additional keys would allow additional chests rather than a single-choice restriction. Keys belong to this dungeon run and do not occupy inventory slots. The clickable goddess statue offers a confirmed return to the tile in front of the town gate, including when the player elects to leave a key unused. Unused keys/unopened chests disappear with the run. Older seven-room saves gain the room without regenerating existing geometry or rerolling rewards; a previously chosen chest stays opened and does not receive a replacement key.

Treasure saves use profile format 3 and run treasure format 1. Older profile formats migrate in memory and are not rewritten until a successful action. Older game builds refuse format 3, protecting key consumption and opened-chest records from stale writes.
