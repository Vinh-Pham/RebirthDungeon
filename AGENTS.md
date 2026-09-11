# Rebirth Dungeon — assistant guide

## Read before changing the game

This is a single-player, offline-first 2D pixel-art RPG using Godot and typed GDScript. Its loop is town preparation → continuous dungeon exploration → separate five-dice turn-based battles → return to exploration → commit expedition results → persistent skill progression and deliberate rebirth. Desktop comes first; landscape Android and iOS require separate export/device acceptance.

Read [the documentation index](docs/directory.md), [overview](docs/overview.md), [architecture](docs/game-plan.md), and [phase tracker](docs/project-phases.md), then the specification for the feature being changed. Use these ownership rules:

| Question | Authoritative document |
| --- | --- |
| What is implemented and what comes next? | [Project phases](docs/project-phases.md); confirm against current files and fresh verification |
| Session, scenes, rules, RNG and persistence | [Game plan](docs/game-plan.md), [Phase 2 foundations](docs/phase2-foundations.md) |
| Movement, encounter return and temporary economy | [Free exploration](docs/free-exploration.md), [Phase 3](docs/phase3-movement.md) |
| Dice, targets, costs, effects and timing | [Battle](docs/gameplay/battle.md), [Stats](docs/gameplay/stats.md); [Phase 4](docs/phase4-combat.md) owns provisional starter fixtures |
| UI and battle controls | [User interface](docs/gameplay/user-interface.md), [Phase 5](docs/phase5-combat.md) |
| Growth and possessions | [Character](docs/gameplay/character.md), [Skills](docs/gameplay/skills.md), [Inventory](docs/gameplay/inventory.md), [Titles](docs/gameplay/titles.md) |
| NPC services and story | [Towns](docs/gameplay/towns.md), [Quests](docs/gameplay/quests.md), [Enchants](docs/gameplay/enchants.md) |
| Baseline evidence and unresolved decisions | [Phase 0](docs/phase0-baseline.md), [Audit](docs/audit.md), [References](docs/references.md) |

Inspection on 2026-09-11 found a Phase 0 scaffold: `scenes/main.tscn`, the baseline test runner, verification tooling and export presets. The tracker marks Phase 0 complete and subsequent phases not started. There is no application session or gameplay implementation yet. Create planned folders only with their first consuming feature.

Some documents predate Phase 0 completion: the overview/audit still describe an empty scaffold or Mobile renderer. Prefer the tracker for status, current `project.godot` for configuration, and dated Phase 0 evidence for verified results. The root `README.md` describes Beckett, not the game's design. `docs/evidence/free-exploration/` is pre-Godot historical evidence and cannot certify this game.

The older [plugin recommendations](docs/godot_rpg_plugin_recommendations.md) are brainstorming, not a gameplay contract. Their roll-before-skill examples, spatial/action combat, Dialogic recommendation and online stack do not override current specs. Use **Dialogue Manager 4** for dialogue. Do not add multiplayer, accounts, gacha or purchases without a concrete requested feature and its design decision.

## Architecture and non-negotiable rules

- Keep one authoritative session under a persistent `Main` composition root. Transient town/dungeon/battle/results scenes render copied observations and submit commands; they do not own the hero or grant rewards.
- Put application coordination in `scripts/application/`, explicit runtime state and pure rules in `scripts/domain/`, authored Resource types in `scripts/data/definitions/`, and definitions under `content/`. These are intended paths, not existing modules. Follow [the proposed layout](docs/directory.md).
- Use typed GDScript, lowercase snake_case files, descriptive class names, scene composition, local signals and custom Resources. Rules take explicit data and RNG adapters; they do not traverse Nodes, read input, access files or consult wall time.
- Treat loaded definition Resources as read-only. Construct separate mutable hero/item/quest/battle instances; loading a Resource again does not isolate nested state. Use stable namespaced content IDs, never Node instance IDs or paths as persistent identity.
- Commands validate session ID, expected revision and all inputs before mutation or randomness. Resolve a candidate state, checkpoint required changes, then publish ordered observations/events. Reject stale callbacks and duplicate operations. Invalid commands change neither state nor RNG.
- Use separate owned RNG streams for generation, combat, AI, loot and later enchanting. Cosmetic randomness is separate. Pin derivation/draw order and versions; restore seed before state. Use bounded integer/rational rules with explicit rounding. Preview and commit share the same resolver.
- Saves under `user://` encode explicit versioned state, not a scene tree. Preserve exact 64-bit values as decimal strings in JSON. Use two validated alternating checkpoint slots, retain the previous valid slot, and block dependent actions on write failure. Retry the same candidate and RNG result. Do not silently replace a corrupt/incompatible save with a new hero.
- Persist active hands, kept dice, rerolls, reservations, RNG state, exploration continuation, encounter IDs, pending rewards and operation IDs. App closure resumes the same session; it is not defeat, abandonment or rebirth.
- Use `CharacterBody2D.velocity` and `move_and_slide()` in physics updates. `NavigationAgent2D` supplies path positions, not movement; wait for map synchronization before querying. Gate movement during dialogue, blocking UI, battle, transitions and save failures. No cross-device bit-exact physics promise.
- UI uses `Control`/`Container`/`Theme` under `CanvasLayer`, with explicit input ownership, keyboard/controller focus and touch alternatives. Keep hidden dungeon information out of observations. Camera motion, animations and menus never advance turns or change gameplay outcomes.

