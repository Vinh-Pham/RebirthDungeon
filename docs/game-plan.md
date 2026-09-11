# Rebirth Dungeon: Godot Game Plan

Reset: **2026-09-10**. Target: **Godot 4.7, typed GDScript, 2D**, desktop first, Android and iOS next. This is the implementation plan; [Project Phases](project-phases.md) owns current completion status. [Overview](overview.md) owns the vision, [gameplay specifications](directory.md#gameplay-specifications) own mechanics, and [Project Phases](project-phases.md) owns status.

## Current repository baseline

Phase 0 now provides a minimal main scene, headless runner, verification wrapper and desktop/Android/iOS presets. The editor is pinned to Godot 4.7.2 (`ed1daf0bf`), using Compatibility with `canvas_items`/`expand`. The existing Beckett MCP addon supplies editor integration. The application now has a persistent session shell, validated foundation catalog, independent runtime state/RNG and command contracts; see [Phase 2 implementation](phase2-implementation.md). Combat, exploration and durable saves remain later work. Matching export templates are pinned but not installed; platform prerequisites and actual verification limits are recorded in [Phase 0 baseline](phase0-baseline.md).

The former Kotlin/LibGDX, KTX, ECS, dungeon-library and mobile-launcher architecture is replaced. Old saves and prior build evidence do not certify this Godot project. This documentation change does not implement gameplay or alter engine settings.

## Engine architecture

Use Godot's scene composition rather than an external ECS. Reusable `.tscn` scenes own presentation and engine integration; typed `.gd` scripts implement behavior; custom `.tres` Resources hold authored definitions. Godot documents scenes as reusable node trees and Resources as data containers which can be shared when loaded. Treat loaded definitions as read-only and keep mutable instances separate. [Nodes and scenes](https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html), [Resources](https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html).

Proposed ownership:

| Owner | Responsibility |
| --- | --- |
| `Main` scene | Long-lived session controller, active mode host, UI host and service wiring |
| `GameSession` (`RefCounted`) | Hero profile, optional expedition, optional battle, revision and pending transaction |
| Application controller (`Node`) | Serialize commands, switch modes, coordinate saves, publish observations and events |
| Rules (`RefCounted` / stateless GDScript helpers) | Combat, stats, inventory and progression decisions; no scene traversal, input, file access or wall clock |
| Exploration scene | `CharacterBody2D`, map collision/navigation, discovery and interaction adapters |
| Battle scene | Visual actors and dice controls; renders battle state and submits intents |
| Content catalog | Validate and index definitions by stable IDs before play |
| Save repository | Encode explicit state, validate/load/checkpoint under `user://` |
| Settings/audio services | Preferences and playback; introduce an autoload only if it needs application-wide lifetime |

Keep one active authoritative session. Scene removal must not destroy the profile or silently end a run. Connect local signals when a view attaches; disconnect external subscriptions when it leaves. Session/revision tokens reject callbacks from obsolete scenes. Node instance IDs, scene paths and resource paths are not persistent gameplay identities. UI receives copied observations, not writable session dictionaries.

## Scenes and modes

`Main` remains loaded while its mode host replaces `MainMenu`, `Town`, `Dungeon`, `Battle` and `Results` children. Use a transition guard so one input cannot start two battles or purchases. An expedition retains its exploration continuation while a separate battle is active; its exploration physics and interactions are disabled. Encounter victory restores that continuation and removes the resolved encounter once. Dungeon completion is a separate exit/result transaction.

Load small required scenes/resources before enabling play. Show an actionable error if any required content is missing. Add threaded loading only for a measured need, publishing results on the main thread after verifying the session token. Never modify the active scene tree from a worker. Cosmetic animations, sound callbacks and panel navigation cannot advance turns or grant rewards.

## Exploration and generation

Exploration is continuous and uses Godot's 2D physics updates; battle advances only through accepted commands. Use `CharacterBody2D.velocity` and `move_and_slide()` in `_physics_process()` for movement. Click/tap navigation uses a `NavigationAgent2D` over `NavigationRegion2D` polygons; direct input uses the same collision body. An agent supplies path positions, not automatic movement. Follow its next position once per physics update while a path is active, and wait for navigation-map synchronization before the first path query. [2D movement](https://docs.godotengine.org/en/stable/tutorials/2d/2d_movement.html), [Navigation agents](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_using_navigationagents.html).

Start with an authored town and connected dungeon rooms. Room scenes contain artwork, collision, navigation polygons, connectors, encounter markers and interaction markers. `TileMapLayer`/`TileSet` can author tile art and collision; tile art does not impose tile-step movement. Define collision masks and navigation clearance together so a valid route fits the player's body. [TileSets](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html).

[Free exploration](free-exploration.md) owns discovery, encounters and the small economy. Seeded procedural assembly comes after an authored loop: choose rooms from sorted IDs, match authored connectors, bound retry counts, validate connectivity/overlap and provide a known valid fallback. Persist the generated layout, stable room/encounter IDs and discovery state. Do not promise that a seed regenerates identical navigation on every engine version.

The old custom fixed-point navigation requirement is retired. Godot physics/pathfinding are not assumed bit-identical across devices. Save positions and semantic interaction outcomes; exact replay acceptance applies to the integer battle/progression rules under pinned versions. If exact movement replay becomes a requirement, first design and validate a separate deterministic movement layer.

## Content and randomness

Author typed definitions for skills/ranks, items, actors, stats, statuses, encounters, rooms and progression. A catalog manifest explicitly lists definitions; validate unique IDs, references, ranges, supported effect types, rank ordering, six nonnegative dice weights with positive sum, complete scoring rules and progression thresholds. Reject an invalid catalog as a unit with source/property diagnostics. Definition schema, content revision, rules, generator and RNG versions are separate.

Separate runtime state from shared Resources: an item definition describes an item type; an item instance stores a unique ID, quantity, rolled values, enchants and placement. Rank training and status durations never mutate a loaded definition. See [Phase 2](phase2-foundations.md).

Use independently owned `RandomNumberGenerator` instances for generation, combat, AI, loot and later town enchanting. Cosmetics have a separate stream excluded from saves/replays. Freeze stream derivation and draw order with fixtures; do not use global random functions for gameplay. Save each stream's seed and state; restore seed before state. Godot describes its current algorithm as an implementation detail, so pin engine/RNG versions and reject unsupported continuation rather than assuming cross-version sequences. [RandomNumberGenerator](https://docs.godotengine.org/en/stable/classes/class_randomnumbergenerator.html).

## Combat and rule transactions

Implement a small explicit state machine: pre-roll selection → locked hand → resolved activation → next actor or encounter outcome. Select an eligible skill and target before rolling five dice; retain any dice and reroll a nonempty unkept subset up to twice; commit the entire hand to one skill. The first roll freezes rank, target, stats, weights and HP/MP/SP reservations. A pre-roll pass is free of skill costs; a post-roll pass pays the reserved cost. AP buys progression only. [Battle](gameplay/battle.md) and [Stats](gameplay/stats.md) own formulas and timing.

Commands carry a session ID and expected revision. Validate the full request before mutation or RNG. Resolve in a stable order into a candidate state and ordered events. Rejections leave state, resources and RNG unchanged. The battle target is an eligible encounter member, never a world cell or path. Animation positions have no targeting meaning.

Preview and commitment call the same integer/rational resolver. Use explicit rounding and arithmetic bounds; reject overflow-prone content. Resolve costs, effects, status timing, defeat and initiative exactly once. Hero defeat takes precedence over victory at the same boundary. Store accepted operation IDs/revisions so retries cannot replay effects. [Starter combat](phase4-combat.md) defines the provisional fixture.

## Persistence and continuation

Use `FileAccess` for an explicit versioned save under `user://`; do not serialize the live scene tree. Godot's save tutorial shows file access and JSON but notes JSON cannot directly represent types such as `Vector2`. The project adds its own transactional and compatibility requirements. [Saving games](https://docs.godotengine.org/en/stable/tutorials/io/saving_games.html).

Proposed format: JSON payload with tagged decimal strings for exact 64-bit IDs, RNG state and sequence counters; coordinates encode finite numeric x/y values. Validate types, bounds, supported versions and references before publishing a loaded session. Never load executable Resources or arbitrary scene paths from a save. Record engine build, schema/content/rules/RNG versions, profile, mode, expedition, room layout, exploration position, discovery, encounter disposition, active hand, reservations, statuses, supplies, pending rewards and transaction sequence.

Maintain two alternating checkpoint slots. Write the next candidate with sequence and checksum, close it, read back and validate it, then publish success. Keep the previous valid slot until a newer one verifies. On load choose the highest compatible valid sequence; surface corruption or unsupported versions and preserve existing files. A checksum detects accidental corruption; it is not anti-cheat protection. Actual interruption/durability guarantees require device tests.

Required checkpoints: run/battle entry, rolls/rerolls/kept-state changes, committed actions, purchases, recovery, encounter completion and run results. While saving or on failure, block dependent mutation; retry writes the same candidate including the same RNG results. Periodic exploration checkpoints may lose only movement since the last checkpoint. Pause/focus notifications request a checkpoint and clear held input, but critical state must already be saved because mobile termination may give no callback.

No conversion of pre-Godot saves is planned. Later schema upgrades need explicit migrations or a visible incompatibility path; never silently start a new hero on load failure.

## Progression and feature scope

The first complete loop is town → dungeon → separate dice battle → return → exit and commit rewards → recover. A temporary single gold balance and bounded potion counts prove this before full inventory. The next milestone adds equipment, inventory bags/overflow, skill acquisition through lessons/books/pages, 100 training points plus AP for rank-up, character leveling, talents and titles. Quests, enchanting and deliberate rebirth then complete the signature progression loop.

All committed progression belongs to the hero initially. A run snapshots its loadout and stages; pending rewards follow its outcome policy. Rebirth resets life growth while preserving mastery under [Character](gameplay/character.md). Exact eligibility and full economy must be authored before those phases close. RP missions keep borrowed NPC state isolated. Advanced combat, expanded procedural content and additional towns follow the working core.

Authentication, cloud saves, gacha, purchases and multiplayer are deferred product decisions, never dependencies of offline play. Platform plugins or third-party libraries require a concrete consuming feature and fresh export verification.

## UI, rendering and audio

Use `CanvasLayer` and `Control` scenes with `Container` layouts, shared `Theme`, focus navigation and explicit modal input ownership. Map actions through `InputMap`; world click/tap handlers use unhandled events and additionally gate polled movement when a UI context owns input. [Containers](https://docs.godotengine.org/en/stable/tutorials/ui/gui_containers.html), [Input events](https://docs.godotengine.org/en/stable/tutorials/inputs/inputevent.html).

Preserve landscape pixel art with nearest texture filtering and a deliberate world/UI scale policy. Start by evaluating the existing `canvas_items`/`expand` setup on wide and compact layouts. UI readability and safe-area conversion must be tested independently of camera zoom; do not claim integer pixel scaling without implementing it. Use audio buses for master/music/effects and cosmetic `AnimationPlayer`/Tween playback. [UI plan](gameplay/user-interface.md) owns interaction acceptance.

## Validation and delivery

Use a pinned Godot executable, referred to here as `godot`. Commands (see [Phase 0 evidence](evidence/phase-0/README.md) for measured results):

```sh
godot --version
godot --headless --path . --editor --import
godot --path .
# Implemented Phase 0 runner:
godot --headless --path . --script res://tests/run_tests.gd
# Preset exists; install matching templates and configure Android prerequisites first:
godot --headless --path . --export-debug "Android" build/rebirth-dungeon.apk
```

The test runner must exit nonzero on failure. Cover content rejection, combat fixtures, RNG continuation, status boundaries, invalid commands, save failures and exactly-once outcomes headlessly. Import success is not a test suite or a rendering check. Exercise scenes, keyboard/mouse/touch, resizing, suspension, relaunch and the full loop in runtime tests. Exclude docs, research caches and test fixtures from shipping exports. [Command line](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html).

Android uses Godot export templates and the documented JDK/Android SDK configuration. iOS uses Godot's Xcode export on macOS, signing and actual runtime checks; an exported Xcode project alone does not prove gameplay. Recheck SDK/store prerequisites at release rather than inheriting historical versions. [Android export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html), [iOS export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_ios.html).

Record build version, platform/device, commands, outcomes and retained evidence in the phase tracker only after work is verified. Desktop, Android, iOS, headless tests and save portability are separate acceptance claims. [Godot source index](references.md#godot-engine-sources).
