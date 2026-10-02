# Rebirth Dungeon: React Native Game Plan

Updated **October 2, 2026**. Target: **Expo SDK 57, React Native 0.86, React 19, TypeScript**, with a portrait, mobile-first experience on iOS and Android and a compatible web build. The repository already implements exploration, turn-based encounters, equipment, character growth, local saves, and audio. This document describes that baseline and the next work; a planned feature is not an implementation claim.

## 1. Documentation map

| Document                                     | Owns                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [Battle](gameplay/battle.md)                 | Action selection, targeting, initiative, combat resolution, encounter results                     |
| [Stats](gameplay/stats.md)                   | Attributes, damage inputs, resources, wounds/fullness, status timing                              |
| [Character](gameplay/character.md)           | Character identity, levels/talents, future aging and deliberate rebirth                           |
| [Skills](gameplay/skills.md)                 | NPC/book/page learning, ranks, 100 training points plus AP, the F/E pilot                         |
| [Inventory](gameplay/inventory.md)           | Current stacks/weapon instances and future grids, bags, equipment expansion                       |
| [Towns](gameplay/towns.md)                   | Refuge movement, shops, repair, recovery, dungeon entry, future services                          |
| [Quests](gameplay/quests.md)                 | Initial story/side/skill quests, objective attribution, durable reward claims; future RP missions |
| [Titles](gameplay/titles.md)                 | Future achievements, equipped effects, discovery and mastery titles                               |
| [Enchants](gameplay/enchants.md)             | Future prefix/suffix installation, protected failure, burning and saved RNG                       |
| [User interface](gameplay/user-interface.md) | Mobile screens, navigation, controls, accessibility and presentation                              |

[AGENTS.md](../AGENTS.md) governs implementation. [README](../README.md) provides setup and project context; prefer current source when historical examples disagree. The existing skills plan remains the progression contract. Its introductory warning about outdated companion documents records the state before this revision; those companions are now updated here.

## 2. Current architecture

| Layer                | Existing location                                                  | Responsibility                                                                          |
| -------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Routes               | `src/app/`                                                         | Expo Router layouts and thin screen entry points                                        |
| Screens/shared UI    | `src/ui/`, `src/components/`                                       | React Native/HeroUI controls, theme, accessible actions                                 |
| Session ownership    | `src/game/JourneyHost.ts`, `JourneySession.ts`, `BattleSession.ts` | One selected character's journey, immutable campaign checkpoints and encounter lifetime |
| Simulation           | `src/engine/`                                                      | Commands/events, Miniplex ECS, seeded RNG, battle and RPG rules                         |
| Battle orchestration | `src/engine/battle/`                                               | XState action flow, fixed turn queue, hit/critical/damage and skill resolution          |
| Content              | `src/data/`                                                        | JSON definitions validated by Zod and `ContentRegistry`                                 |
| Presentation         | `src/renderer/`                                                    | Skia maps/sprites and Reanimated effects from resolved events                           |
| Persistence          | `src/persistence/`                                                 | Save validation/migration, serialized repository operations and autosave                |
| Audio/preferences    | `src/audio/`, `src/state/`                                         | Playback and settings; UI preferences are not authoritative gameplay                    |
| Verification         | `src/tests/`                                                       | Vitest engine, battle, content, RPG, world, persistence and presentation suites         |

`CharacterGameLayout` provides `CharacterGameContext` and owns the selected character's `JourneyHost`. Feature routes reuse that host; navigation must not instantiate a second campaign. Keep non-route helpers outside `src/app/`. React reads frozen campaign snapshots with shared unchanged branches through the existing subscription pattern and dispatches typed intents. Engine/RPG modules remain runnable without React Native, rendering, storage, or a device clock.

Campaign commands use one synchronous Immer producer per leaf command, staging RNG, messages, service state and events until success. Dungeon geometry and unchanged hero branches remain shared. Read-only observation never reconciles progression. RPG draft operations compose within that campaign producer; battle ECS and session instances remain mutable and independent. See [Immutable campaign state](immutable-state.md) for ownership, rollback, save compatibility and measured tradeoffs.

Simulation state commits before external combat events are delivered. Listener failures do not undo an accepted action, and callers must not replay it. Animations, sound, navigation, and elapsed frames never determine damage, training, inventory ownership, or turns.

