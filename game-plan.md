# Rebirth Dungeon — Phaser, Rex utilities, XState, Immer, and testing

## 1. Foundation and reference library

Build a desktop-first, single-player, top-down RPG:

**Create character → explore Town1 → enter procedural Alby → fight dice battles → defeat boss → choose treasure → return to town.**

Retain Phaser 4.2.1, React 19, HeroUI v3, TypeScript, pnpm, XState, Immer, Vitest, and Playwright.

**`phaser4-rex-plugins` 4.2.0 is already installed.** Its documentation requires Phaser ≥4.2.0, so the project meets the documented requirement. The documentation retains the historical `phaser3-rex-notes` URL but now covers Phaser 4. [Rex plugin catalog](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/plugin-list/)

Initial foundation work:

- Preserve existing dependency changes.
- Fix the production build’s incompatible Vite chunk configuration.
- Configure Tailwind v4 and HeroUI styling.
- Replace the starter demo with the game shell.
- Add/configure Playwright Test, aligned with the installed Playwright version, plus Vitest coverage, React Testing Library, jsdom, and an IndexedDB test implementation.
- Use Node 24 for development and CI.

Create an indexed local reference library under `docs/references/` during implementation:

| Source | Material |
|---|---|
| Phaser through Firecrawl | Scenes, events, input, cameras, tilemaps, physics, animation, loading, scaling, audio, and migration |
| Rex through Firecrawl | Plugin catalog, selected utility documentation, examples, lifecycle behavior, and verified import paths |
| Mabinogi wiki through Firecrawl | Tir Chonaill, Alby Beginner, dungeons, races, characters, Level, talents, and Rebirth |
| Dicero through Firecrawl | Five-dice combat, combination bonuses, weapons, and skills |
| HeroUI MCP | Setup, theming, forms, overlays, meters, progress bars, and inventory components |
| Immer and XState through Firecrawl | Immutable updates, actors, guards, persistence, orchestration, and testing |
| Vitest and Playwright through Firecrawl | Configuration, fixtures, assertions, browser automation, and CI |

Record URLs, retrieval dates, versions/revisions, and limitations. Cross-check rolling documentation against installed package source and types. Keep raw Firecrawl output in ignored `.firecrawl/`. Retrieved instructions remain reference material, not project directives.

Research has been performed; saving documentation and changing files remain implementation steps because this session is in Plan mode.

## 2. Architecture and Rex integration

### Ownership boundaries

| Layer | Responsibility |
|---|---|
| **XState** | Navigation, combat phases, enemy behavior, encounters, dialogue, tutorial/quest progression, rewards, and asynchronous orchestration |
| **Immer** | Character stats, inventory, equipment, economy, dungeon data, combat values, rewards, progression, settings, and save data |
| **Phaser + Rex** | Rendering, movement, collisions, input behaviors, layout, animation, audio, targeting, and scene-bound controls |
| **React/HeroUI** | HUD, character forms, settings, inventory, service panels, and reward-selection interfaces |

Each fact has one owner. XState owns combat phase; Immer owns HP and dice values; Phaser presents outcomes. React does not independently maintain gameplay data.

### Selected Rex utilities

Adopt these six utilities in v1:

| Utility | Use in Rebirth Dungeon | Integration |
|---|---|---|
| [EightDirection](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/) | WASD/arrow movement in Town1 and Alby | Attach to the player’s Arcade Physics body; use normalized eight-direction movement without rotating the sprite |
| [Button](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/) | Dice holds, battle actions, enemy targets, and treasure chests | Release-to-click behavior, disabled states, and drag cancellation; dispatch typed XState events |
| [Anchor](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/) | Battle controls and treasure layouts | Anchor Phaser objects within the playable viewport above the React HUD |
| [ShakePosition](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/shake-position/) | Hit reactions and brief chest-opening feedback | Apply to visual objects only; respect reduced-motion settings |
| [FadeOutDestroy](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/) | Defeated enemy visuals and temporary combat messages | Fade and dispose presentation objects after committed outcomes |
| [SoundFade](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/) | Town, dungeon, and battle music transitions | Fade tracks through a persistent audio controller while honoring volume settings |