### Gameplay contracts to preserve

- Choose a learned usable skill and legal encounter target **before** rolling five d6. The first roll locks skill, rank, target, effective stats, weights and HP/MP/SP cost reservation. Reroll a nonempty chosen subset at most twice; commit all five dice to one action and exactly one combination multiplier. Exhausting rerolls does not auto-attack.
- HP payment leaves at least 1 HP. AP buys progression, never attacks. Pre-roll pass has no skill cost; post-roll pass pays the reserved cost. Potions are separate full actions before rolling. Battle legality has no world-grid range or line of sight. Hero defeat wins a simultaneous victory/defeat boundary.
- The first slice has stationary NPCs/enemies, authored rooms, one-enemy encounters, one committed gold balance, bounded potions and explicit free town recovery. Encounter rewards remain pending; successful dungeon exit commits them once. Defeat/abandonment discard pending rewards and preserve unspent brought supplies and committed gold. Full XP/training/inventory/quest/title retention needs its later authored outcome table.
- Learning through lessons/books/pages grants Rank F and zero training. Rank-up is an explicit town action requiring at least 100 training plus AP; excess training does not carry over. Order: `F E D C B A 9 8 7 6 5 4 3 2 1`.
- Rebirth is deliberate and preserves mastery/committed possessions as specified; it does not refund AP or follow automatically from losing or leaving a run. Eligibility, cooldown, age clock and balance remain decisions to close at the consuming phase.
- Inventory uses rectangular footprints and non-nesting bags; the proposed backpack is 6×10, independent of movement. Overflow is saved and withdraw-only. Increasing maximum HP/MP/SP never refills current pools. One First and one Second Title supply selected effects; talent display is cosmetic. Enchant application and destructive burning are distinct town actions.

## Addon policy and installed versions

Inspect local APIs before using online examples; upstream `main`/`stable` can differ. Extend through game-owned adapters, scenes and subclasses outside `addons/`. Avoid modifying vendored code or upgrading dependencies as an incidental fix. Recheck licenses and target exports when introducing an addon into a feature.

| Addon | Installed version evidence | Intended ownership |
| --- | --- | --- |
| Godot State Charts | `addons/godot_state_charts/plugin.cfg`: 0.22.5 | Application/player mode and battle presentation flow |
| LimboAI | `addons/limboai/version.txt`: v1.8.1 | Enemy/NPC decision-making |
| QuestSystem 2 | `addons/quest_system/plugin.cfg`: 2.0.2 | Quest lifecycle adapter and journal observations |
| Phantom Camera | `addons/phantom_camera/plugin.cfg`: 0.11.0.3 | Exploration/dialogue/battle framing |
| Dialogue Manager 4 | `addons/dialogue_manager/plugin.cfg`: 4.1.0 | Authored NPC conversations and choices |

Configuration rechecked on 2026-09-11: Beckett, Godot State Charts, Dialogue Manager, Phantom Camera and QuestSystem are enabled in `project.godot`. `DialogueManager`, `PhantomCameraManager` and `QuestSystem` autoloads are configured alongside `BeckettRuntime`. Preserve this setup and verify autoload UID/importer resolution when integrating features; do not create duplicate managers. Enabled addons do not mean their gameplay features are implemented or verified.

