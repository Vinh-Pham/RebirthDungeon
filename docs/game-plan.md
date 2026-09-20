# Rebirth Dungeon — Defold implementation plan

## 1. Scope and project baseline

Build a desktop-first, local single-player, top-down RPG in **Defold and Lua**:

**Create character → explore Town1 → enter procedural Alby → fight turn-based battles → defeat the boss → choose treasure → return to town.**

The first playable implementation was added on **2026-09-20**. This document remains the design contract; [implementation status](implementation-status.md) and [verification](verification.md) distinguish completed work from remaining release checks and milestone 6.

| Resource | Current use |
| --- | --- |
| `game.project` | Defold 1.13.1, 1280×720 design canvas, pinned dependencies, zero-gravity top-down physics |
| `main/main.collection` | Persistent session, HUD, audio and sibling Monarch screen proxies |
| `game/domain/` | Copied candidate commands, characters, inventory, dungeon, fixed-Speed battles and save validation |
| `game/services/` | RNG replay, native A*, DefSave A/B recovery, Quest isolation and Ink continuation |
| `game/ui/`, `game/world/`, `screens/` | Druid interfaces, world presentation and screen lifetimes |
| `assets/` | CC0 placeholder tiles, font resources, original placeholder audio and compiled story |
| `tests/`, `tools/` | Lester rules, native fixtures, process-restart and GUI journey harnesses; pinned build helper |

The shell uses fixed-fit projection and GUI adjustment, with a shared world view translation for camera following. Occupancy generates both A* maps and static collision shapes; the player uses a kinematic collider and axis-resolved movement. Desktop is the acceptance target. HTML5 remains unverified.

**Design precedence:** this document governs Defold architecture and delivery. The [documentation index](README.md) maps the aligned contracts. Use the fixed-Speed combat design in [turn-based-plan.md](turn-based-plan.md); the [gameplay documents](gameplay/README.md), [architecture notes](architecture.md), [library integration plan](turn-based-rpg-battle-libraries.md), and [combat-log design](combat-log.md) expand requirements at the milestones below. They include both first-release contracts and later expansion requirements. Browser libraries, installed-status claims and save migrations survive only as explicitly historical source references. Resolve future gameplay changes in this plan before implementing conflicting contracts.

No Phaser, Rex, React, HeroUI, XState, Immer, IndexedDB, Vite, pnpm, or browser test infrastructure is required for the Defold runtime. Start a separately versioned Defold save format. Importing old browser saves is a future feature requiring real fixtures and an explicit conversion contract.

## 2. Engine and extension foundation

### Dependency policy and local documentation

Use Defold's **Project → Dependencies → Fetch Libraries** workflow for libraries packaged as Defold projects. Pin tested release archives or commit archives, record the engine version and platform build results, and review upgrades deliberately. A default-branch ZIP in upstream documentation is discovery information, not a reproducible production pin. See the [Defold library manual](https://defold.com/manuals/libraries/).

The following references document all requested libraries. **All 11 are integrated at pinned revisions.** Nine are project dependencies; Lume and test-only Lester are vendored Lua modules. The pinned Event revision includes a native context helper, in addition to the RNG, A*, DefSave and project writer-lock extensions in the custom engine.

| Extension | Responsibility | Local documentation |
| --- | --- | --- |
| Druid | Defold GUI components, forms, buttons, lists, and HUD interaction | [Druid](references/defold/druid.md) |
| Monarch | Collection-based screen navigation, popups, focus, and transitions | [Monarch](references/defold/monarch.md) |
| Defold Event | Notifications and callbacks between services and presentation | [Defold Event](references/defold/defold-event.md) |
| Defold RNG | Independent seeded random generators behind a save-aware adapter | [Defold RNG](references/defold/defold-rng.md) |
| A* Path Finding | Native grid pathfinding for click-to-move and NPC approach | [A* Path Finding](references/defold/defold-astar.md) |
| DefSave | Local persistence backend behind validation and recovery logic | [DefSave](references/defold/defsave.md) |
| Defold Tweener | Scalar animations, UI feedback, and audio fades | [Defold Tweener](references/defold/defold-tweener.md) |
| LUme (Lume) | Small math, table, and string helpers | [Lume](references/defold/lume.md) |
| Lester | Lua rule tests and assertions in a separate test harness | [Lester](references/defold/lester.md) |
| Defold Quest | Quest definitions, objectives, prerequisites, and progress | [Defold Quest](references/defold/defold-quest.md) |
| defold-ink | Compiled Ink dialogue, choices, variables, and story continuation | [defold-ink](references/defold/defold-ink.md) |