Implementation rules:

- Import individual classes/functions from documented `phaser4-rex-plugins/plugins/...` entry points. Bundle them locally.
- Put Rex calls behind small typed adapters for movement, canvas controls, layout, effects, and audio.
- Keep Rex objects out of Immer data, actor checkpoints, and saves.
- Retain HeroUI for all React interfaces and XState for behavior. Rex FSM, quest, dialogue orchestration, storage, and HUD systems are outside the selected integration.
- Keep click-to-move pathfinding as deterministic tile-grid A*. Rex Board PathFinder was researched, but its Board/chess model would add another spatial representation for this free-movement game.
- Only one controller writes player velocity at a time. Pause Rex keyboard movement during click-to-move; keyboard input cancels the path and resumes it.
- On modal opening, suspension, or movement-mode changes, pause the movement task and explicitly zero the player’s Arcade body velocity.
- Merge WASD and arrow-key states into one directional input adapter.
- Calculate Anchor’s viewport from the canvas and current HUD reservation, including HUD scale changes.
- Disable canvas buttons according to actor state. Button debounce improves interaction; XState guards and transaction IDs remain responsible for correctness.
- Apply shake to presentation sprites, never collision bodies or stored positions. Its cosmetic randomness must not consume gameplay RNG.
- Reduced motion skips shake and shortens decorative fades while still delivering completion signals.
- Effect callbacks identify their originating action/scene; ignore stale callbacks after transitions.
- Reusable music tracks fade out with the explicit non-destroy option. Destroy scene-owned sounds when their lifetime ends.
- Dispose Rex behaviors and listeners on scene shutdown. Verify pause/resume behavior explicitly because game-level effect listeners may outlive a paused scene.

### XState and Immer

Implement typed actors for session navigation, exploration/encounters, combat, enemy behavior, dialogue/services, tutorial/quests, and treasure selection.

- Session actors supervise bounded workflows and dynamically spawned enemies.
- Combat grants enemy turns sequentially. Beginner spiders use deterministic basic attacks.
- Alby onboarding uses a reusable quest machine: enter dungeon → win first battle → defeat boss → claim treasure.
- Guards reject invalid actions. Stop actors, timers, and subscriptions when their workflow ends.
- React Strict Mode must not duplicate actors or Phaser instances.

Define typed contracts for `GameEvent`, `DomainCommand`, `GameData`, `Character`, item/skill definitions and instances, `DungeonRun`, `BattleData`, `RewardOffer`, `WorkflowCheckpoint`, and versioned `SaveData`.

Use Immer for all authoritative data changes:

- Expose readonly snapshots; only producers receive drafts.
- Keep producers synchronous and deterministic.
- Pass timestamps explicitly and persist seeded gameplay RNG.
- Use plain serializable objects and ID relationships.
- Keep content catalogs separate from instances.
- Validate/copy external data, retain freezing, and never let drafts escape.
- Keep saving, animation, audio, and scene changes outside producers.

Transaction flow:

1. UI or Phaser sends an event to XState.
2. The machine validates the phase and requests a domain operation.
3. A serialized service validates current data and produces the complete Immer update.
4. Save persistent data and its intended workflow checkpoint atomically.
5. Publish committed data, acknowledge the actor, and play presentation effects.
6. On failure, retain prior committed state and expose retry/recovery.

Use operation IDs for idempotent retries. UI code cannot directly award rewards or apply damage.

### Rendering and saves

React uses stable `useSyncExternalStore` adapters for actor and domain snapshots. Local React state holds only unfinished forms and presentation details.

Keep movement and animation updates in Phaser. Commit position periodically and at interactions/transitions; avoid per-frame XState events or Immer updates.

Use IndexedDB for up to 20 characters and one unfinished run per character.

- Save possessions, settings, progression, layouts, RNG, dice, rerolls, encounters, pending rewards, and chest selection.
- Save versioned workflow checkpoints alongside domain data.
- Restore actors through validated adapters.
- Normalize temporary animation phases to committed continuation points: reload may skip animation but cannot repeat outcomes.
- Keep a previous valid save, handle incompatible versions explicitly, and permit one writable browser session.