LimboAI is a native GDExtension, not a `plugin.cfg` toggle: inspect `addons/limboai/bin/limboai.gdextension`, its actual binaries and runtime class availability. A minimum compatibility declaration does not prove all platforms work with the pinned editor. The dated Phase 0 evidence does not certify the subsequently configured addon stack.

Follow the [addon-aware phase tracker](docs/project-phases.md#addon-ownership-and-delivery-order):

- Phase 1 qualifies all configured addons with isolated smoke fixtures and reruns baseline checks, then uses State Charts for the application shell. Phase 2 defines domain state and event/intent contracts without implementing every adapter in advance.
- Phase 3 integrates Phantom Camera exploration follow. Phase 4 introduces manually scheduled LimboAI enemy decisions. Phase 5 binds battle presentation to State Charts and Phantom Camera.
- Phase 6 proves durable domain saves and reconstructs chart/camera/AI state. Phases 3–5 use in-memory fixtures and must not claim disk durability.
- Phase 7 introduces Dialogue Manager town services and the complete saved loop. Phase 8 extends services for persistent progression and defines full outcome retention, including future quest evidence.
- Phase 9 integrates QuestSystem lifecycle, journal, saved evidence and explicit Dialogue Manager claims alongside enchanting/rebirth. Phase 10 adds isolated RP missions and authored advanced AI/combat; later phases expand content, polish and verify exports.

Do not implement quests merely because QuestSystem is enabled, or patrols because LimboAI demos contain them. Do not replace an assigned addon responsibility with a parallel custom subsystem. Pure authoritative domain state and validation remain required. Keep phase status solely in the tracker; API guidance here does not mark a feature complete.

### Godot State Charts

[Official manual](https://derkork.github.io/godot-statecharts/). Local API: `addons/godot_state_charts/state_chart.gd`, `state_chart_state.gd`, `compound_state.gd`, `transition.gd`; examples in `godot_state_charts_examples/`.

- Add a `StateChart` with a root state. Use `CompoundState` with an explicit initial child for mutually exclusive substates, `AtomicState` for leaves, and `Transition` children configured with event and target. Use parallel states only for genuinely independent regions.
- Connect `state_entered`, `state_exited`, and where relevant `state_physics_processing` to the owning adapter. Drive events through `send_event(&"event_name")`; expose guard inputs through `set_expression_property(&"property_name", value)`.
- Model accepted battle phases such as pre-roll selection → locked hand → resolved activation → next actor/outcome. Send chart events from accepted application results. A clicked button or completed animation is not evidence that a gameplay transaction succeeded.
- Guards control flow/availability; the domain still validates commands. Keep authoritative phase, hand and reservation data in the session, and reconstruct the chart from validated saved state. The chart's serializer is not a replacement for the combined game save.
- Avoid eventless transition loops and duplicate entry effects. Connect before initial activation; guard asynchronous callbacks with session/revision identity. Do not have State Charts and LimboHSM both own the same transition.

### LimboAI

[Custom tasks](https://limboai.readthedocs.io/en/stable/behavior-trees/custom-tasks.html), [BTPlayer API](https://limboai.readthedocs.io/en/stable/classes/class_btplayer.html). Local references: `addons/limboai/README.md`, `addons/limboai/bin/limboai.gdextension`, and `demo/` (third-party examples, not implemented game content).

- Attach `BTPlayer` to the actor adapter and assign an authored `BehaviorTree` plus a blackboard plan. Keep per-agent working data in its blackboard; shared tree Resources must not hold mutable per-actor gameplay state.
- Implement game-owned tasks by extending `BTAction` or `BTCondition`. `_setup()` initializes references, `_enter()` begins an execution, `_tick(delta)` returns `SUCCESS`, `FAILURE` or `RUNNING`, and `_exit()` releases execution-specific work. Use blackboard `get_var`/`set_var` for explicit decision inputs/outputs.
- For turn-based combat, use `BTPlayer.MANUAL` update mode and call `update(delta)` only under the application scheduler's decision policy. Produce a legal skill/target intent for the domain resolver. Do not tick battle AI continuously while the player inspects or rerolls, or let a task spend HP, resolve attacks or grant loot.
- Use stable candidate ordering and the owned AI RNG adapter for decisions; built-in random tasks/global randomness must not bypass saved draw order. Bound decision work and define a fallback if no action is legal. Repeated ticks or `RUNNING` tasks must not submit the same activation twice.
- LimboHSM can support an AI-local lifecycle when needed; State Charts owns application/battle flow. Patrol/chase demos are not requirements for the stationary first slice. Verify native debug/release binaries and actual device exports before claiming mobile support.

### QuestSystem 2

[Official repository](https://github.com/shomykohai/quest-system), [API overview](https://shomykohai.github.io/quest-system/#/api/). Local API is decisive: `addons/quest_system/quest_resource.gd`, `quest_manager.gd`, and the pool classes.

- Enabling the plugin registers `QuestSystem`. Extend `Quest` in game code, author quest Resources, and override `start(args)`, `update(args)` and `complete(args)` as needed. Preserve base signal behavior with `super` where appropriate. The base class has no game-specific objective engine; example names such as `KillObjective` are not provided APIs.
- The manager exposes `mark_quest_as_available(quest)`, `start_quest(quest, args)`, `update_quest(quest, args)` and `complete_quest(quest, args)`, plus available/active/completed pools. Completion normally requires `objective_completed`. These methods take a `Quest`, not a string ID, and returning a quest alone does not prove a lifecycle change occurred.
- Map the game's stable namespaced quest IDs explicitly to the addon's integer `Quest.id`. Construct isolated per-session quest instances; do not mutate shared catalog Resources. Keep Locked and Ready-to-complete semantics, ordered stages and Chapter/Generation metadata in the adapter/domain because three pools alone do not express the game lifecycle.
- Feed deduplicated domain evidence into quest updates. Run quest snapshots and pending dungeon evidence remain separate from committed hero progress. Opening a journal, playing a line or receiving an animation signal cannot count as objective evidence or reward delivery.
- Ready-to-complete is not Completed. An explicit town claim/final NPC hand-in revalidates objectives and items, consumes costs, grants rewards, records the operation ID and unlocks successors in one checkpointed transaction. Then synchronize plugin pools/signals from the committed result. Never grant rewards directly from `quest_completed` or `Quest.complete()` callbacks.
- Override/adapt serialization to explicit validated fields. The bundled default serializes script variables and deserializes with generic setters; do not use it as the whole save format. Persist stage/evidence/claim IDs in the combined save and reconstruct pools on load without replaying rewards. Reset session-local pools/subscriptions when changing heroes.
- Role-playing missions use isolated NPC state; borrowed skills, equipment, supplies and ordinary combat training never leak into the hero. Follow [the quest specification](docs/gameplay/quests.md) for automatic delivery, milestone catch-up, abandonment, pending evidence and exactly-once claims.

### Phantom Camera

[Overview](https://phantom-camera.dev/overview/what-is-this), [PhantomCamera2D reference](https://phantom-camera.dev/core-nodes/phantom-camera-2d). Local implementation: `addons/phantom_camera/scripts/phantom_camera/phantom_camera_2d.gd`.

- Use an actual `Camera2D` with a child `PhantomCameraHost`, and `PhantomCamera2D` nodes for authored views. The host selects a phantom camera and applies its settings to the actual camera; a phantom camera is not itself the rendering camera.
- Configure `follow_mode` and `set_follow_target(player)` for exploration. Use explicit priorities via `set_priority(value)` for exploration, conversation or battle framing; the highest-priority eligible camera becomes active. Avoid ambiguous ties and restore the intended priority when leaving a context.
- Let the host own the actual camera transform; avoid a second script/tween fighting it. Choose smoothing, limits, zoom and transition behavior for pixel art and test compact/wide landscape layouts. Keep UI on its CanvasLayer.
- Framing never defines encounter membership, range, discovery or turn timing. Keep battle camera targets cosmetic; do not reveal undiscovered rooms through a transition. Rebind targets after scene replacement and reconstruct framing from session mode on load instead of persisting Node references. Camera completion may release a presentation gate, never commit combat or rewards.

### Dialogue Manager 4

[Using dialogue](https://github.com/nathanhoad/godot_dialogue_manager/blob/main/docs/Using_Dialogue.md), [v3→v4 migration](https://github.com/nathanhoad/godot_dialogue_manager/blob/main/docs/Upgrading_Version.md). Local API: `addons/dialogue_manager/dialogue_manager.gd` and `example_balloon/`.

- Verify the enabled editor plugin's importer and `DialogueManager` autoload. Author `.dialogue` files with named cues (`~ start`), speaker lines and response branches. Dialogue Manager 4 calls these entry points **cues**; verify examples against the installed 4.1.0 API rather than assuming v3 behavior.
- Start with `DialogueManager.show_dialogue_balloon(resource, "start", [context])`, where `context` is a game-owned dialogue adapter. Copy/customize the example balloon into game-owned UI when styling it; do not edit the vendor example in place.
- For a custom renderer, `await DialogueManager.get_next_dialogue_line(resource, cue, [context])`; continue using the line's `next_id` or the selected response's `next_id`. Handle the end-of-dialogue/null result and invalidate awaited work when its scene/session is obsolete. Prefer the built-in example's lifecycle as a reference.
- Expose read-only observations and narrow validated application commands to dialogue conditions/mutations. Line traversal can execute mutations: never traverse a reward-bearing branch merely to preview it, and never directly assign gold, AP, quest completion or skill ranks from dialogue text. Repeated dialogue/claim requests must return the recorded result without duplicate effects.
- `Main` persists while mode children change. Pass explicit state context; if using scene lookup, configure `DialogueManager.get_current_scene` to return the intended mode context. Do not assume Godot's `current_scene` is the active town child.
- Own focus and block exploration input while a conversation is active; restore it on dialogue end, cancellation and scene teardown. Revalidate NPC proximity/session on service commands. Keep dialogue's random flavor separate from gameplay RNG, and keep purchases, recovery, learning and claims behind the normal save gate.

## Verification and delivery

The engine pin is [tools/godot-version.txt](tools/godot-version.txt), currently `4.7.2.stable.official.ed1daf0bf`. Matching export-template requirements are in [tools/export-templates.json](tools/export-templates.json). Do not substitute another editor silently. Current configuration uses Compatibility, 1280×720, `canvas_items` stretch and `expand` aspect.

Run from the project root when validating code/configuration/addon changes:

```sh
export GODOT_BIN="/Applications/Godot.app/Contents/MacOS/Godot"
python3 tools/verify.py --godot "$GODOT_BIN"
```

The wrapper checks the exact version, imports, runs positive and intentional-negative fixtures, smoke-launches headless and checks asset-pack exclusions for all five presets. Logs go to `build/verification/`. The negative fixture must fail with its expected marker; a parse error is not a successful negative test. For a targeted runner invocation after import:

```sh
"$GODOT_BIN" --headless --path . --script res://tests/run_tests.gd
```

For gameplay changes, add focused domain/integration fixtures for the affected rules (invalid-command isolation, RNG continuation, duplicate operations, save retry, resource isolation, or scene lifecycle as relevant). UI/camera/dialogue changes also need a rendered playtest with input/focus and transition cleanup. Beckett can inspect and playtest the editor/runtime when available; discover actual tool/class APIs instead of guessing them.

Phase 0 evidence records asset packs passing but executable exports blocked by missing templates and unverified SDK/signing prerequisites. Reinspect before claiming current readiness. Asset-pack success is not executable, signing, installation or device acceptance. Record fresh engine/platform/scenario/results under `docs/evidence/` when closing a phase, and update only the phase tracker as the completion authority.

For documentation-only changes, check links, paths, API names and status claims; do not claim runtime tests were run. Keep `.godot/`, `build/`, `.firecrawl/`, local MCP credentials and signing material out of committed/shipping content. Preserve vendor licenses and exclude demos/development assets from release packs when integrating them.

## Documentation research

Use Firecrawl for upstream documentation. Read local project docs directly; use installed source to resolve version-specific behavior. Scrape the relevant official page to `.firecrawl/`, inspect the saved content (a successful scrape can still contain a 404), and cite the official URL. The cache is already ignored and is not required to use this guide.

This guide was checked against local addon sources and Firecrawl snapshots on 2026-09-11: `agents-state-manual.md`, `agents-limboai.md`, `agents-limbo-player.md`, `agents-quests.md`, `agents-quest-api.md`, `agents-camera-index.md`, `agents-camera-2d.md`, and `agents-dialogue-usage.md`. Upstream documentation explains APIs; the local gameplay specifications determine this game's behavior. Recheck versions and status before relying on this dated inventory.