The Inventory route and Journey detail tab share an image grid with HeroUI Native item popovers. Drop removes a validated quantity through the host's durable candidate operation; spatial item placement, bags and recoverable ground loot remain future work. See [Inventory](gameplay/inventory.md) for ownership, protection and retry rules.

## 3. Playable loop and exploration

```text
Choose/create character → explore refuge → prepare at services
    → offer an unequipped item at the altar → generated dungeon
    → enter encounter → select action/target → confirm → enemy response
    → commit encounter result → continue exploration
    → defeat/recover or claim final treasure and return to town
```

Exploration uses cardinal tile commands, not continuous physics. `MOVE` validates one walkable step, applies an exploration resource tick, and can start an uncleared encounter. `TRAVEL_TO` follows the shortest valid tile path and stops at the first encounter. `INTERACT` requires Manhattan distance at most one to the authored object. The visual movement tween is cosmetic; world coordinates and battle stage coordinates have different meanings.

The authored refuge links to shop interiors and training halls. The northeast Combat School exterior has an outside instructor offering a free Smash F lesson; its existing introductory milestone awards 3 AP once. Procedural dungeon generation stores a validated, frozen blueprint plus encounter/chest/fountain/key progress updated through immutable campaign transitions. Offerings are consumed only after a complete dungeon candidate validates. Defeat every nonboss encounter, including mimics, obtain the boss key, open the boss door, defeat the boss and companions, then use the treasure key to choose one of five final chests. The entrance statue permits an early return; the treasure-room exit requires a chosen final chest. Dungeon effects and keys clear on return, while already committed items and encounter rewards remain.

There is no exploration fog-of-war model today. Discovery/fog would require saved visibility and filtered observations before markers or journals can rely on it. Do not add a navigation/physics library merely to replace the existing small-map pathfinder.

## 4. Battle contract

Combat is **select action → select target → confirm → resolve → next scheduled actor**. The UI provides one scrollable hotbar with minimal Combat/Magic/Items tabs. Combat includes Attack (talent mastery identity), Defend (Defense identity), and learned combat skills. Items contains the character’s saved consumable assignments. Inventory can add/remove owned battle-usable consumables during exploration or battle; depleted assignments stay visible. Use Item resolves on self, consumes one copy and one turn, and follows the shared recovery/turn rules. These basic-action identities preserve current attack/guard rules without granting skill ranks. HeroUI Native action popovers show stats and a Use button; Attack and enemy-targeted skills automatically select and confirm the sole living enemy after Use; multiple enemies still require a canvas target tap. Self-only Use actions resolve immediately. Rest remains supported by the engine. Inspection, selection and cancellation spend no resources and draw no RNG. Accepted attacks, including misses, consume one turn. Skill validation occurs before mutation/random draws. A skill action pays MP/SP once; area skills do not grant turns per target.

`TurnQueue` establishes descending speed order at encounter start; ties retain participant order and the queue repeats. Mid-battle speed modifiers affect observed stats but do not reorder initiative. Enemies currently choose a basic attack against a living player. New AI skills need explicit decision rules and fixtures.

Use the existing damage-range/Balance, hit, critical, defense/protection, injury/wound, Defend, regeneration, and weapon-durability rules in [Battle](gameplay/battle.md) and [Stats](gameplay/stats.md). There is no five-dice hand, reroll allowance, cost reservation, or roll/commit phase. Counters, cooldowns, and conditional passives are future extensions defined by [Skills](gameplay/skills.md); introduce them through the existing controller and resolver.

The battle copies the campaign hero at **encounter entry**, not at the start of a whole dungeon. Levels and resources committed after one encounter affect the next. Active battle state is isolated from exploration and town mutations. Gear may currently change during exploration, including between dungeon encounters; it cannot change during a battle. Skill learning/rank-up, title changes, quest claims, and enchanting are proposed town-only actions.

## 5. Content and randomness

Maintain stable IDs and typed definitions for skills, actors, items, statuses, maps, worlds, dungeons, and shops. Zod validates ranges, unique IDs, cross-references and save state. The 34-skill reference catalog (including Human Ranged Attack) has four starter magic adapters plus Smash and supported F/E masteries; scraped tables do not make other skills playable. Authored game ranks and progression metadata extend that catalog without mutating shared definitions.