## 3. Screens, HUD, town, and progression

### Screens and controls

Scene flow:

`Boot → Preloader → Title → CharacterSelect → NewCharacter/Resume → Town1 → Alby ↔ Battle → TreasureRoom → Town1`

- **Title:** “Rebirth Dungeon” and Start.
- **CharacterSelect:** cards, creation count, New Character, Play/Resume, and Rebirth; maximum 20.
- **NewCharacter:** name, Human/Elf/Giant, age 10–17, and Archery/Dual Gun/Magic/Close Combat. Names are trimmed, 2–24 characters, and case-insensitively unique.
- **Rebirth:** reuse creation forms with identity locked and a confirmation preview.

Use cohesive original 2D fantasy art, animated characters, recognizable buildings, spiders, equipment icons, and treasure chests. Target 1280×720 and remain usable at 1024×768.

Support WASD/arrows and click-to-move. Clicking an NPC approaches interaction range; `E` interacts nearby. Panels block world input, and modal workflows pause gameplay.

### Persistent HeroUI HUD

Follow the screenshot’s dark translucent panels, thin borders, teal icons, magenta HP, blue Mana, yellow Stamina, and segmented teal EXP.

- Left: Menu and current/max HP, Mana, and Stamina.
- Center: Character, Skills, Talent, Quests, Inventory, and Pets; level and EXP below.
- Inventory supports items, equipment, and consumables. Other central buttons remain placeholders with tooltips.
- Menu offers Settings and Title Screen.
- Settings includes music/effects volume, reduced motion, HUD scale, and controls.
- Show the HUD everywhere, with neutral placeholders before selection and previews during creation/selection.
- Returning to Title saves and suspends the run.

### Town1 economy

Create a handcrafted Tir Chonaill-inspired village with a central square, stream, bridge, outskirts, and northern dungeon approach.

| Location | Function |
|---|---|
| Healer House | Paid restoration and free recovery after defeat |
| Grocery Store | Stamina-restoring food |
| Bank | Character-specific item and gold storage |
| Blacksmith | Weapons and repairs |
| General Shop | Potions, basic armor, and item sales |
| Alby entrance | Dungeon entry |

Use dialogue/service panels rather than separate interiors.

Defaults:

- 100 starting gold; 30 inventory slots; 60 bank slots.
- Consumables stack to 99; equipment occupies individual slots.
- Sell prices equal 25% of purchase price.
- Food costs 5 gold and restores 20 Stamina.
- Potions cost 10 gold and restore 30 of their resource.
- Healing costs 10 gold.
- Weapons have 20 durability, losing one per committed attack. At zero, halve their weapon contribution. Repairs cost one gold per missing point.
- Provide unarmed attacks when unequipped; defer ammunition.
- Keep prices, compatibility rules, content, and loot tables data-driven.

### Progression and rebirth

Use current documented wiki rules, prioritizing the Level growth section over historical descriptions.

- Shared starting stats, current combat EXP table, and level 200 cap per life.
- Documented talent base, leveling, and aging bonuses; preserve fractional gains.
- Human/Elf can select all four talents; Giant cannot select Archery. Validate equipment restrictions separately.
- Award one AP per level and five per weekly aging event; save AP for future skill training.
- Age at Saturday noon in `America/Los_Angeles`, including offline catch-up. Apply talent aging bonuses through age 20, once per boundary.
- Rebirth cooldowns: 1/2/4/6 days below cumulative level 5,000/8,000/10,000/otherwise, starting at creation.
- Rebirth permits a compatible talent and age 10–17, no older than current age.
- Reset current level, EXP, and temporary growth; retain identity, cumulative progression, AP, learned skills, possessions, and bank.
- Process pending aging before rebirth and require abandoning active runs first.
- Creation grants a starter weapon/skill. Rebirth unlocks newly selected starter skills without repeating gifts.

## 4. Procedural Alby, combat, and rewards

