# Rebirth Dungeon project guidelines

This is an Expo/React Native RPG with a deterministic TypeScript game engine, turn-based combat, dungeon exploration, character progression, and local saves. Prioritize mobile-first patterns, performance, and compatibility across iOS, Android, and web.

## Read the project docs before implementation

- Start with [README.md](README.md) for setup and [docs/game-plan.md](docs/game-plan.md) for architecture, ownership, and the delivery roadmap.
- Read the relevant documents below before changing a feature. Follow their implementation details, invariants, and acceptance criteria, and inspect the owning source modules and existing tests.
- Distinguish implemented behavior from proposed extensions. A roadmap or reference table does not authorize implementing every planned feature or exposing unsupported functionality.
- Current user instructions define the requested change. When docs and source disagree, inspect the implementation and tests to establish current behavior; identify the discrepancy and update the relevant docs alongside the change.
- Keep detailed formulas, progression tables, transaction rules, and feature specifications in `docs/` and their owning modules. Use this file for shared project guidelines rather than duplicating values that can become stale.

| Work area                                                                      | Read for implementation details                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Architecture, playable loop, session ownership, saves, delivery                | [docs/game-plan.md](docs/game-plan.md)                                                                        |
| Immutable campaign updates, snapshots, draft composition, state performance    | [docs/immutable-state.md](docs/immutable-state.md)                                                            |
| Character setup, leveling, AP, cumulative levels, talents, aging/rebirth scope | [docs/gameplay/character.md](docs/gameplay/character.md)                                                      |
| Attributes, combat stat derivation, resources, wounds, fullness, statuses      | [docs/gameplay/stats.md](docs/gameplay/stats.md)                                                              |
| Turn flow, targeting, attacks, skills, damage, encounter results               | [docs/gameplay/battle.md](docs/gameplay/battle.md)                                                            |
| Skill acquisition, learned ranks, training objectives, AP costs                | [docs/gameplay/skills.md](docs/gameplay/skills.md) and [src/data/skills/README.md](src/data/skills/README.md) |
| Inventory, item ownership, equipment instances, durability                     | [docs/gameplay/inventory.md](docs/gameplay/inventory.md)                                                      |
| Town movement, shops, repairs, healing, dungeon entry                          | [docs/gameplay/towns.md](docs/gameplay/towns.md)                                                              |
| Quest prerequisites, stages, evidence, tracking, reward claims                 | [docs/gameplay/quests.md](docs/gameplay/quests.md)                                                            |
| Title discovery, awards, selection, eligibility, stat effects                  | [docs/gameplay/titles.md](docs/gameplay/titles.md)                                                            |
| Enchant application, conditions, failure, burning, saved outcomes              | [docs/gameplay/enchants.md](docs/gameplay/enchants.md)                                                        |
| Screens, navigation, accessibility, mobile interaction, presentation           | [docs/gameplay/user-interface.md](docs/gameplay/user-interface.md)                                            |

External game references supply research, not automatically executable rules. When using them, verify the requested source, record its URL with the authored data or documentation, and translate only the mechanics within the requested scope. Use Firecrawl for game-reference documentation research when available or requested.

## Follow the directory structure

Extend the existing owner and nearby patterns before creating a new abstraction. Place new files in the matching feature directory; keep non-route code outside `src/app/`.

| Directory                                        | Responsibility                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `src/app/`                                       | Thin Expo Router screen entry points and navigator layouts                                                        |
| `src/ui/`                                        | Feature screens and controls, grouped under battle, journey, menu, navigation, quests, skills, titles, and shared |
| `src/components/`                                | Reusable general UI components; feature UI belongs under `src/ui/`                                                |
| `src/hooks/`, `src/constants/`, `src/global.css` | Shared React hooks, theme constants, and app styling tokens                                                       |
| `src/game/`                                      | Journey/battle sessions, host lifecycles, encounter integration, and durable action coordination                  |
| `src/engine/`                                    | Headless simulation, typed commands/events, seeded randomness, and engine systems                                 |
| `src/engine/rpg/`                                | Character progression, stats/resources, skills, inventory, quests, titles, and enchant rules                      |
| `src/engine/battle/`, `src/engine/ecs/`          | Battle state flow/resolution and entity/component systems                                                         |
| `src/engine/world/`, `src/engine/dungeon/`       | World traversal, dungeon generation, and dungeon state validation                                                 |
| `src/data/`, `src/data/schemas/`                 | Authored JSON content, content loading, Zod schemas, and cross-reference validation                               |
| `src/persistence/`                               | Character profiles, save schemas/migrations, repositories, autosave, and platform storage adapters                |
| `src/renderer/`                                  | Skia worlds/sprites, targeting presentation, cameras, and animation queues                                        |
| `src/audio/`, `src/state/`                       | Audio lifecycle and UI/preferences state; authoritative gameplay stays in the session/engine                      |
| `src/tests/`                                     | Vitest suites grouped by engine, RPG, battle, world, data, persistence, presentation, and audio                   |
| `assets/`, `public/`                             | Bundled artwork/audio and web assets; register game artwork in `src/ui/shared/gameImages.ts`                      |
| `docs/`, `scripts/`                              | Project/feature specifications and development or verification tooling                                            |

