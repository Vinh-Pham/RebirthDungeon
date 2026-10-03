# Rebirth Dungeon

An Expo SDK 57 RPG with a headless deterministic TypeScript engine, Skia rendering,
turn-based encounters, exploration, equipment, progression, saves and audio.

Skills and items show local artwork in the journal, pack, codex, town services
and battle menus. `src/ui/shared/gameImages.ts` maps content IDs to static image
requires from `assets/game/skills`, `weapons` and `consumables`; add a registry
entry when adding artwork. Existing IDs with different filenames use explicit
aliases. Missing artwork or a loading error uses `assets/game/no-image.jpg`.
Images are decorative and do not determine recovery amounts or equipment stats.

```bash
npm install
npx expo start
npm test
npm run typecheck
npm run lint
npm run format
npm run format:check
```

Formatting uses [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html), configured
in `.oxfmtrc.json`. Run `npm run format` to format the project or
`npm run format:check` to check it without writing changes. Git-ignored build,
research, and dependency files, lockfiles, and generated Uniwind types are skipped.

Press **Play**, then choose a saved character or **Create New Character**. Enter a
name (1–24 characters), choose Warrior, Archery or Mage, and select an age from
10–17. Talent determines starting bonuses and attribute growth; age is cosmetic.
Each character has an independent autosave and three manual slots. Use
**Characters** in the footer menu to save progress and return to the roster.
Existing saves appear as **Imported Adventurer**; complete its character details
once to continue. Original legacy save rows remain available as recovery copies.

On the Journey screen, speak to the keeper, approach the supplies chest, collect
and equip the iron blade, then use the eastern passage. Challenge the moss guardian,
return after victory, collect the moss mail, and challenge the elder guardian.
Movement works with buttons or by tapping a reachable floor tile. You can return
to the town for supplies, weapon repairs, and paid healing. The Codex shows the content definitions.

The footer menu opens a left drawer with Journey first, followed by Codex, Characters,
Stats, Inventory, Skills, Titles, Quests, Save/Load and Settings. Journey returns
to the selected character's game screen and is disabled without an active character.
Swipe from the left edge on iOS or Android, or use the menu button
on every platform. Codex, Inventory and Save/Load have separate screens in the same
character stack. Use Journey in the drawer to return from Codex; browser and
Android Back keep their normal behavior. The persistent footer shows the menu
button, stacked HP/Mana/Stamina, name, level and XP. It stays visible during
exploration, shops, battle and character journals, and on Settings with an active
character. It is absent on title/roster/setup and Settings without a character.
The Journey detail tabs are Stats (selected initially), Skills, Inventory and Quests. Inventory shows an image grid on its route and Journey detail tab. Tap an icon
for item information, use/equip actions, hotbar assignment, or Drop with a selected
quantity. Drop saves before removing items and protects equipped/locked gear.
Inventory can add or remove battle
consumables from the Items hotbar during encounters; equipment and exploration
use stay unavailable. Manual save/load waits until the encounter finishes. Three manual slots plus
an autosave retain character resources, equipment, inventory, XP, gold, world
flags, map position, encounter checkpoints and exact exploration RNG state.
Native runtime testing requires a development build after adding native modules.

## UI system

App controls use HeroUI Native 1.0 with Tailwind 4 and Uniwind. The root provider
lives inside the gesture handler root, and `src/global.css` defines the dark
stone, parchment, gold, sage, and coral tokens. Import HeroUI components from
individual component paths. Shared action, card, notice, and loading components
live in `src/ui/shared/DungeonUI.tsx`; game commands remain in the screen owners.
Skia world and battle canvases are unchanged.