The [extension index](references/defold/README.md) records source dates and compatibility limitations. Druid and Defold Quest both use Defold Event; their READMEs currently recommend different Event tags. Select **one** compatible Event version after integration tests, avoiding duplicated `event` folders. Defold RNG and A* require a custom engine build; verify native-extension builds on every shipping platform early.

Retain Mabinogi and Dicero source material in [the reference library](references/README.md). Existing web-stack references remain historical. New documentation is a project-oriented summary with upstream links, retrieval dates, and limitations; raw research captures stay in ignored `.firecrawl/`. Retrieved source text is reference data, not project instructions.

### Proposed resource layout

The architecture below is the original proposed layout. The implemented files are mapped in [implementation status](implementation-status.md):

```text
main/                         persistent bootstrap collection and service scripts
screens/                      title, characters, town, dungeon, battle, treasure
ui/                           GUI scenes/templates, Druid components, HUD, popups
game/domain/                  pure Lua rules, commands, validators, progression
game/runtime/                 session routing, command queue, presentation events
game/services/                save, RNG, pathfinding, quests, dialogue, audio adapters
game/content/                 item, skill, enemy, quest, and room catalogs
assets/                       sprites, atlases, tiles, fonts, audio
assets/dialogue/               authored Ink and versioned compiled JSON
vendor/                       pinned Lume with license and provenance
tests/                        Lester, fixtures, pure Lua runner, engine test collection
docs/references/defold/        verified extension integration notes
```

Use `.collection`, `.go`, `.script`, `.gui`, `.gui_script`, `.atlas`, `.tilemap`, `.tilesource`, and sound resources for engine-owned objects. Use `require` modules for shared Lua logic. Document table contracts with Lua annotations and runtime validation rather than assuming TypeScript checks exist.

## 3. Architecture, state, and persistence

### One owner for each fact

| Layer | Owns |
| --- | --- |
| Domain modules | Character values, combat rules, inventory, economy, progression, rewards, content validation |
| Session service | Serialized command processing, workflow checkpoints, save completion, and routing |
| Monarch | Visible screen stack, transitions, and screen input focus |
| Defold world scripts/components | Movement, collision response, camera, sprites, tilemaps, and audio presentation |
| GUI + Druid | Forms, controls, menus, HUD, journal, inventory display, transient focus/selection |
| Quest and Ink adapters | Library state within the same character transaction; quest evaluation and authored dialogue |
| Defold Event | Committed-change notifications; no independent gameplay store |

Lua tables are mutable. Treat committed state as read-only by convention: modules must not expose writable internal references to UI consumers. Compute a candidate from an explicit deep copy or carefully owned copied branches, validate it, then publish after saving. `lume.clone` is shallow and is not a replacement for Immer. Use finite numbers, strings, booleans, plain tables, and stable IDs in saves; exclude game-object URLs, hashes as persistent identities, vectors, functions, native RNG objects, GUI nodes, and tween handles.

Define contracts for character/profile data, item instances, skill definitions, dungeon runs, battle state, commands, committed events, reward offers, quest/story state, workflow checkpoints, and the save envelope. Content catalogs remain separate from instances. Every battle command carries actor, battle, expected turn, and operation IDs.

Use small explicit Lua state machines for session and battle routing. Monarch changes screens; it does not validate combat phases. Defold Event distributes notifications; it does not enforce ordering, durability, or exactly-once execution. Shared Lua state is already enabled, so module singletons need explicit reset/switch behavior between characters and tests.

### Transaction flow

1. GUI or world input submits a command to the session service.
2. Validate phase, identities, target, resources, content references, and permissions against the committed state.
3. Compute the entire candidate: costs, results, quest/story progress, RNG continuation, event batch, claim markers, and next checkpoint.
4. Validate and persist that candidate through the save adapter. Serialize writes; accept no competing command while committing.
5. Publish only after a confirmed save. Notify subscribers, route Monarch if needed, and play effects.
6. On failure, discard the candidate and restore any staged library state; retain the prior committed snapshot and offer retry.

Use a bounded operation ledger for retries and durable claim IDs for rewards. An event subscriber, animation callback, or Ink observer must never directly grant gold, consume items, or advance a turn. Presentation can be skipped after restart without replaying results.

