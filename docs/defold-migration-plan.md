# Godot to Defold migration

Research and baseline: 2026-11-24. Target: **Defold 1.14.1 and Lua 5.1-compatible
runtime code**. This is a staged rewrite of engine code, preserving Rebirth
Dungeon's original setting, content, assets, and gameplay. It is not an automatic
scene/GDScript conversion. Defold's runtime/platform language constraints are
documented in [Lua in Defold](https://defold.com/manuals/lua/).

Defold is the active game at the repository root. The final Godot reference lives in
Git history at `54abc9b7b586648874aaeed0904ca9657b3914cf`. To inspect a reference
file, run `git show 54abc9b7:project.godot` or substitute the path from the table
below. The original source artwork, fonts, and palette remain in the checkout.
See the [tooling guide](defold-tooling.md) and [verification results](defold-verification.md).

## Implementation status

| Milestone | Implemented evidence |
| --- | --- |
| Reference/toolchain | Versioned Defold MCP, Exa MCP, two project skills, original JSON catalogs, art, and fonts. |
| Profiles, stats and skills | Lua models, all 24 talent definitions, skill catalogs/AP/training, versioned profiles and defensive storage. |
| ATB and inventory | Independent gauges and command replacement, counters and additional skills, durability, loot, 8×7 spatial inventory/stacks/pouches/equipment and rollback tests. |
| Playable loop | Druid title/creation/arrival/exploration/battle screens, central clipped map, original sprites, damped town camera, keyboard/mouse inventory, and journals. |
| Towns and progression | Both towns/services, gathering/crafting, bank/shop/repairs, armory search, eight rooms/boss/treasure, one-time quest reward, per-character gate registration and travel. |
| Saves and generation | Versioned Lua RNG and Defold profile storage. Godot players create new characters. |
| Verification and cutover | Host and native suites, eight-room journey, macOS and Chromium playtests. See [verification results](defold-verification.md). |

All 20 researched upstream packages are installed at pinned commits, including the
alternatives explicitly requested for implementation. Their sources, runtime
adapters and authoring tools are listed in [installed dependencies](defold-dependencies.md).
The milestones below retain the design and acceptance rationale; the table above
records the implementation rather than requiring a second port.

## Historical port design

The port began with deterministic rules, then connected one playable loop and
restored the remaining UI and content. Desktop keyboard and mouse were the first
parity target. HTML5 followed after the vertical slice. The sections below capture
the original design and acceptance criteria with the save policy updated for cutover.

Use **Druid for GUI components**, a small explicit application state controller,
Defold tilemaps/sprites, and pure Lua game models. Evaluate Monarch for screen
transitions once the first modal stack exists. Do not reproduce every Godot
plugin dependency: several current integrations are only enabled, while custom
scripts already implement the actual game rules. The dependency shortlist below
separates useful libraries from optional future additions.

## Source behavior and Defold counterparts

The frozen Godot revision and its **149 GUT tests in 20 test files** were the
reference during the port. The earlier
[gameplay plan](mabinogi-inspired-gameplay-plan.md) also contains a historical
paired-turn prototype and outdated plugin intentions; current ATB code and tests
take precedence when those disagree.

| Area | Historical Godot source | Defold counterpart and parity requirements |
| --- | --- | --- |
| Entry flow | `scenes/title.tscn`, `character.tscn`, `arrival.tscn`; corresponding scripts | Collections/GUI for title → character creation/selection → Waking Vault arrival → town. Preserve cosmetics, race/age/talent choices and profile selection. |
| Stats/skills | `character_data.gd`, `character_stats.gd`, `character_skills.gd`; 11 skill JSON files | Pure Lua calculations and definitions, qualifying training events, AP costs, ranks, talent bonuses, cross-talent learning. |
| ATB combat | `spider_encounter.gd`, `spider_warrens.gd`, `combat_intent_ai.gd`, `scripts/ai/combat_intent.tres` | Pure encounter model + engine clock adapter + Druid battle panel. Preserve multiple enemies, selected target, latest queued command, independent gauges, guard/interrupt rules, stamina, additional skills, gear wear and logs. |
| Towns | `dungeon_town.gd`, `lantern_rest_map.gd`, `town_activities.gd`, `firewood.gd`, `blacksmith_shop.gd` | Monster-free Lantern Rest/Spindle Hollow, NPC services, shops/bank/healer/smith, gathering/crafting, Moon Gate registration and travel. |
| Hostile passages | `dungeon_entry.gd`, `threshold_rooms.gd`, `dungeon_enemy_movement.gd`, movement tree | Pure grid/navigation/generation models; tilemap renderer and actors. Preserve room/run/chest progression, click-to-move and enemy movement only after a successful player step. |
| Inventory | `sword_satchel.gd`, `sword_catalog.gd`, `exploration_inventory.gd`, `armory.gd`, GLoot | Pure Lua occupancy/transaction model; Druid grid and equipment views. Preserve the 8×7 satchel, footprints, stacks, gold pouches, equipment swaps and failure rollback. Additional general-purpose bags remain a later feature unless already specified by a parity test. |
| Loot/economy | `battle_loot.gd`, `gold.gd`, `consumables.gd`, durability/repair scripts | Committed transactions for loot, overflow/pending loot, shop balances, bank, tonic use, durability and repair. |
| Dialogue/quests | Direct NPC UI, `exploration_journal.gd`, `world.quest` | Small data-driven Lua conversations and quest state first. Source Code Pro dialogue/journal views. Store integer quest progress without replaying rewards. |
| Shared presentation | `menu_style.gd`, `exploration_layout.gd`, status/inventory/journal scripts, `character_sheet.gd`, `game_audio_settings.gd` | Departure Mono menus/HUD, Source Code Pro long text, central clipped map, status/log panels, keyboard focus, tooltips, volume settings. |
| Persistence | `character_store.gd`, legacy satchel files | Versioned Defold profile schema, validation, backups and tested commit/rollback behavior. |

GLoot, Phantom Camera and LimboAI are used directly. Gaea is installed for future
use; the current threshold generator is custom GDScript. GECS, Dialogue Manager,
and QuestSystem are enabled/autoloaded, but inspected gameplay still uses custom
state and direct NPC/quest handling. Do not assume authored dialogue/quest assets
existed simply because their plugins were enabled.

Portable content includes `data/swords.json`, `data/spiders.json`,
`data/blacksmith_shop.json`, `data/skills/*.json`, original PNG atlases, Aseprite
sources, font files/licenses, and Dungeon-20. Keep stable IDs. Godot `.tscn`,
`.tres`, `.uid`, `.import`, GDScript, shader code and native plugins need rebuilding
or replacement; do not copy `addons/` into the Defold project.

## Target architecture

Proposed layout, introduced incrementally rather than as empty scaffolding:

```text
./
  game.project
  main/                    bootstrap and application lifecycle
  game/
    model/                 combat, stats, skills, inventory, economy, quests
    world/                 grids, seeded generation, movement and gate registry
    data/                  original JSON definitions with stable IDs
    services/              profile storage, import/export, settings, event dispatch
  screens/                 title, characters, arrival, exploration and battle
  ui/                      Druid components, focus/navigation, inventory, journals
  render/                  map viewport, world camera, pixel-snapped presentation
  assets/                  selected PNGs, atlases, fonts and licenses
  tests/                   Lua model specs, test collection and fixtures
```

**Simulation.** A session owns the selected character, location and encounter
state. Pure Lua functions accept state/commands and produce results plus domain
events. Validate first, commit once, then notify the UI. Separate simulation
events from UI clicks so reopening a menu cannot award training or quest rewards.
Required Lua modules are cached; use constructors/reset functions rather than a
module-level mutable character singleton. See
[writing code](https://defold.com/manuals/writing-code/).

**Time.** Keep exploration's successful-step clock separate from combat's elapsed
time. Run a controlled ATB time-step with documented event ordering, based on
current tests and recorded traces. Do not use animation-completion callbacks as
combat authority. Freeze simulations only where the existing game does; selecting
combat skills/items must keep both sides' clocks running. Consumables must retain
the player's gauge. Define behavior for long frame gaps and simultaneous readiness
and test it, rather than allowing a change of engine to change combat outcomes.

**World.** Keep walkability, occupancy and BFS/pathfinding in grid coordinates,
with explicit grid ↔ world ↔ viewport transforms. Runtime tilemap APIs can draw
generated terrain; collision physics need not decide grid legality. Enemies are
data records, represented by sprites as needed. Start with current BFS and intent
rules, not a new AI framework. Defold supports runtime
[tilemap updates](https://defold.com/manuals/tilemap/).

**Presentation.** Render the world only inside the central map panel; draw HUD
and modal GUI in screen coordinates. GUI clipping alone does not clip unrelated
world sprites. Spike a render viewport/render target solution before committing
to a camera library, and ensure mouse picking uses exactly the same transforms.
Use integer-snapped camera positions, nearest sampling, and an explicit resize
policy. Druid provides widgets, not Godot's container layout system; encode
panel anchoring/layout and a consistent keyboard focus policy. See the
[render manual](https://defold.com/manuals/render/) and
[input manual](https://defold.com/manuals/input/).

**Content.** Initially copy only required original assets under `assets/`
and keep JSON under `game/data/`, with a deterministic sync/validation step
to avoid two independently edited catalogs. Register JSON as custom resources
and load via `sys.load_resource()` + `json.decode()`; don't assume editor-local
filesystem paths will work in a bundle. See
[file access](https://defold.com/manuals/file-access/).

Use the existing `.otf` fonts; Defold documents OpenType support. Create explicit
font resources and verify them on the pinned engine. Use static bitmap glyphs at
the intended sizes with antialiasing disabled for Departure Mono's pixel UI;
evaluate Source Code Pro separately for long-form readability. Include required
glyphs, punctuation and licenses. Do not rely on new font-resource defaults,
which current docs describe as vector/dynamic. See
[fonts](https://defold.com/manuals/font/).

## Defold and Lua library shortlist

The [plugin research](defold-plugin-research.md) contains upstream evidence,
compatibility/licensing notes and original adoption recommendations. The user
subsequently requested the full list: all packages are now installed, while
alternative frameworks remain explicitly selected rather than sharing input.

| Candidate | Game fit | Recommendation |
| --- | --- | --- |
| **Druid + Defold Event** | Buttons, text/input, lists/scrolling, reusable GUI components for inventory, skills, journals and shops | First UI candidate: verified upstream pair Druid 1.4.2/Event 21. Prototype keyboard/gamepad focus and inventory controls; implement missing focus rules explicitly. |
| **Monarch** | Title/character/town/battle screen lifecycle, popups and transitions | Evaluate after the first modal flow. Keep combat ticking outside screen lifecycle. |
| **DefTest** | In-engine Lua suites, setup/teardown, assertions | First test-framework candidate; use a separate test collection and process exit status. |
| **LuaUnit** | Engine-independent model tests on desktop Lua/LuaJIT | Alternative/complement if it improves fast model testing. Avoid maintaining duplicate test suites. |
| **Defold Orthographic** | Camera follow, bounds, coordinate transforms | Optional Phantom Camera replacement after map-panel clipping/picking spike. A native camera plus a small adapter may suffice. |
| **defold-input** | Higher-level input helpers | Evaluate for action/rebinding persistence needs; core input bindings still need a game-specific modal/focus policy. |
| **Defold RichText** | Formatted dialogue/logs and inline icons | Optional; compare against the pinned engine's native rich text before adoption. Source Code Pro remains the text font. |
| **Narrator** | Ink-style branching narrative | Defer until branching content warrants it; not a QuestSystem save/reward replacement. |
| **defold-ink** | Runtime for compiled Ink JSON | Alternative to Narrator; test exact compiler compatibility and reward-safe restore. |
| **tiny-ecs** | Lua ECS systems for many actors | Defer. Current gameplay does not require a replacement ECS just because GECS is enabled. |
| **Jumper** | Lua grid pathfinding | Optional if current BFS becomes insufficient. Match collision, diagonal and tie-break rules first. |
| **rotLove** | Roguelike generation/FOV algorithms | Research/reference candidate; audit LÖVE dependencies and selectively adapt modules. It is not a drop-in Defold plugin. |
| **def-behavior-tree / lua-state-machine** | More complex enemy decisions or explicit finite states | Defer while the existing intent rules fit small Lua functions; neither supplies the combat clock or resolver. |
| **Gooey** | Lightweight GUI widgets | Alternative to Druid, not a second UI framework to install alongside it. |
| **Asefold / Defold Aseprite Scripts** | Tagged animation import and original pixel-art workflow | Optional authoring tools. Start with exported PNGs + Defold atlases and manual tags; evaluate import helpers only after a representative animation passes. Keep Aseprite MCP. |
| **Official Automation Bridge** | Debug runtime inspection, scripted input, screenshots and application state | Add later for integration/visual tests after reviewing native-extension/platform requirements. Separate from the requested community MCP. |

No third-party inventory or quest package is proposed as a complete replacement:
the game's transactional inventory, training and per-character quest semantics
belong in its model. Likewise, a small Lua intent selector can replace the shallow
current LimboAI trees before a behavior-tree package is justified.

## Milestones and acceptance gates

### 0. Establish tooling and freeze the reference

**Implemented:** MCP installation/configuration, the playable Defold project,
version/dependency pins, agent instructions/skills, reproducible build/run checks,
source research and a passing Godot reference baseline.

**Exit:** model and integration fixtures cover both towns, character switching,
registered gates, inventory, partial dungeon runs, and pending loot. The
desktop and browser playtests capture screenshots, logs, and structured receipts.

### 1. Port definitions, profiles and pure calculations

Port character definitions/stats, all skill definitions/training, gold,
consumables, durability/repair and shop calculations. Build a versioned profile
schema before screens begin modifying saves. Preserve
zero-based serialized enum/index meanings even though Lua arrays usually start
at one. Preserve integer validation, maximums, deep-copy boundaries and rejection
of malformed data.

**Exit:** each corresponding GUT behavior has a Lua assertion or an explicit
engine-integration replacement. Fixtures normalize identically; switching
characters cannot share state; failed writes preserve the previous state.

### 2. Port combat and enemy intent

Translate `spider_encounter.gd` first; move view-driven queue handling from
`spider_warrens.gd` into an explicit command controller. Preserve 2.5-second player
charging and current enemy timing (default 4.5 seconds with group offsets), intent
cadence, target rules, stamina and Counterattack/Windmill alongside the three core
melee counters. Port existing intent choices as small tested Lua functions.

**Exit:** all nine basic melee matchups and relevant asynchronous cases pass;
add direct model fixtures for combinations the normal enemy cadence cannot reach.
Smash bypasses Defend reduction while armor remains separate, Defend mitigates
Normal Attack, and Normal Attack interrupts Smash. Latest command wins, invalid
commands preserve state, items leave the player gauge intact, groups end only
after the final enemy, rollback restores full encounter state, and messages
explain outcomes. Replay timed traces at different update schedules.

### 3. Port inventory and committed rewards

Replace GLoot with a pure occupancy model; port exact item definitions, stack
limits, 8×7 storage and equipment behavior. Stage moves in a working copy; validate
bounds, overlap, ownership and slots; persist; then publish the committed result.
Port pending loot, gold pouches, repair costs and shop/equipment side effects.

**Exit:** full bags, failed swaps, invalid legacy coordinates, overlapping items,
duplicate items and failed writes never lose or duplicate gear/currency. The
model works without UI, and keyboard placement/equipment scenarios are specified
for the Druid view.

### 4. Prove the world renderer and one playable loop

Port Lantern Rest grid data, one threshold room, actor stepping/BFS and a single
encounter. Add the central clipped map, pixel-snapped camera, status panel,
message log and a basic Druid action/loot panel. Start with a few original PNGs
and both required fonts. Use input actions rather than scattered raw-key checks.

**Exit:** create/load character → enter town → walk into a hostile room → read
intent → queue/replace an action → win → take/equip loot → train a skill → return
and save/reload. Keyboard and click-to-move agree on cell selection; UI input
cannot move the player behind a modal; world sprites stay inside the map panel.
Inspect screenshots and runtime logs at the reference viewport and a resized
window. This is the first playable migration slice.

### 5. Restore the remaining game flow and services

Add arrival, character previews, both towns, NPC services, smith/shops/bank,
healing, gathering/crafting, journals/skills/equipment screens, quick slots, volume
settings, threshold's eight combat rooms and treasure room, chest/run state and
map-position restoration. Translate current quests/conversations as data and
small state transitions. Preserve register-in-person Moon Gates and per-character
travel availability. Add Monarch only if it simplifies the actual screen/modal
stack proven here.

**Exit:** each row in the source inventory has an implemented counterpart and
passing acceptance checks. Quest rewards and skill events commit exactly once;
gate state, shops and NPC progress survive reload and character switching.

### 6. Verify Defold saves and seeded-world generation

Validate corrupted profiles, backups, interrupted writes, character switching,
and progression across reload. New Defold worlds use a versioned Lua generator.
Players moving from Godot start with a new Defold save.

### 7. Platform verification and cutover

Run model suites, an engine test collection and the complete gameplay smoke
journey. Add debug-only Automation Bridge tests if useful. Build desktop bundles
and an HTML5 bundle, test keyboard focus, browser storage, resizing, pixel fonts,
long logs, atlas seams and input timing. Profile the full HUD/inventory before
adding optimization libraries. Review third-party licenses and pin all adopted
dependency archives.

**Exit:** passing model and engine tests, repeatable desktop and browser
playtests, and a Defold-only checkout. The Godot project is recoverable from the
reference revision in Git history.

## Save policy

Defold uses its own character store. Godot saves are outside the migration scope.
Create a new character in Defold. Existing Defold profiles continue to load through
the same validated storage and backup recovery paths.

## Verification strategy

Keep the 149 GUT tests as the reference checklist, porting their assertions rather
than simply aiming for the same test count. Use pure Lua tests for calculations,
transactions, generation and reducers; engine tests for messages/lifecycle/input,
GUI focus and resource loading; full-flow tests for combat → loot → save/reload.
Define completion markers and failing process exit codes for unattended runs.
The [official testing guide](https://defold.com/manuals/automated-testing/)
recommends separating these layers and using Bob for reproducible builds.

For every milestone, retain the specific command, result and useful failure logs.
Visual checks need a stated viewport and criteria: readable intent cues, visible
focus, unclipped long text, crisp 16×24 silhouettes and Dungeon-20 contrast, a
central bounded map and scannable status/log panels. Compilation and the tooling
smoke check alone do not establish gameplay parity.

Use the same deterministic and runtime checks for subsequent gameplay changes.