Expo Router owns the app-wide drawer, root stack and character game stack.
Existing Journey and Codex links are preserved. Shared page headers are removed;
the footer's far-left menu button opens the drawer, which handles character-page
navigation. Existing detail Back/Close and roster/setup controls remain. The title
menu includes Settings, whose no-character view has an in-page Back action.
Web drawer controls support keyboard focus containment, Escape, and focus restoration
to the footer menu. Drawers, dialogs and popovers may cover the footer.
Stats use a native HeroUI Dialog and a small web Modal adapter for focus trapping,
Escape, and background isolation. Web choice groups add arrow-key navigation.
Component CSS is placed in Tailwind’s components layer so app utilities can
override HeroUI defaults on web. The Metro configuration avoids a React Native Web import cycle while retaining
Uniwind's stylesheet adapter. Literal hover tokens and the shared action's web
variant avoid HeroUI color parsing errors during web rendering.

After changing native dependencies, use a development build and validate on both
iOS and Android. For a production bundle check, run
`npx expo export --platform all --output-dir .artifacts/ui-export`.

## Local development debug menu

When running a development session with the local Expo server, select a character
and use the **DBG** floating button at the bottom-right of any character screen.
It sits above the character footer and opens a Debug menu sheet with **Character**
and **Battle** tabs. Character shows the selected character and their saved gold
balance. Use **+100**, **+1,000**, or
**+10,000 gold** to add gold immediately, including during encounters. A shortcut
is disabled if its full amount would exceed the 1,000,000 gold cap.

Each addition saves before updating the balance. Failed saves offer **Retry save**
for the same addition; closing the sheet does not cancel a pending save. Battle
turns, selections, resources, wear and RNG remain live and unchanged by the debug
operation. Restarting that encounter retains the debug gold but discards unfinished
combat changes, and completed defeat still halves the updated gold balance.

The menu is gated by React Native's `__DEV__` flag, so its controls are not mounted
in production builds and the host rejects debug requests when disabled. The native sheet uses
HeroUI BottomSheet with its `@gorhom/bottom-sheet` peer; web uses the existing
Modal adapter pattern. Battle shows the live seed, phase, entity count, current
actor, turn order, visual queue and entity positions/sprites. Outside an encounter,
the Battle tab is empty. Battle diagnostics no longer appear on the combat screen.

## Town services and weapon durability

The refuge is now an outdoor town with walkable grocery, blacksmith, healer, and
general-shop interiors. The northeast Combat School has an instructor standing outside:
speak to them for a free Rank F Smash lesson with zero training and a one-time 3 AP reward.
Smash requires a usable melee weapon, costs 4 base stamina, and deals 200% physical
damage at F (210% at E). It bypasses Defend while retaining normal Defense and Protection.
F→E still requires 100 training and 3 AP; existing learned ranks and milestone claims are preserved. Tap a building to approach its door, interact to enter,
and approach the merchant or healer to open services. Close the panel and use
**Return to town** to exit at the matching doorstep. Larger maps follow the hero;
movement and interaction buttons remain available without canvas touch input.

- **Grocery:** apples cost 2 gold and restore 3 HP; bread costs 4 gold and restores
  8 HP. Apples also restore 10 stamina/fullness; bread restores 25. Food is usable outside combat.
- **Blacksmith:** buy iron blades, wooden weapons, gathering tools, daggers, short swords,
  bows, round shields, and arrow bundles; repair individual weapon copies. Arrows cost
  15 gold for 20 or 75 gold for 100 and share one inventory stack. See the
  [stock and prices](docs/gameplay/towns.md). Gathering remains future work; the shield uses the current armor slot. Equip arrows
  in the secondary hand with a bow; each shot consumes one, including misses.
  Empty bows attack with fists.
- **Healer:** spend 10 gold to restore HP, mana, stamina and fullness, and clear wounds. Full resources need no
  treatment. There is no free treatment or ember-shrine recovery.
- **General shop:** buy healing potions (10 gold), mana potions (12 gold, restore
  20 mana), stamina potions (10 gold, restore 30 stamina), and moss mail (35 gold). Sell spare items for half the purchase price,
  rounded down. Equipped copies cannot be sold or offered; spare armor can.