Keep native/web differences in the existing `.web.ts` / `.web.tsx` adapter pattern. Put tests in the corresponding `src/tests/` area instead of route directories. Keep fetched research in ignored `.firecrawl/` files; document durable findings in `docs/` or content source metadata.

## Create game artwork with Aseprite MCP

Use **Aseprite MCP tools whenever a new image is needed or requested for the game**. Include a short description of what the image depicts and its intended in-game use in the task output.

Save each asset in the folder matching its category:

| Asset category   | Destination                |
| ---------------- | -------------------------- |
| Consumable items | `assets/game/consumables/` |
| Town decorations | `assets/game/decorations/` |
| Enemies          | `assets/game/enemies/`     |
| NPCs             | `assets/game/npcs/`        |
| Skill icons      | `assets/game/skills/`      |
| Weapons          | `assets/game/weapons/`     |

Name the final image **`{item name}.png`** and keep its editable source as **`{item name}.aseprite`** in the same folder.

Every new image must meet these requirements:

- Exactly **32 × 32 pixels**.
- Transparent background.
- Use only colors from [assets/game/lospec500.txt](assets/game/lospec500.txt).
- Use a dark purple from that palette for outlines instead of pure black.
- Light the sprite from the top left.
- Use an RPG pixel-art style.
- Keep the silhouette and details readable at native resolution.

After drawing, follow this sequence with Aseprite MCP tools:

1. Render the sprite for preview.
2. Visually inspect it at its native 32 × 32 resolution.
3. Improve the silhouette.
4. Reduce unnecessary colors while staying within the palette.
5. Render and inspect the refined sprite, then export the final transparent PNG at 32 × 32.
6. Save the original editable `.aseprite` file alongside the PNG.

Register new artwork in the owning static asset registry, including `src/ui/shared/gameImages.ts` when used by item or skill UI, following the existing asset-loading patterns.

## Implementation boundaries

- Keep engine and RPG rules runnable without React Native, rendering, storage, or a device clock. React displays subscribed snapshots and dispatches typed commands; it does not maintain duplicate gameplay formulas or balances.
- Reuse the selected character's `CharacterGameContext` and `JourneyHost`. Feature routes, tabs, overlays, and journals must not create a second campaign or grant progression on render/navigation.
- Use the existing seeded `GameRandom` streams for gameplay. Preserve draw order and saved state; animations, sound, elapsed frames, and global random functions must not determine gameplay outcomes. Supply an explicit clock to any new time-dependent rule.
- Preserve encounter isolation and checkpoint semantics. Commit encounter resources, wear, training, and rewards through the owning session/host; restarting an unfinished encounter must not retain uncommitted gains.
- Use the host's durable candidate/save operation for progression and transactions. Validate the whole candidate before publication, retain it on a failed write, and retry the same candidate without charging costs, granting rewards, or drawing RNG again.
- Extend typed content schemas and validate IDs, ranges, ownership, and cross-references when adding content. Scraped skill tables alone do not make a skill usable; author the supported runtime adapter and progression behavior.
- Derive stats through the shared resolver. Changes to equipment, titles, enchants, or skill ranks preserve depleted resources and clamp reduced capacities; only explicit recovery actions refill them.
- When changing persisted contracts, inspect `src/persistence/SaveSchema.ts`, add a versioned migration when needed, and preserve existing character ownership and earned progress. Campaign-format migrations and storage-database migrations are separate concerns. Corrupt or future saves must not silently replace a character.
- Reuse HeroUI, `src/ui/shared/DungeonUI.tsx`, and current Uniwind/theme tokens. Provide complete touch interactions, safe-area handling, readable small-screen layouts, and accessible labels; preserve web keyboard behavior.
- Keep rendering and audio as observers of resolved state/events. Avoid per-frame React updates; clean up subscriptions, timers, sessions, and playback resources on exit/background transitions.