`GameRandom` uses the existing pure-rand xoroshiro generator with a signed 32-bit seed and four saved signed state words. The journey owns its RNG, dungeon generation uses its dungeon seed, and each battle owns its encounter seed. Preserve current draw order, including the selected-target-first/shared-critical area behavior. Gameplay never calls global random functions. Cosmetic timing does not consume a gameplay stream.

Future enchanting gets an independently persisted stream. Additional RNG streams, algorithm/content revisions, and compatibility checks must be introduced with explicit migrations; they are not fields already present in version 5. Save generated layouts instead of assuming a seed will regenerate identical content after a catalog change.

## 6. Saves, ownership, and durability

A character profile stores identity/setup: ID, name, chosen talent, starting age, and creation time. The character-scoped **campaign hero** stores playable progression, resources, inventory and equipment. Do not put a second independently mutable AP/inventory balance in the profile.

Current wire saves are **version 11**, with migrations from versions 1–10. Version 11 adds an initially empty per-character `itemHotbar`, preserving resources, progression, RNG and pending checkpoints. Hotbar changes use a durable candidate; during encounters the host retains the live BattleSession, saves only configuration on the entry checkpoint, and pauses input until success or exact retry. Version 10 adopts the level-200 normal XP chart, cumulative level tracking and percentage-preserving XP migration; new characters start with 5 AP. Version 6 adds learned skills/AP; version 7 adds quest progress, receipts, tracking and earned story titles. Native storage uses Expo SQLite; web uses IndexedDB through a platform-specific adapter. Slots are `auto`, `1`, `2`, and `3`. Repository operations are serialized. The 250ms autosaver coalesces frozen campaign checkpoint references, retains failed writes for retry, and flushes on supported exit/background paths. The app must preserve the active session on invalid/corrupt/future saves rather than creating a replacement hero.

An active encounter is saved as its entry hero plus pending encounter identity/seed. Loading or relaunching restarts that encounter; partial turns, statuses, presentation timers and battle RNG continuation are **not** serialized. Completed victory commits hero resources/consumptions/weapon wear, XP, gold, drops and encounter clearance together. Defeat commits used supplies/wear, restores resources/wounds/fullness, returns to the refuge, and sets gold to `floor(previousGold / 2)`; it grants no victory loot/XP. Already committed rewards from earlier encounters survive.

The current autosave debounce can lose the latest operation on abrupt termination. Skills, completed encounters, town transactions, final dungeon exits and quest claims now use a **host-owned durable candidate operation**: flush earlier writes, validate/save one candidate campaign including progression, items/rewards and RNG, then publish success and allow the next dependent mutation. Retain the identical candidate on failure and retry its write, not its random resolution. The initial story title award shares its quest claim; future title equipment and enchanting should use this same boundary. Ordinary movement/interactions still use asynchronous autosave.

Pending skill/quest/title combat evidence must remain inside its battle until the encounter result commits. Restarting a pending encounter discards that attempt's evidence. Training commits on completed victory or defeat under the skills plan; clear/victory objectives still require their named success. Ordinary exploration evidence commits with its accepted world command. There is no second dungeon-exit award of previously banked gains.

Format migrations and SQLite/IndexedDB database migrations are separate. A new hero JSON field does not automatically require a new database table. Preserve existing equipment IDs, resource depletion, and character ownership when adding skills or other features. Exact mid-battle resume, cloud saves, and anti-cheat are separate future work.

## 7. Delivery sequence