Stock is unlimited and prices are fixed. Transactions show a quantity and quote
before confirmation. Town services require talking to the nearby merchant,
healer, or altar; moving away closes the service. Android Back closes services
before leaving the character. Weapon and offering lists show 20 entries per page.
Characters still begin with zero gold, two healing potions, and the supplies chest.

Iron blades begin at 60 durability. Each successful basic attack or physical
damage skill costs one point, including multi-target skills once per action.
Misses, spells, healing, and consumables cause no wear. A breaking action keeps
its bonus; at zero durability the weapon stays equipped but provides no stats.
Repairs restore full durability for `ceil(price * 0.5 * missing / maximum)` gold.
An entirely broken iron blade costs 15 gold to repair. Every weapon copy has its
own saved identity and durability; all chest, shop, and battle weapon rewards
arrive fully repaired. Wear persists after both victory and defeat. Reloading an
unfinished encounter restores its starting durability alongside HP, mana, and RNG.

Town layouts and services live in `src/data/worlds` and `src/data/shops`; item
prices, recovery rules, and maximum durability live in `src/data/items`.

## Character stats and recovery

Use **Stats** in the footer menu to open the character window from exploration,
shops, battle, or the Codex. It shows current battle resources, base and equipment
attributes, combat formulas, active effects and weapon durability. Closing it
preserves your selected action and target. Phones use the full screen; larger
screens use a centered window. Escape and Android Back close the window.