Defold Quest's module state and callbacks need special care: bind a copied candidate state before evaluating quest events, collect resulting notifications, and suppress outward side effects until commit. Restore/reinitialize the previous quest state and clear stale queued notifications on failure. Prove this adapter's isolation before relying on it. Recreate or restore an Ink instance from committed story state before a transactional choice; commit its continuation together with any permitted gameplay command.

### Save format and recovery

Use DefSave with a stable application name, up to **20 characters**, and **one unfinished run per character**. Store settings separately from each character's complete gameplay envelope. Keep character/run/quest/story/reward data that must commit together in the same envelope; do not split an award and its claim marker across DefSave files.

The save adapter must provide:

- Format, rules, content, RNG, and story versions; strict structural and domain validation; explicit migrations for future Defold formats.
- Alternating A/B slots per character with monotonic generations. Write only the inactive slot, check the backend result, reload and validate it, and retain the last valid slot. At startup choose the highest valid generation; no separately written pointer is required.
- A recoverable character index: an interrupted profile/index update must not orphan a valid character. Use stable profile IDs and reconcile index entries against valid slots.
- An explicit policy for a write whose outcome is uncertain: inspect disk before retrying; operation IDs prevent a committed result from being awarded again.
- No silent substitution of default data for corrupt existing saves. Offer the previous valid generation or a recovery message. Reject unsupported future formats without overwriting them.
- Explicit saves at turns, purchases, reward claims, dialogue/quest decisions, and transitions. Movement can checkpoint periodically and at interactions. Settings may debounce writes.
- A single writable desktop process per save directory, with a platform-tested lock or equivalent guard before enabling concurrent launches. A second instance must not write the same profiles.

DefSave does **not** supply these transaction, migration, lock, or corruption-recovery guarantees by itself. Confirm its selected revision's return values, error handling, serializer, and limits during the persistence milestone; adapt or patch the backend if errors cannot be observed. Do not describe successful function return or shutdown autosave as crash-proof durability. Restart and interrupted-write tests gate gameplay transactions.

### Deterministic randomness

Keep separate world-generation, reward, and battle streams. Cosmetic effects must not advance them. All authoritative random calls go through the Defold RNG adapter; previews and rejected commands consume no draws.

The documented RNG API has seeded constructors and drawing methods but no state-export/import API. For the first implementation, use explicitly seeded PCG32 and persist `{format_version, algorithm, seed_state, seed_sequence, raw_draw_count}`. Restrict seeds to exactly representable 32-bit integers. Implement all sampling through `number()`, counting every raw draw including rejection samples; restore by constructing the same generator and replaying exactly that count. Record range mapping and probability-edge rules in fixtures. Never mix convenience methods with an assumed one-draw counter.

This replay strategy is project-owned, not an extension guarantee. Test known sequences, failed-write retries, and cross-platform continuation against the pinned extension. Bound stream lifetimes and measure resume cost; introduce a verified native state export before long streams become too expensive. Persist generated layouts and chest offers so loading never regenerates existing content from a seed alone.

## 4. Screens, input, and world presentation

Screen flow:

`Bootstrap → Title → CharacterSelect → NewCharacter/Resume → Town1 → Alby ↔ Battle → TreasureRoom → Town1`

Keep session/save/audio services and the HUD in the bootstrap collection. Register world screens and popups centrally as sibling Monarch screens. Use collection proxies for world screens with independent lifetimes and time steps; avoid nesting child screens inside a proxy-owned screen, which Monarch documents as an input limitation. Rebuild world presentation from saved state when returning from battle.

- **Title:** title and Start; neutral HUD placeholders before character selection.
- **CharacterSelect:** character cards, count, New Character, Play/Resume, and Rebirth.
- **NewCharacter:** trimmed name, 2–24 characters, case-insensitively unique; Human/Elf/Giant; age 10–17; Archery/Dual Gun/Magic/Close Combat. Validate Unicode length and name normalization through an explicit policy, not Lua byte length alone.
- **Rebirth:** reuse creation controls with identity locked and a confirmation preview.
- **HUD:** dark translucent panels, thin borders, teal icons, magenta HP, blue Mana, yellow Stamina, segmented teal EXP. Implement in Defold GUI with Druid; no external screenshot is required to define these initial visual targets.
- **HUD actions:** Character, Skills, Talent, Quests, Inventory, Pets, and Menu. Inventory and the onboarding journal are functional in the first slice; Talent/Pets may show clear unavailable states. Schedule richer skill/journal systems from the gameplay docs after the slice.
- **Settings:** music/effects volume, reduced motion, HUD scale, and controls. Returning to Title saves and suspends the run.