### Dungeon

Generate seven connected rooms: entrance, three required encounters, boss room, and two optional side rooms.

- Join seeded templates with corridors; validate doors, collisions, spawns, and boss access.
- Teach encounters through visible spider contact, a trapped chest, and a room switch.
- Required encounters automatically unlock the boss gate.
- Optional rooms contain an encounter and supplies.
- Preserve cleared rooms and restore position after battle.
- Include small spiders, stronger red spiders, and a Giant Spider boss with two adds.
- Defeat ends the run and returns the player to the healer fully restored, retaining claimed rewards and EXP.
- Exiting abandons the run after confirmation while retaining claimed rewards.

### Dice combat

Machine phases:

`selecting → rolling → choosingDice → resolvingPlayer → resolvingEnemies → selecting`

Victory, defeat, rewards, and recoverable persistence errors are explicit branches.

- Enemies occupy the upper half; five dice and Phaser/Rex controls occupy the lower half above the HUD.
- Select a living target and skill. Skill selection rolls five dice and locks the skill.
- Hold dice and reroll the rest up to **two shared rounds**.
- Preview damage, then commit. Charge resources once.
- Surviving enemies act once each. Dead enemies never act; killing the final enemy immediately selects victory.

Use the strongest multiplier without stacking:

| Combination | Multiplier |
|---|---:|
| None | ×1 |
| Pair | ×1.25 |
| Two pairs | ×1.5 |
| Three of a kind | ×1.75 |
| Four-value small straight | ×2 |
| Full house: exactly three plus two | ×2.5 |
| Four of a kind | ×3 |
| Five-value large straight | ×3.5 |
| Five of a kind | ×5 |

Damage:

`max(1, floor((weapon power + relevant stat / 10 + dice sum / 5) × skill factor × combination multiplier) − defense)`

Use Strength for melee, Dexterity for bows, Intelligence for magic, and average Strength/Intelligence for dual guns.

| Skill | Factor | Cost |
|---|---:|---:|
| Normal Attack | ×1 | 2 Stamina |
| Smash | ×1.8 | 6 Stamina |
| Power Shot | ×1.8 | 6 Stamina |
| Double Shot | Two ×0.9 hits | 6 Stamina |
| Icebolt | ×1.6 | 6 Mana |

Skills require compatible weapons. Before rolling, the player may instead use a consumable or Recover; both consume the turn. Recover restores 10 Mana and 20 Stamina.

These are initial Rebirth Dungeon balance values, not copied Dicero formulas.

### Rewards and treasure

- Victory grants EXP and offers gold/items through individual selection, Take Selected, and Take All.
- Preserve unclaimed rewards until confirmed departure; never silently delete overflow.
- Ordinary encounters return to Alby; boss victory proceeds to TreasureRoom after battle rewards.
- Generate and save five hidden chest rewards before selection.
- Accept exactly one choice, recording selection and reward eligibility together.
- Collect rewards, then Continue closes the run and returns to Town1.
- Persist claim markers and payouts atomically.

## 5. Vitest, Playwright, and delivery gates

### Test infrastructure

Use **Vitest** for rules, actors, transactions, persistence, and React components. Use **Playwright Test** for real-browser gameplay, actual Rex/Phaser integration, and visual regression.

Provide:

| Script | Purpose |
|---|---|
| `test` | Vitest once |
| `test:watch` | Interactive Vitest |
| `test:coverage` | Vitest coverage |
| `test:e2e` | Complete Chromium suite |
| `test:e2e:ui` | Playwright interactive runner |
| `test:e2e:smoke` | Chromium, Firefox, and WebKit smoke tests |
| `typecheck` | TypeScript checks |
| `check` | Typecheck, Vitest, production build, and Chromium end-to-end tests |

Keep unit tests beside modules and end-to-end tests in their own directory. Prevent runner overlap.

### Vitest coverage

Test actual XState actors and Immer reducers with injected time, seeded randomness, and controlled persistence.