| Milestone                     | Work                                                                                                                                            | Exit evidence                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Baseline upkeep               | Keep current character/refuge/dungeon/battle loop and version 7 migrations working                                                              | Engine suites, lint/typecheck, platform smoke tests                                   |
| Skill progression             | Implement the unchanged [Skills plan](gameplay/skills.md): learned ranks, AP/training, NPC/book/pages, F/E pilot, journal, durable result merge | All three learning routes and saved rank-up; unchanged starter combat/stat behavior   |
| Quest and title foundations   | Attributed outcomes, story/side/skill quests, claims, first/second titles and stat sources                                                      | Completed/failed encounter evidence, duplicate claim and combined title-effect checks |
| Inventory/equipment expansion | Instance model where needed, grid/bags/locks/overflow, hand/armor categories                                                                    | Quantity conservation, lossless migration, compact-screen controls                    |
| Enchanting and town services  | Prefix/suffix, protected attempts, burning, dedicated RNG; instructor/material supply loops                                                     | Saved chance outcomes, failures/retries and no capacity loss                          |
| Character extensions          | Talent mastery, optional aging, deliberate rebirth; isolated RP scenarios                                                                       | Injected-clock tests, reset/preserve preview, no borrowed state leaking to hero       |
| Advanced combat and release   | Supported skill rank tables/reactions, balance, device performance/accessibility, EAS delivery                                                  | Native installations, suspend/relaunch, full loop and release-specific checks         |

Keep the roadmap incremental: grid storage, banks, expanded slots, aging, rebirth, RP, and every advanced skill are not prerequisites for the current playable loop. No retired phase tracker or absent foundation document is used as evidence of completion.

## 8. Mobile UI, rendering, and audio

Use Expo Router, existing HeroUI/shared components, Uniwind and theme tokens. Preserve the portrait baseline in `app.json`. Compact devices use list/detail navigation and scrollable panels; wider web/tablet layouts may add comparisons. Safe areas, 48-unit touch targets, larger text, canvas targeting after action confirmation, keyboard action controls and screen-reader feedback are acceptance work, not assumptions from rendering a control.

Keep Skia/Reanimated for map/sprite presentation and UI-thread motion where already used; avoid per-frame React updates and repeated map/catalog work. Render only needed long-list rows, retain stable keys, and bound battle logs/animation queues. Screen navigation and overlays gate world input; Android Back closes the appropriate surface without spending resources or abandoning an encounter.

`AudioManager` observes simulation events. Global sound settings persist separately from save slots; loading a character does not replace them. The Expo backend owns bounded playback resources and pauses on background/character exit. Browser audio resumes through an explicit user gesture when needed. Playback failures do not change simulation. Haptics and additional native modules are optional feature work.

## 9. Development and release verification

Use the npm workflow currently recorded by `package-lock.json`; switch to `bunx` commands only if a Bun lockfile is adopted. Required implementation checks:

```sh
npm test
npx expo lint
npx tsc --noEmit
```

Use a runtime supporting the SQLite integration tests (the README specifies Node 24+). Dependency/config diagnostics and bundle exports are additional checks when their consuming change warrants them:

```sh
npx expo-doctor
npx expo install --check
npx expo export --platform ios --platform android --platform web
```

Before writing Expo/React Native integration code, read the installed Expo major, fetch the [matching SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/) and [Expo index](https://docs.expo.dev/llms.txt), then follow the relevant page. Install SDK-compatible dependencies with `npx expo install <package>`. Native behavior belongs in app config/plugins; do not hand-create or edit generated `ios/` and `android/` projects. [Expo library guidance](https://docs.expo.dev/workflow/using-libraries/).

Plan cloud builds/signing/submission through EAS. The repository does not currently provide an `eas.json` or configured OTA update runtime; establish the corresponding profiles/project setup before these commands are usable. Use the project's required CLI invocation, for example:

```sh
npx eas-cli@latest build --platform all --profile development
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios
npx eas-cli@latest submit --platform android
# After EAS Update and a compatible runtime/channel are configured:
npx eas-cli@latest update --channel production --message "Release description"
```

EAS supplies cloud app binaries and signing; production updates and store submissions are deliberate release actions. New native dependencies require a compatible development build, and native/runtime changes need a new binary rather than only an OTA bundle. [EAS Build](https://docs.expo.dev/build/introduction/), [first-build setup](https://docs.expo.dev/build/setup/), [submission](https://docs.expo.dev/deploy/submit-to-app-stores/), [EAS Update](https://docs.expo.dev/eas-update/introduction/).

Record actual device/platform, build/version, tested command sequences, save/relaunch outcomes and limitations. Passing headless tests, a web session or a bundle export does not prove native audio, SQLite, accessibility, signing or installed gameplay. This documentation revision configures no release service and claims no new device acceptance.
