# Browser saves

Select **Create Character** to start a fresh game. The game stores characters
and settings in the current IndexedDB database. Character files and previous
save databases are outside the current save format. Prior browser data stays
in its original database.

Each write checks the previous revision inside the Dexie transaction. The
session publishes a candidate after that transaction succeeds. A stale tab
receives a conflict and must reload the latest character. Save failures leave
the prior snapshot available. Reloading the same browser origin resumes the
active character and their skill bar assignments. Saves created before skill
slots were added load with ten empty slots.

Town visits use the current LDtk layout. Opening an existing save in a town
also refreshes its layout when the authored map changes. The player's tile
is preserved when it is free and reachable from the town spawn. If the tile
becomes blocked or cut off, the player resumes at the town spawn. Registered
Moon Gates are stored by town and use their current positions.

Characters already inside an earlier Threshold layout can finish or leave
that run. Their next entrance from either settlement uses the continuous
six-room floor. If they already completed the Threshold, the new route starts
cleared and the Signal Cache remains claimed.

The continuous layout uses one map key per run. Enemy positions, cleared
rooms, opened gates and explored tiles survive save and reload along with
the player's position.