Extend input bindings for WASD/arrows, `E` interaction, Escape, pointer buttons/motion, scroll, text entry, and GUI navigation. Match Druid's expected action IDs or configure its input mapping explicitly. Relay GUI lifecycle callbacks and return Druid's input-consumption result. Coordinate its focus acquisition with Monarch; do not blindly add focus requests to every component.

Use one input policy and one player movement writer. Normalize diagonal keyboard movement. A world click converts screen coordinates through the active camera to a walkable grid destination. A* supplies waypoints; keyboard movement cancels the path. Clicking an NPC chooses a reachable position within interaction range. A path is a navigation request, not permission to move through colliders.

For the first slice, open service panels and modal workflows block world controls and pause world updates. Clear held keys and stop movement on focus loss, popup opening, transition, and suspension. Because root services are outside a paused proxy, gate their simulation work explicitly. GUI layers and HUD bounds must also prevent clicks leaking into world movement. More flexible nonblocking windows are a later port of the browser window design.

Use kinematic movement with static walls and trigger interactions; keep collision geometry and the pathfinding grid derived from the same authored/generated occupancy. Begin with four-direction A* routes to avoid corner-cutting; keyboard movement may still be normalized eight-direction movement with collision resolution. Test camera zoom, map origin, grid indexing, actor clearance, blocked goals, gate changes, and no-path results.

Use native `go.animate`/`gui.animate` for supported properties and Tweener where a scalar callback is useful. Retain handles, cancel on screen shutdown, ignore stale operation IDs, and keep hit shake on visual children. Reduced motion must still finish presentation pacing. A persistent audio service owns reusable music tracks and volume-aware fades.

## 5. Town, characters, and progression

Create a handcrafted Tir Chonaill-inspired Town1 with a square, stream, bridge, outskirts, and northern dungeon approach. Use original art and dialogue/service panels rather than separate interiors.

| Location | Function |
| --- | --- |
| Healer House | Paid restoration and free recovery after defeat |
| Grocery Store | Stamina-restoring food |
| Bank | Character-specific item and gold storage |
| Blacksmith | Weapons and repairs |
| General Shop | Potions, basic armor, and item sales |
| Alby entrance | Dungeon entry and onboarding dialogue |

Initial economy: 100 starting gold, 30 inventory slots, 60 bank slots, consumable stacks of 99, individual equipment instances, sale value 25% of purchase price. Food costs 5 gold and restores 20 Stamina; potions cost 10 gold and restore 30 of their resource; healing costs 10 gold. Weapons start with 20 durability and lose one per committed attack action, not per animation or hit; at zero, halve their weapon contribution. Repair costs one gold per missing point. Keep unarmed attacks available and defer ammunition. Store prices, restrictions, and loot tables in content modules. The richer footprint inventory in [inventory.md](gameplay/inventory.md) is a later milestone, not existing Defold behavior.

Preserve the original progression targets using the saved Mabinogi references, prioritizing current growth tables over contradictory historical prose:

- Shared base stats, a defined combat EXP table, and level 200 cap per life; preserve fractional talent growth.
- Human/Elf can select all four talents; Giant cannot select Archery. Equipment restrictions are independently validated.
- Award one AP per level and five per weekly aging event. Track AP even before the complete ranking UI is implemented.
- Age at Saturday noon in `America/Los_Angeles`, with offline catch-up and talent aging bonuses through age 20, once per boundary.
- Lua's local OS time conversion is not an IANA timezone implementation. Provide a tested timezone/boundary adapter, independent of the computer's timezone, covering DST, clock rollback, and missed weeks. Inject time into domain rules.
- Rebirth cooldowns are 1/2/4/6 days below cumulative level 5,000/8,000/10,000/otherwise, measured from creation or the last rebirth.
- Rebirth allows a compatible talent and age 10–17, no older than current age. Process pending aging and require abandoning an active run first.
- Reset current level, EXP, and temporary growth; retain identity, cumulative progression, AP, learned skills, possessions, and bank.
- Creation grants the starter weapon/skill plus Combat Mastery F and Defense F. Rebirth unlocks new talent starter skills without duplicating item gifts.

Ranked skills, advanced stats, titles, enchants, and the broader quest catalog remain porting work described by the gameplay docs. Do not fabricate values for unverified wiki entries or claim TypeScript catalogs exist in this checkout.

## 6. Alby, combat, quests, and rewards

### Dungeon and encounters