## Immutable campaign state

Read [docs/immutable-state.md](docs/immutable-state.md) before changing campaign updates, RPG candidates, snapshots or save checkpoint ownership. Follow `src/engine/immutableState.ts`, the owning session/RPG modules and `src/tests/world/ImmutableCampaign.test.ts`.

- Route campaign writes through the existing `JourneySession` transition and `produceState` boundary. Use one synchronous producer per leaf command and compose reusable `*Draft` RPG operations inside it; do not call public immutable candidate functions inside another recipe. Preserve `TRAVEL_TO` as individually committed `MOVE` steps.
- Use `HeroSnapshot`, `CampaignSnapshot` and `DungeonSnapshot` for read-only consumers; mutable schema types describe owned data being constructed, parsed or exported. Never cast a snapshot to a mutable type to bypass ownership. Public RPG candidate functions return frozen heroes; explicitly copy their results when a caller or test needs editable data.
- Draft only owned plain JSON trees. Keep session instances, Miniplex entities, RNG generators, battle controllers, subscriptions, animation queues, audio and storage objects outside Immer. Avoid cycles and multiple references to the same mutable object within a campaign tree.
- Reuse the dedicated Immer instance in `immutableState.ts`. Keep automatic freezing enabled in development and production; do not change global Immer settings or introduce patches, Map/Set plugins or class drafting without a demonstrated requirement.
- Stage RNG draws, messages, service state, respawn requests and outgoing events with the campaign draft. A rejected recipe must leave the committed view, RNG, ECS and metadata unchanged. Synchronize independent ECS components and notify observers only after successful resolution. Notification failures do not roll back or authorize replaying an accepted action; preserve the reentry guard.
- Keep observation pure. `getSnapshot()` and view projection must not reconcile quests/titles, grant progression or draw randomness. Reconcile through initialization or the owning accepted transition.
- Drafts must not escape a recipe into entities, observers, retained candidates or asynchronous work. Use `readPlain` only for synchronous read queries that need the latest draft values; never mutate or publish that temporary projection. Obtain returned receipts and other retained references from finalized state.
- Preserve battle isolation. Copy inventory, learned skills, weapon/enchant values and temporary effect entries through `applyHero` or the existing mutable ownership boundary. Mutable simulation components must not borrow draft proxies or frozen campaign objects.
- Preserve structural sharing for unchanged hero branches and dungeon geometry. Candidates share their initial immutable checkpoint while owning independent engines. The host and autosaver retain frozen checkpoint references; do not deep-clone campaign data on each notification. Keep complete save validation/serialization and `toSave()` as a genuinely detached mutable export, and parse external inputs into independent data before freezing them.
- When changing these boundaries, cover frozen old snapshots, unchanged references, late rejection/RNG rollback, draft escape, encounter isolation and exact failed-write retries as applicable. For changes to shared update paths, use `scripts/profile-campaign.mjs` to compare representative small and populated campaigns. Do not disable freezing to hide a regression or treat desktop timings as native device performance evidence.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

The project currently uses npm with `package-lock.json`. Use the scripts in `package.json`; use `bunx` instead of `npx` if the project adopts Bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
npm test                   # run the Vitest suite
npm run test:watch         # iterate on tests
npm run format             # format the project with oxfmt
npm run format:check       # check formatting without writing changes
```

After every file creation or update, immediately run `npm run format` before continuing with further work. This runs oxfmt using `.oxfmtrc.json` and the project's existing ignore rules. Do not defer formatting until the end of the task.

Run `npm run format:check`, lint, and typecheck before declaring any task done.

Run focused tests for changed gameplay, content, or persistence rules. Add meaningful regressions for changed behavior, including invalid commands, deterministic results, migration preservation, and failed-write retries where relevant. Run the full suite for changes spanning shared progression, stat resolution, or save contracts. Use the runtime required by the README for storage integration tests. For UI changes, verify the affected interaction on compact layouts and applicable native/web platforms; report any checks that could not be performed.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