The five attributes, protection curve, and known rank-F spell contributions are
based on [Mabinogi's Stats](https://wiki.mabinogiworld.com/view/Stats) and current
human talent growth. Shared starting resources are 118 HP, 98 MP and 113 stamina;
Warrior adds 20 Strength, Archery adds 10 Dexterity and 5 HP/stamina, and Mage adds
10 Intelligence/mana. Each level adds 0.5 to the talent's primary attribute.
Known rank-F spells add 4 Intelligence in total; Codex-only skills grant no bonus.
The level cap remains 99 with the existing experience thresholds.

Physical damage rolls within a range using a seeded triangular approximation
whose peak follows balance. Critical damage is calculated before defense and
protection. Attributes cap at 1,500, physical balance at 80%, magic balance at
100%, final critical chance at 30%, and protection reduction at 90%.
Firebolt, Icebolt, Lightning Bolt and Healing use their rank-F ranges and magic
attack coefficients. Physical damage may cause wounds, reducing recoverable HP;
magic and damage over time do not cause wounds. Zero HP still means defeat.

Successful movement and each living actor's completed turn restore 1 HP/MP/stamina.
**Rest** restores 10 stamina instead and consumes a battle turn. Fullness falls
0.1% per player tick to a minimum of 50%, limiting naturally recoverable stamina.
Above that limit, stamina costs rise 20%. Basic attacks cost 2 stamina even on a
miss; exhausted attacks use bare hands and cause no weapon wear. Self-healing
costs 6 stamina; healing another ally has no stamina cost. Potions respect wounds
and restore 40 HP, 20 MP, or 30 stamina. Paid healing, level-up and defeat recovery
restore all resources, fullness, and wounds. Reviewing screens, shop transactions,
failed actions, and exploration item use do not advance recovery ticks.

Save version 5 persists the growth talent, stamina, wounds and fullness. A
validated older save upgrades once using the selected character's talent and
full resource restoration; current saves load their exact depleted resources.
The deterministic combat tests simulate 100 seeds per talent for both a starter
slime and an equipped level-5 elder encounter with two companion slimes. After
removing combat potions, the basic-attack-only policy still clears the starter
acceptance threshold, but wins the three-enemy fixture only 4/100 times for Warrior
and 0/100 for Archery/Mage. Attack and enemy balance remain unchanged.

## Titles and achievements

Open **Stats → Title collection** or **Titles** in the navigation menu to
inspect discovered and earned titles. In town, choose one First and one Second
Title for their combined flat bonuses and penalties. Selections cost no gold/AP,
never refill resources, and are captured when the next encounter starts.

The giant black spider in the moss depths awards **the Guardian Breaker**; the final treasure exit
awards **the First Delver**. Claiming The Broken Seal awards **the Seal’s Witness**.
After the provisions quest, the keeper’s **A light for the watch** sidequest gives
a **Lantern Companion** coupon. Redeem it from inventory in town; this follow-up
also works for older heroes who already claimed provisions. Earned records never
automatically equip a title and survive completed defeat and early return.

Campaign save version 9 preserves earlier ownership, progression, equipment and
enchants through versions 1–8. Accepted title operations and load catch-up save
before success; failed writes retain the exact result for Retry. Missing title
definitions preserve the achievement identity with effects disabled. Rank 1
mastery, aging, rebirth, vanity, favorites and talent display labels remain later
work. See [Titles](docs/gameplay/titles.md).

## Generated dungeons

In the refuge, approach the **Goddess altar**, interact, select an unequipped
item, and confirm your offering. One copy is consumed to begin a run. Offering
value does not change the dungeon; there is no free fallback offering.
Each entry creates a seeded dungeon with a goddess sanctuary, 8–12 ordinary
rooms, a locked boss chamber and a final treasure room. Tap tiles to move and
objects to approach/interact; the dungeon camera follows the player. The authored
moss halls remain available through the original eastern passage.

Ordinary rooms contain monster encounters, item chests, hidden mimics or fountains.
Every monster and mimic must be defeated. The final ordinary enemy drops a boss
room key on the map: pick it up and interact with the boss door to unlock it.
Defeat the boss and every companion, then pick up the boss's treasure chest key.
Beyond the boss chamber, choose exactly one of five chests with hidden rewards.
The remaining chests seal, and a return-to-refuge action becomes available.

The goddess statue can end a run at any time outside combat. Earned items, gold,
and experience remain; run-specific keys and fountain effects disappear. Defeat
also ends a run and preserves the existing rebirth/half-gold penalty. Fountains
work once each and stack their buffs/debuffs for the run, with a cap of 10 per
effect type. They do not expire with combat turns.

Generation uses the existing pure-rand wrapper with a separate RNG instance.
Definitions and reward tables live in `src/data/dungeons/basic.json`. Saved
version 5 campaigns retain generated geometry, hidden outcomes, keys, weapon
instances and progress; versions 1–4 migrate automatically, restoring resources once and retaining progress. Encounters still reload at their starting
checkpoint. The headless dungeon tests cover 200 generated seeds and the complete
key/reward loop, including save recovery at each stage.

## Headless engine (Phase 1)

`src/engine` contains the simulation foundation, with no React or native imports.
Create an isolated engine with `createGameEngine({ seed: 12345 })`, add entities
with `engine.spawn({ id: 'player' })`, and register focused systems with
`engine.addSystem(system)`. Miniplex queries are available through `engine.world`.
Keep entity IDs fixed and use `spawn` to reject duplicate IDs.

Systems can register typed handlers in `initialize` using
`engine.commands.register('ATTACK', handler)` and return the unsubscribe function.
Commands execute synchronously and reject malformed inputs or missing handlers;
systems must validate gameplay rules before changing entities or consuming RNG.
Events are synchronous, with `engine.events.on(type, listener)` for a specific
result and `engine.events.subscribe(listener)` for all results. Listener errors
are aggregated after all subscribers are notified; notifications do not roll back
simulation mutations.

`engine.update(dt)` updates systems in registration order with an explicit delta
in seconds. No timer starts automatically. Remove systems using the returned
cleanup function and call `engine.dispose()` when the engine is no longer needed.
The seeded RNG exposes `int` (inclusive bounds), `float` ([0, 1)), `chance`, and
`pick`; seeds must be signed 32-bit integers. Replay reproducibility assumes the
same engine/library versions, initial entities, system order, and commands.

Run `npm test`, `npm run typecheck`, and `npm run lint` to validate the foundation.
`src/tests/engine/harness.ts` runs fresh scenarios and captures detached entities
and events for replay comparisons. Its original attack rule remains a Phase 1 test fixture. Production combat is
available through the Phase 2 modules below. Rendering and UI integration are described in Phases 3–6 below.

## Basic combat (Phase 2)

Spawn entities with `health`, `combatant`, and exactly one `player: true` or
`enemy: true` tag, then attach `new CombatSystem(['player', 'slime'])` using
`engine.addSystem`. Both sides must contain living participants at initialization.
The system handles `ATTACK` commands and exposes `currentTurn()`, `turnOrder`, and
`result` (`victory`, `defeat`, or undefined while the battle continues).

```ts
import { CombatSystem, createGameEngine, createHealth } from './src/engine';

const engine = createGameEngine({ seed: 12345 });
engine.spawn({
  id: 'player',
  player: true,
  health: createHealth(30),
  combatant: { attack: 10, defense: 2, speed: 5 },
});
engine.spawn({
  id: 'slime',
  enemy: true,
  health: createHealth(20),
  combatant: { attack: 6, defense: 1, speed: 3 },
});
const combat = new CombatSystem(['player', 'slime']);
engine.addSystem(combat);
engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'slime' });
// combat.currentTurn() is now 'slime', unless the attack ended the battle.
engine.dispose();
```

Turn order is descending speed, with ties preserving participant order; this
order repeats each round. A valid hit or miss consumes a turn. Wrong-turn attacks,
allied/self targets, dead units, invalid stats, and nonparticipants are rejected
before consuming RNG or changing HP. Speeds are fixed for the battle; mid-battle
joins and speed changes are deferred to later scheduling work.

Hit probability is `max(0, hitChance - target.evasion)`, with defaults 0.95 and 0.
For legacy actors with a single attack value, critical chance defaults to 0.1
and is rolled only after a hit. Damage is
`floor(max(1, attack - defense) * criticalMultiplier)` on critical hits, with a
multiplier default of 1.5; ordinary hits use multiplier 1. Current characters and enemies use the ranged
stat formulas described above. Damage events report
actual HP lost, capped at remaining HP. Health and base combat stats use safe
integers, and overflowing calculations are rejected before rolling RNG.

Dead units keep their entities with `dead: true`, emit `ENTITY_DIED` once, and
leave the turn queue. Use `engine.removeEntity(id)` to remove battle participants:
it emits `ENTITY_REMOVED` after ECS removal so the combat system can update
initiative and outcomes. Direct `world.remove` bypasses this engine notification.
Only the registered participants count toward victory or defeat. Presentation
receives damage/miss, death, turn-end, then battle-end or next-turn events.
Initialization emits the first `TURN_STARTED` event.

Combat commits authoritative state before publishing events. Nested attacks from
combat event listeners are rejected; dispatch subsequent actions after the
current dispatch returns. Listener failures are reported after attempting the
remaining events; the committed action must not be retried. Combat does no
per-frame work. The Phase 3 controller below adds state-machine orchestration.

## Battle flow, rendering, animations and content (Phases 3–6)

A battle encounter opens from the Journey exploration screen. One horizontally scrollable hotbar uses minimal Combat, Magic and Items tabs. Combat always includes Attack and Defend beside learned combat skills. Attack's icon and details use Combat Mastery for Warrior, Human Ranged Attack for Archery, or Magic Mastery for Mage; Defend uses Defense. A loaded bow uses Human Ranged Attack, or owned Elf Ranged Attack, regardless of talent; its saved F/E rank supplies ranged damage and balance. Unlearned users default to Human F without gaining ownership. Empty or broken bows use fist damage and Combat Mastery details. Equip arrows in Inventory’s secondary hand; each shot consumes one, including misses. Defend and other loadouts retain their existing rules. Add battle-usable consumables from Inventory to the Items hotbar, or remove them from item details or the assigned list. Assignments are saved per character and can change during encounters without resetting the battle. Item popovers show quantity and capped recovery; Use Item consumes one copy and one turn on self. Depleted icons remain assigned and unavailable until restocked. Tap an icon to inspect its HeroUI Native popover with costs, target previews and a Use button. Confirm an enemy action with Use. When only one living enemy remains, Attack and enemy-targeted skills select and resolve against it immediately; otherwise tap a monster in the game canvas. Canvas targeting stays paused until an action is confirmed. Self-only actions resolve from Use. Closing details preserves the previous action; Cancel clears it and returns to action selection.
Defend uses a turn, recovers stamina at the rest rate, and halves incoming attack and spell damage (rounded down, minimum one) until the defender's next turn starts. It does not reduce status damage, spend mana, roll RNG, or wear weapons. Rest is learned at Rank F by default and has a Use Rest action in Combat. Outside battle, Use/Stop in the Life tab or journal toggles Rest in towns and dungeons. Resting blocks movement and interaction and shows sleeping Z letters above the map character. An injected foreground host clock requests one recovery tick per second, restoring up to 10 stamina within the fullness limit. Each tick saves before publication; Stop remains available during saves/retries. Backgrounding, character exit, loading and disposal end resting without offline gains.
Enemy turns resolve immediately. The presentation queue plays each resolved action
in order, without delaying HP, mana, turn order or the battle outcome. Restarting
uses the same seed (12345) so encounters can be reproduced. The Codex tab displays the validated creature, class, skill, item and status
definitions. The diamond button
shows the seed, phase, turn order, positions, entity count and visual queue.

### Phase 3: XState battle flow

`src/engine/battle/BattleMachine.ts` owns initialization, player action/target
selection, execution, enemy turns, victory and defeat. `BattleController` converts
`START_BATTLE`, `SELECT_ACTION`, `SELECT_TARGET`, `CONFIRM_ACTION`, `CANCEL_ACTION`
and `ADVANCE_ENEMY_TURN` commands into machine events. The machine contains no
damage formulas. In a `BattleSession`, direct ATTACK/USE_SKILL commands are gated
so they cannot bypass selection and confirmation. The standalone Phase 2 combat
system remains usable without a state machine.

```ts
import { loadGameContent } from './src/data/content';
import { BattleSession } from './src/game/BattleSession';

const session = new BattleSession(loadGameContent(), 12345);
session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'firebolt' });
session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
session.dispatch({ type: 'CONFIRM_ACTION' });
session.advanceEnemyTurns();
// Simulation has already advanced; presentation can still be playing.
session.dispose();
```

### Phases 4–5: read-only presentation

`src/renderer` renders the tilemap as one cached Skia picture and uses an atlas
for sprites with data-defined idle frames. Camera zoom/panning and inverse
coordinate conversion keep touch targeting aligned. Reanimated shared values
animate lunges, spell projectiles, damage/healing numbers, hit flashes, camera
shake, HP bars and death opacity on the UI thread. No React state is updated each
frame. Shared values use the React Compiler-compatible get/set API.

`PresentationQueue` consumes completed simulation events and sequences visual
batches with presentation-only timers. It never dispatches gameplay commands.
`BattleSession` exposes cached read-only view projections; the ECS world remains
the source of truth. Zustand holds only UI preferences. `BattleHost` starts and
disposes sessions at subscription boundaries, including Strict Mode and restart.

On web, `GameCanvas.web.tsx` loads local CanvasKit before dynamically importing
Skia components, which stay outside the route directory. `npm install` runs the
Skia setup scripts for native libraries and generates `public/canvaskit.wasm`.
The font is Space Mono under the license in `assets/fonts/OFL.txt`; the sprite
sheet is original procedural pixel art. iOS and Android bundle exports do not
replace testing in Expo Go or a device development build.

### Phase 6: validated external content

JSON definitions live in `src/data/skills`, `enemies`, `classes`, `items`,
`status-effects`, `maps` and `atlases`. `ContentRegistry` validates the entire
bundle through Zod before spawning entities. It rejects invalid stats, unsafe
damage, duplicate IDs, missing skill/spawn references, invalid atlas frames and
invalid map spawns. Runtime entities get independent mutable components.

Enemy definitions are grouped under `src/data/enemies/dungeons/<dungeon>/basic.json`:
`moss-halls` contains the authored training-hall slimes, and `spider-nest` contains
the spiders used by the generated `moss-depths` dungeon. Definitions without a
current dungeon assignment, such as Hungry mimic, live in `src/data/enemies/shared/basic.json`.
`src/data/content.ts` explicitly imports and combines these files into one validated catalog.

To add an enemy, add a definition to its dungeon file (or shared file), register
any new file in `src/data/content.ts`, and reference the enemy ID in a map spawn
or dungeon definition. To add a
skill, add its definition and list its ID in the class/enemy's skills array.
Damage skills support one or all enemies; healing supports self or allies. Skills
validate every target before consuming RNG or spending mana. Damage uses attack
plus skill power before flat defense and critical scaling. The enemy policy chooses a basic attack against the first living player.
The RPG runtime systems added in Phase 7 are documented below.

Atlas metadata is data-defined, while bundled image files are registered in the
renderer because Metro requires static asset references. New sprite frames in
an existing atlas need only metadata/content changes. New atlas images require a
static asset registration as well.

Validate with `npm test`, `npm run typecheck`, `npm run lint`,
`npx expo install --check`, and `npx expo export --platform web`.
The tests cover command-driven phase transitions, deterministic complete battles,
skill mana/target validation, content boundaries, camera/atlas math, session
lifetimes and presentation independence using fake timers.

## RPG and exploration (Phases 7–8)

`src/engine/rpg` derives class stats plus level growth and weapon/armor bonuses,
validates inventory/equipment ownership, grants XP across level thresholds, and
rolls loot through seeded RNG. Level cap is 99; stacks cap at 999. Each level needs
`level * 20` XP, adds 5 max HP, 2 max mana, 2 attack and 1 defense, and restores
resources. Victory awards the defeated enemy definitions' XP, gold and item drops
once. Defeat returns to the refuge, restores resources and halves gold.

Combat supports data-defined status applications; assigned battle-usable consumables can also be used from the Items hotbar.
Fireball applies Burn; Focus applies an attack buff. Status definitions support
turn-start/end damage, healing and signed stat modifiers, with refresh, bounded
stack or ignore behavior. Expiry and status deaths update the turn queue and battle
outcome synchronously. Effects last for their configured ticks (the casting turn
counts for a self buff), are scoped to an encounter, and never overwrite base stats.
Speed changes do not reorder the fixed initiative queue during a battle.

`JourneySession` owns the exploration simulation and ECS world. `MOVE`, `TRAVEL_TO`,
`INTERACT`, `EQUIP_ITEM`, `UNEQUIP_ITEM` and `USE_ITEM` commands enforce cardinal
movement, tile/object collision, interaction distance, one-time chests and guardian
encounters. Portals connect JSON world maps. Breadth-first paths give shortest
routes on these small uniform-cost maps; path travel stops at the first uncleared
encounter. No rot.js dependency is needed for this map size or cost model.
World movement, encounter resolution and RNG remain outside React.

Add maps/objects in `src/data/worlds`, battle layouts in `src/data/maps`, loot in
enemy definitions, and equipment/stat effects in item and status definitions.
Zod validates dimensions, entry tiles, object positions and all cross-references.
Skia records static tilemaps once; Reanimated animates hero movement and map fades.
Accessible buttons provide an alternative to canvas touch interactions.

## Immutable campaign checkpoints

Journey snapshots use Immer 11.1.18 with automatic freezing in development and
production. Each leaf command updates one campaign draft, shares unchanged hero
and dungeon branches, and publishes only after resolution succeeds. Battle ECS
entities remain independent mutable copies. Durable candidates share their initial
immutable checkpoint and retain the same result for failed-save retries.

The host/autosaver retain frozen checkpoints; `toSave()` remains a detached,
editable export. Save version 13 adds default Rank F Rest to existing characters without changing their resources or earned progress; version 12 added bow ammunition; immutable snapshot and save ownership are unchanged. See
[immutable state ownership and performance](docs/immutable-state.md) for the
boundaries, regressions and local benchmark tradeoffs. To profile headless state
updates with Node 24+, run `node --expose-gc scripts/profile-campaign.mjs`.

## Persistence (Phase 9)

`SaveRepository` validates both outgoing and loaded saves before replacing a
session. Version 13 saves migrate versions 1–12, preserving progression, resources
and RNG while supplying historical defaults and upgrading equipment ownership; malformed,
unknown-reference and future-version saves fail with a visible error. Failed loads
preserve the current session and other slots. Character values, map positions,
claimed objects, equipment and RNG state are validated against current content.
Mutable exports and simulation components are copied with a Hermes-compatible
JSON helper rather than requiring `structuredClone` in the mobile runtime.
Campaign observations share frozen data instead of cloning it on every update.

Native `createSaveStorage` uses Expo SQLite, WAL, parameterized upserts and an
atomic/idempotent database schema migration. Web uses IndexedDB transactions with
the same schema/repository, avoiding SQLite web's SharedArrayBuffer hosting
requirements. Save-format migrations and database migrations are separate.
`AutoSaver` coalesces command bursts (250ms), retains frozen checkpoints, serializes
writes, surfaces storage failures and retries retained data on the next flush.
Backgrounding/unmount flushes queued changes; host generations prevent stale async
loads from replacing a remounted session.

Saving uses exploration and encounter-boundary checkpoints. While an encounter
is active, loading/restarting the app resumes that encounter from its original
hero resources and seed. Partial battle turns and animation timers are intentionally
not serialized. Manual save/load controls are available during exploration;
returning from a completed battle validates and saves one durable candidate with
rewards, resources, wear, evidence and RNG before publishing success. Failed writes
retain that candidate for an exact retry.
An abrupt process kill within the autosave debounce can lose the latest step.

## Audio and polish (Phase 10)

`AudioManager` subscribes to simulation events through an injected backend. The
Expo audio backend provides a bounded pool for overlapping SFX, looping exploration
and battle music, mute and independent music/SFX volume controls. The root audio
provider keeps players stable across navigation, replaces event subscriptions
when a session changes, and pauses music when backgrounded or no character is
selected. Audio failures are surfaced without changing gameplay. Playback-only config disables
microphone permissions, recording and background audio services.

`assets/audio` contains original synthesized WAV music and SFX. Settings is
available before character selection. Sound preferences are global and persist independently of game slots in SQLite on native and IndexedDB on
web. Database version 3 adds a settings record while preserving character saves.
The first launch adopts sound preferences from the most recently saved valid
journey, or starts muted with 30% music and 70% effects. Loading a game never
replaces global preferences; legacy save audio fields remain compatible. Sound
starts when explicitly enabled. After a browser reload, Resume sound in Settings
uses a fresh user gesture to unlock playback while retaining saved preferences.
`ParticleRenderer` adds presentation-only impact/healing bursts, alongside HP/damage/death animation,
spell effects, camera shake, smooth world movement and map fade transitions.
Haptics remain optional and are not enabled.

## Verification

The tests include generated path/RNG invariants, battle status flows and rejected item commands,
progression/equipment/loot, world transitions, checkpoint replay, corrupt/future
save rejection, version migration, autosave ordering/failures, host lifetimes,
actual SQLite round trips via Node's built-in SQLite, and audio cleanup/failure
isolation. Run tests with Node 24 or newer for the SQLite integration suite.

```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo install --check
npx expo export --platform ios --platform android --platform web
```

Browser testing covers the playable loop, save/load, reload persistence and sound
controls. Bundle exports and desktop SQLite tests do not verify native audio or
SQLite behavior on a device; exercise those in an Expo development build.
SDK references fetched with Firecrawl: [SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/),
[Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/).