Generate eight connected rooms: entrance, three required encounters, boss room, two optional side rooms, and a treasure room beyond the boss. Join seeded room templates with corridors; validate doors, occupancy, spawns, and boss access. Teach encounters through visible spider contact, a trapped chest, and a room switch. Required encounters unlock the boss gate; optional rooms contain an encounter and supplies.

Include small/white spiders, stronger red spiders, and a Giant Spider with two adds. Persist generated layout, encounters, gates, room-clear flags, and return position. Defeat ends the run and returns the hero fully restored to the healer, retaining claimed rewards and EXP. Confirm early abandonment and retain claimed rewards. Neither defeat nor abandoning a run counts as a successful dungeon clear.

### Turn-based combat

Use the gameplay rules in [the turn-based design](turn-based-plan.md), expressed as pure Lua commands and a serializable queue. There are no dice rolls, holds, reroll rounds, or combination multipliers in this target.

Runtime routing:

`enter → begin_turn → player_input / enemy_decision → commit → present → next_turn / victory / defeat`

A save error returns to a recoverable commit state. The domain turn cursor, turn-start marker, and committed event batch determine restoration; animation state is transient.

- Freeze player Speed at encounter entry: `10 + floor(DEX / 10)`. Initial speeds: White Spider 9, Red Spider 12, Giant Spider 8.
- Sort descending Speed; break ties with a seeded shuffle once, then save the order. Every living actor acts once per round. Skip defeated actors; no mid-battle reordering.
- A player turn allows one optional eligible item followed by **Attack, Skill, or Defend**. The main action ends the turn. Item use persists immediately and keeps the same turn ID.
- Select a living target; Attack/Defend and an available selected skill execute directly. Menus/target selection spend nothing. Show exact cost, cooldown, disabled reason, and item allowance.
- Attack uses the weapon category or unarmed melee. Combat Mastery F–1 controls its base SP cost: `2 + 0.1 × rank_index`, with F = 0 and rank 1 = 14. Apply modifiers and round final Attack cost upward to one decimal place.
- Recover SP once at owner turn start: 0.5 for F–D, 1.0 for C–A, 1.5 for 9–7, 2.0 for 6–4, 2.5 for 3–1. Cap at maximum; preserve fractions.
- Skills use catalog-defined ranks, targeting, weapon/race restrictions, costs, cooldowns, and effects. Defense uses rank-based SP, Defense, and Protection and expires at the next owner turn start. An emergency Wait is legal only when no main action is affordable, as defined in the turn-based contract.
- Share formulas between previews and resolution. Keep the documented critical, multi-hit, status, and owner-boundary policies; previews never roll randomness.
- Enemies submit the same validated commands. Port the spider skill/AI rules from the turn-based design; optional enemy items require explicit finite inventory permission.
- Check termination after actions, reactions, and periodic effects. No dead actor acts, and no later effect grants another victory.

The first combat slice implements the starter skills and spiders with validated Lua content, then expands rank/status coverage. Persist ordered event IDs and a bounded action log alongside outcomes. [Per-battle archives](combat-log.md) are a later storage milestone; logs never execute gameplay commands.

### Quest and dialogue integration

Defold Quest owns objective evaluation; defold-ink owns authored dialogue and choices. Start with **enter Alby → win a battle → defeat the boss → claim treasure and return**. Use stable quest/task IDs and explicit evidence from committed domain actions. The journal reflects committed progress; manual claim commands grant rewards exactly once.

Compile `.ink` to UTF-8 Ink JSON using a compiler compatible with the pinned runtime, package JSON as custom resources, and render paragraphs/choices through Druid. Version story content and persist the selected library save representation. On restoration, suppress external gameplay side effects and rebuild the current dialogue presentation. Quest rewards, trade, and bank operations always go through the session service, even when initiated by story choices.

Broader quest stages, run-banked evidence, tracked quests, overflow grants, and Aren's memory from [quests.md](gameplay/quests.md) follow after the initial loop. A future role-play actor must have isolated stats, inventory, quest state, and RNG; shared singleton modules must never leak progress back into the hero.

### Rewards and treasure

Victory grants EXP once and creates persisted gold/item offers. Support individual selection, Take Selected, and Take All. Preserve unclaimed offers until confirmed departure; never silently discard overflow. Ordinary victories return to Alby. Boss victory grants EXP and one run-specific treasure chest key, then opens the east passage to the walkable treasure room instead of creating an ordinary gold/item offer.

