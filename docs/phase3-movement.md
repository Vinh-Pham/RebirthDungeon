# Phase 3 movement and checkpoints

Implemented 2026-09-08. This is the first authoritative movement/checkpoint slice. Combat, rewards, floor transitions and full persistence recovery remain in their scheduled phases.

## Rules and ownership

`DungeonSimulation` owns one artemis World. `RunSession` owns the mutable grid, scheduler, exploration memory, run/floor/generator identity, counters and pinned gameplay RNG streams. Actors have stable identity, position, player or AI role, blocker, vision and health components. The stable-ID index points to ECS entities; it does not duplicate actor state. Reusing an initialized session to create another World is rejected.

Systems are registered in the architecture's order: validation → enemy intent → movement → interaction → cleanup → visibility → turn finalization (100/150/200/300/800/900/1000). Slots 400–700 remain absent until combat. Each action calls `World.process()` once, without recursion; exports happen after it returns. `RunWorld` is the internal ECS/action context used by those systems.

The y-up grid uses `x + y * width` indexing. Static terrain and occupancy stay outside ECS. Occupancy moves atomically and lookup is O(1). Tile values 0–3 retain wall/floor/closed unlocked door/exit meanings; 4 and 5 represent open and locked door state. Walls and closed/locked doors are opaque. Terrain is copied into checkpoints; loading never regenerates it.

- A cardinal move onto an empty floor/open door/exit costs one activation and moves the actor.
- A move toward a closed unlocked door opens it for one activation and leaves the actor in place.
- Wait costs one activation. Invalid deltas (including integer-overflow cases), bounds, walls, occupied cells and locked doors reject without changing authoritative state or drawing RNG.
- No keys are available in this slice; locked doors remain unavailable. Key ownership/unlocking is not claimed implemented.
- Hostile contact rejects without overlap or a turn cost. Dice encounters are Phase 4. An adjacent enemy idles instead of attacking.
- Reaching an exit publishes a one-time `ExitReached` event and retains an informational flag. The player can keep exploring. This is not victory, a reward grant, or an automatic floor transition.

Initiative orders entries by `(dueTick, insertionSequence, stableActorId)`. The active actor is outside the queue. Finishing an activation requeues it at `tick + 100` with the next insertion sequence, then selects the next actor. Cleanup removes dead non-player actors from occupancy, the stable-ID index, the World and the scheduler before visibility/finalization. Player damage and defeat are not enabled.

## Generation, pursuit and fog

`FloorGeneration` wraps the existing `DungeonProcessor` adapter. Each bounded attempt uses the Phase 2 run/floor/generator/attempt seed derivation. Validation covers requested dimensions, wall boundary, open spawn/exit, distinct cells, exit reachability and a reachable enemy spawn outside the spawn-to-exit route. Unlocked doors are traversable for reachability because the player can open them; locked doors are not. Successful output marks the actual exit tile. Failure returns an attempt count/reason and does not replace the current floor. The profile's four-attempt budget is now consumed automatically.

The adapter preserves x-first library coordinates in the y-up row-major grid and distinguishes `+` closed doors from `/` open doors. A single reachability flood supplies candidate membership; enemy-spawn selection does not run a new flood for every cell. Tests retain the raw-library non-square translation checks and exercise bounded failure and reproducible success.

`SquidPathfinder` creates a Manhattan `DijkstraMap` with explicit terrain and per-query dynamic blockers. It picks the next lower-distance cardinal neighbor in N/E/S/W order, so no library random tie-breaker or cache state needs persistence. AI pursues only when it can see the player and otherwise waits. AI does not open closed doors in this initial policy. The hero has vision radius 8; the demonstration enemy has radius 6. These are provisional movement-slice settings.

`SquidFieldOfView` calls `FOV.reuseFOV` with `Radius.DIAMOND`. Player visibility refreshes when the player moves or opacity changes. Currently visible tiles update persistent remembered terrain. Rendering receives only remembered tiles and currently visible actors; unobserved terrain is `-1`. Movement events expose enemy cells only when both endpoints were visible at that action boundary. Unseen enemy wait/removal events are filtered. Full restore exports are separate from observations and are not passed to the screen.

## Application and presentation