- All 7,776 dice outcomes, precedence, holds, rerolls, costs, damage, multi-hit attacks, and turn order.
- Valid/invalid machine events, duplicate confirmations, stale callbacks, enemy turn permissions, cancellation, and cleanup.
- Immutable snapshots, structural sharing, no-op identity, freezing, and external-input isolation.
- Purchases, sales, repairs, equipment, banks, capacity, atomic rewards, retries, and failed saves.
- Save/checkpoint consistency, migrations, corrupt saves, and restoration without repeated outcomes.
- Character rules, EXP boundaries, fractional growth, aging, daylight-saving changes, catch-up, rebirth, and clock rollback.
- At least 1,000 deterministic dungeon seeds.
- Forms, HUD updates, menus, inventory, disabled controls, and Strict Mode subscriptions.
- Rex adapter contracts: movement ownership, input blocking, effect cancellation, reduced-motion completion, and audio ownership. Mock adapters in domain tests; verify Rex itself in browsers.

Use fake timers and an IndexedDB test implementation. Require ≥90% line and branch coverage for combat rules, transactions, progression, and save/checkpoint logic. Explicitly cover machine transitions and guards.

### Playwright coverage

Run real Phaser rendering, Rex utilities, and HeroUI in isolated browser contexts.

Required Chromium journey:

**Create → move through Town1 → use services → enter Alby → hold/reroll dice → win battles → collect loot → defeat boss → open one chest → return to town.**

Also verify:

- Character limits and racial restrictions.
- WASD/arrows, equal diagonal speed, click-to-move, collision blocking, keyboard cancellation, and NPC approach.
- No competing velocity updates or continued movement after menus, blur, suspension, and scene changes.
- Rex Button disabled states, drag cancellation, rapid clicks, and one-chest enforcement.
- Anchored battle controls remain above the HUD after resizing or changing HUD scale.
- Hit shake does not alter collision positions; reduced motion suppresses it.
- Faded enemies are removed without delaying or repeating battle results.
- Audio fades obey mute/volume and do not leave duplicate tracks after repeated transitions.
- Shops, banks, inventory, defeat, and abandonment.
- Reload during rerolls, rewards, boss victory, and treasure selection.
- Title suspension, character-specific resume, storage failure recovery, and second-tab write protection.
- Actual Rex imports and rendering work in the ordinary production build.

Firefox/WebKit smoke tests cover loading, character creation, movement, battle entry, HUD rendering, and save/reload.

Use real mouse/keyboard input. Locate React controls by accessible roles/names. For canvas controls, expose an end-to-end-only read-only bridge for readiness, semantic bounds, and observable state; click via Playwright rather than calling gameplay commands directly.

Use deterministic fixtures for initial saves, time, and seeds. Exclude test hooks from normal builds and test that build separately. Wait for observable conditions rather than fixed sleeps. Fail on uncaught errors, missing required assets, or renderer initialization failure.

### Visual tests and CI

- Screenshot HUD, character creation, town, battle, inventory, and treasure at 1280×720 and 1024×768.
- Fix fixtures, load fonts/assets, and settle animations before capture.
- Review baseline changes explicitly.
- Save HTML reports, screenshots, and failure traces; use no automatic retries for required CI checks.
- CI installs dependencies/browser runtimes, typechecks, runs Vitest coverage, builds, runs Chromium gameplay, and executes cross-browser smoke tests.
- Inspect the production bundle to confirm narrow Rex imports and absence of unused Rex UI/orchestration modules.

### Delivery milestones

1. Repair build; archive references; establish XState, Immer, saves, Rex adapters, HUD, and test infrastructure.
2. Complete characters, inventory, progression, aging, rebirth, and saves.
3. Build Town1, movement, dialogue, services, and economy.
4. Implement combat, procedural Alby, onboarding, rewards, and treasure.
5. Integrate art/audio, balance encounters, review visuals, and pass all checks.

Acceptance requires a new character to complete Alby, open exactly one treasure chest, return to town, and resume correctly after restarting the browser.

Delivery remains local single-player. Multiplayer, cloud saves, additional locations, broader quest content, pets, and skill-training windows remain deferred.