Generate and save five hidden chest offers with boss victory. Each unopened chest costs one key; save key consumption, opened state and pending rewards together. The boss currently drops one key, but multiple keys can open multiple distinct chests. A clickable goddess statue confirms closing the run and returning to the town gate, with collected possessions retained. Unused keys and unopened chests are left behind. Repeated clicks, failed saves, quest callbacks and restart must not duplicate keys or chest payouts.

## 7. Verification and delivery gates

### Lua and engine tests

Use **Lester** for pure Lua domain tests with injected time, RNG, and storage. Provide a plain Lua/LuaJIT runner with a nonzero failure exit and a separate Defold test bootstrap for engine-backed integration. Lester is an assertion/test framework, not a GUI driver or coverage tool. Choose a Lua coverage tool separately before enforcing numerical coverage targets.

Required rule tests cover:

- Turn order, seeded ties, dead-actor skipping, one item per turn, costs, fractional resources, cooldowns/status boundaries, and immediate termination.
- Invalid/stale commands, duplicate operation IDs, unchanged inputs on rejection, and no RNG/event changes on rejected actions.
- Purchases, repairs, equipment, bank transfers, capacity/overflow, reward claims, retry, and failed/uncertain writes.
- Save validation, A/B recovery, schema changes, story/quest continuation, character switching, and no duplicate outcomes after restart.
- EXP boundaries, fractional growth, age/DST catch-up, rebirth restrictions, and clock rollback.
- At least 1,000 deterministic dungeon seeds, connected required rooms, legal spawns, and gate progression.
- RNG known sequences, restore equivalence, bounded replay cost, and quest rollback isolation.

Test actual native RNG/A*, DefSave storage, Druid GUI, Monarch focus, Event subscriptions, Tweener cancellation, Quest queues, and Ink resources in the custom Defold engine. Plain Lua tests cannot establish native-extension correctness. Repeatedly enter/exit screens and switch characters to detect stale subscriptions, timers, and singleton data.

### Playable acceptance journey

Run a desktop build with real mouse/keyboard input:

**Create → move through Town1 → use services → enter Alby → use an item and battle actions → collect loot → defeat the boss → open one chest → return → quit → resume.**

Also verify character limits/restrictions; equal diagonal speed; camera-aware click-to-move; blocked destinations; keyboard path cancellation; NPC approach; no movement behind a modal or after focus loss; no GUI click-through; disabled/rapid-click controls; volume fades without duplicate tracks; reduced motion; defeat/abandonment; and recovery at every transaction boundary.

Capture Title/creation, HUD, town, battle, inventory, dialogue, and treasure at 1280×720 and 1024×768 with deterministic fixtures. Check fonts, high DPI, GUI scaling, text input, draw order, and asset availability. Use an engine test harness or desktop automation for reproducible interaction, with debug-only observable state; do not assume browser DOM locators exist for Defold GUI.

### Build and release checks

Use the Defold editor for local build/run and a pinned matching **Bob** toolchain for CI/bundles. Resolve pinned libraries, run Lua tests, build the custom engine/test collection, execute integration fixtures, and build/smoke-test release bundles on selected desktop platforms. Keep test resources and runner entry points out of shipping dependency reachability. Record engine/library revisions, build logs, failing seeds, and screenshots. HTML5 needs its own storage, focus, scaling, and native-extension checks before being declared supported.

This documentation update installs no extensions and claims no engine tests have passed. The gates above apply to implementation.

### Milestones

1. **Defold shell and compatibility:** choose engine/library pins; fetch libraries; prove native builds, Druid + Monarch focus, one shared Event version, GUI scaling, input bindings, and starter replacement.
2. **Durable domain foundation:** validated Lua contracts, guarded commands, RNG continuation, DefSave A/B recovery and writer policy, Lester runner, and engine integration harness.
3. **Character and town slice:** character selection/creation, HUD, inventory, services, movement/collision/A*, starter progression, and an Ink conversation with saved continuation.
4. **Complete Alby loop:** procedural generation, turn-based combat, Defold Quest onboarding, rewards, key-funded treasure, defeat/abandonment, and restart at every checkpoint.
5. **Progression and polish:** aging/rebirth, remaining starter skill rules, art/audio, reduced motion, balance, visual checks, and native release acceptance.
6. **Broader design ports:** ranked-skill windows, footprint inventory, extended quests/RP, titles/enchants, and per-battle archives, each with explicit content/save contracts.

The first release is complete when a new character can finish Alby, use the boss key to open a chest, return through the goddess statue, and resume correctly after restarting the desktop application. Multiplayer, cloud saves, pets, more locations, and old browser-save import remain deferred.