The application owns `RunServices`, one checkpoint writer and the active `RunController` across menu/dungeon screens. The controller accepts commands on its owning render thread, validates its session token, serializes player/automatic steps, and checkpoints every accepted action before allowing the next one. Save failure preserves the committed in-memory state and blocks more input until Retry save succeeds. Retrying does not reapply the command. An automatic-actor guard stops at a completed action boundary; invariant failures halt the controller instead of being treated as retryable save failures.

The screen owns rendering and its generation worker. Worker results still pass through `postRunnable` and the session-generation guard. Generation failure/stale callbacks preserve the prior controller. New run and Reload stage a replacement before switching the active controller. Menus retain the active run; application pause checkpoints the committed state and cancels an unfinished touch gesture. Animation time is never saved or used by rules.

Controls are arrows/WASD, on-screen cardinal buttons, adjacent-cell taps and cardinal swipes. Space/period and the Wait button submit `WaitCommand`. One touch gesture resolves on release, preventing a swipe from also submitting a tap; cancellation clears its pointer. Stage gets first refusal. The controller and the screen's generation/animation gates protect all input paths.

The renderer uses immutable observations for fog, tiles and actors; only the player's committed movement is interpolated in this slice. Visible enemies use the shared placeholder actor frames tinted red. The HUD reports HP, accepted player actions, total activations and logical tick. Reload reads a checkpoint from disk, including scheduler/RNG continuation. It does not reroll a floor or reset a turn.

## Checkpoint format and limits

The first movement save format is envelope schema 1, using the current content schema/content/rules versions. No earlier phase shipped a checkpoint format to migrate. The checked-in `core/src/test/resources/saves/movement-v1.json` is a real desktop checkpoint and is retained as a compatibility fixture.

`CheckpointCodec` uses LibGDX JSON with explicit DTOs. The envelope contains schema version, increasing revision, SHA-256 of the UTF-8 payload, and the payload. Long counters/IDs use decimal strings; seeds and all five words of each gameplay RNG use hexadecimal strings. The payload includes:

- run ID, original seed, pinned versions, floor index, generator version and successful attempt;
- actual terrain, stable actor/component values, next entity ID, explored cells and remembered terrain;
- player-command, activation and event counters, plus the exit-reached flag;
- current tick, active actor, complete initiative queue and next insertion sequence;
- generation, AI, combat and loot algorithm IDs, formats and full states; no cosmetics.

`AlternatingCheckpointRepository` synchronously writes the inactive `run-a.json`/`run-b.json` slot, closes it through the storage adapter and verifies the read-back before success. It validates both slots when loading and selects the newest complete supported one. A torn newest slot falls back to the previous valid checkpoint. Two invalid slots produce a load error without deleting files. Unsupported schema/content/rules versions block loading/writing rather than being overwritten. DTO presence/types, terrain, actor overlap/roles/health, scheduler membership/timing, counters, exploration shape and RNG state are checked before reconstruction.

On desktop, saves default to `~/.rebirthdungeon/saves`; `REBIRTH_CHECKPOINT_DIR` provides an isolated desktop verification directory. Android/iOS use the platform's local `saves` directory. Saves are never written under shipped `assets/`. Bootstrap assigns a new UUID-based run identity; the simulation receives that identity explicitly and never reads the clock or platform randomness.

The current writer is synchronous and application-owned. This is a close-and-read-back foundation, not a claim of power-loss durability or OS-level fsync guarantees. Phase 6 owns migrations, broader corruption recovery, lifecycle interruption/device tests and harder persistence policies. Profile/inventory/reward fields are deliberately absent until their consumers arrive.

## Verification scope

The JVM suite covers movement/door costs, rejected-command immutability, occupancy/death cleanup, scheduler ordering/restore, path blockers, door FOV invalidation, diamond range, persistent fog memory, hidden-actor/event privacy, bounded generation, and reaching a generated exit with AI present. Replay tests compare canonical full state, visible state, events and RNG continuation after a checkpoint taken while an enemy is due. Storage tests cover torn writes, future-schema preservation (including future fields), malformed JSON types, save-failure retry without duplicate commands, stale tokens and foreign-thread rejection. The recorded desktop checkpoint is also loaded and continued.

See the Phase 3 Completion Log in [project-phases.md](project-phases.md) for final command results and screenshots. Desktop runtime, Android debug packaging, Android device interaction, iOS AOT/runtime and cross-platform replay acceptance remain distinct claims.
