# Rebirth Dungeon

A roguelike dice-combat mobile game built with React Native, Expo SDK 57, and Skia.
The implementation plan and phase tracker live in
[`project-phases.md`](project-phases.md); the full architecture decisions are in
[`react-native-expo-game-plan.md`](react-native-expo-game-plan.md).

## Commands

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm start`            | Start Metro for a development build                             |
| `npm run ios`          | Start Metro and boot the last iOS simulator                     |
| `npm run android`      | Start Metro and boot an Android emulator/device                 |
| `npm run lint`         | ESLint (includes the automated layer-boundary rules)            |
| `npm run typecheck`    | `tsc --noEmit`                                                  |
| `npm test`             | Jest (unit + ui projects)                                       |
| `npm run test:watch`   | Jest in watch mode                                              |
| `npm run format`       | Prettier write                                                  |
| `npm run format:check` | Prettier check (CI gate)                                        |
| `npm run doctor`       | `expo-doctor` project health check                              |
| `npx expo run:ios`     | Native iOS development build + launch (simulator or `--device`) |
| `npx expo run:android` | Native Android development build + launch                       |

Run checks the way CI does before handing off work:

```bash
npm run format:check && npm run lint && npm run typecheck && npm test -- --ci
```

## Architecture

Dependency direction points **inward**; inner layers know nothing about outer ones:

```text
app (routes, thin) ──→ presentation ──→ stores ──→ application ──→ game (ECS simulation) ──→ domain ──→ core
data ────────────────────────────────────────────────────↗ (data implements application/domain ports)
```

| Layer             | Path               | May import                                                                                              | Must never import                                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Core              | `src/core`         | nothing (pure TypeScript)                                                                               | everything above it, incl. `domain` and Effect                                                    |
| Domain            | `src/domain`       | `core`                                                                                                  | React, React Native, Expo, Skia, Reanimated, Zustand, Effect, ECS/rot-js, outer layers            |
| Game (simulation) | `src/game`         | `domain`, `core`, `@esengine/ecs-framework`, `rot-js` (only via `src/game/rot` adapters)                | React, React Native, Expo, Zustand, SQLite, Skia, Reanimated, Effect, provider SDKs, outer layers |
| Application       | `src/application`  | `game`, `domain`, `core`, Effect (services/programs)                                                    | UI/native packages, Expo SDK, Zustand, renderer stack, `data`, `stores`, `presentation`, `app`    |
| Data              | `src/data`         | `application`, `domain`, `core`, Expo SDK, Effect                                                       | React DOM, renderer stack, Zustand, `stores`, `game`, `presentation`, `app`, ECS/rot-js           |
| Stores            | `src/stores`       | `application`, `domain`, `core`, Zustand, Effect                                                        | renderer stack, `data`, `game`, `presentation`, `app`, ECS/rot-js                                 |
| Presentation      | `src/presentation` | `stores`, `application`, `domain`, `core`, `game` (snapshots/pure helpers), RN/Skia/Reanimated, Zustand | `data`, `app`, Effect programs, direct `@esengine/ecs-framework`/`rot-js` imports                 |
| Routes            | `src/app`          | everything inward (keep files thin)                                                                     | —                                                                                                 |

These rules are **enforced automatically** by per-directory `no-restricted-imports`
zones in [`eslint.config.js`](eslint.config.js), so `npm run lint` fails on a
boundary violation. Grow folders feature by feature; do not create empty ones.

Key invariants (details in the game plan):

- `src/core` and `src/domain` are pure TypeScript — no React, React Native,
  Expo, Skia, Reanimated, Zustand, or Effect. They are tested in a plain Node
  environment (`jest-expo/node`), so nothing native loads to run them.
- `src/game` is the ECS/rot-js **simulation** and the single source of gameplay
  truth. Its only library dependencies are the two pinned gameplay libraries;
  `rot-js` is reached only through adapters in `src/game/rot/**`. Simulation
  code never imports React, React Native, Expo, Zustand, SQLite, Skia,
  Reanimated, or Effect, and never `await`s during a turn.
- The renderer (Skia/Reanimated, under `src/presentation/canvas`) consumes
  immutable scene snapshots and never mutates gameplay state; Skia/Reanimated
  values hold no authoritative game truth.
- Effect only runs fallible and asynchronous work at the application boundary
  (`src/application` and outward); `src/core`, `src/domain`, and `src/game`
  never import it.
- Route files (`src/app`) stay thin and delegate to `src/presentation` screens.
- Data layer implementations are injected at bootstrap; domain/application code
  depends on interfaces, never on SQLite/HTTP/provider SDKs.

## Phase 1 spike (current)

The spike retires the integration risks between the four libraries on Hermes:

- **ECS** — `src/game/ecs/` builds one `Core` + `Scene` whose lifecycle the
  spike route owns: created on mount, `dispose()`d on unmount (`Core` is an
  app-wide singleton owning exactly one scene — one run, one Scene). Two
  systems with explicit `updateOrder` (Patrol 100 → Sprite 200) step actors
  through `Core.update()` with a fixed dt; an order log in `sceneData` proves
  the ordering in tests. Components/systems use `@ECSComponent`/`@ECSSystem`
  decorators — enabled by `experimentalDecorators` in tsconfig, while
  babel-preset-expo applies the legacy-decorators transform automatically.
- **rot-js** — `src/game/rot/rot-random.ts` wraps the shared module `ROT.RNG`
  in a synchronous save/seed/run/capture/restore (`runWithRotRng`); the state
  is restored even when generation throws. `rot-dungeon-generator.ts` runs
  `Map.Digger` inside that wrapper, paints project tile IDs, and validates
  spawn/exit connectivity with deterministic retry seeds and a typed
  `GenerationError`.
- **Effect** — `src/bootstrap/effect-runtime.ts` holds the app-scoped
  `ManagedRuntime`. The spike ticker is a fiber started with `startTicker()`
  and interrupted by the route on unmount (`fiber.interruptUnsafe()`), tested
  in `__tests__/application/spike-ticker.test.ts`. `effect` ships ESM-only;
  Metro handles it, and Jest transforms it via `transformIgnorePatterns` in
  the unit project (babel-preset-expo's default `import.meta` polyfill keeps
  it Hermes-safe).
- **Rendering** — the route projects the scene into one frozen
  `SceneSnapshot` (`src/game/projection/`); the Skia canvas renders the baked
  map + atlas sprites while the ticker pushes committed positions into
  Reanimated shared values. No Reanimated/Skia object ever holds gameplay
  truth.

## Rendering baseline (Phase 1 decision)

- **Logical reference viewport: 240 × 320** logical pixels (portrait); **base
  tile: 16 × 16** (`src/game/config.ts`). A 15 × 20-tile view is the reference
  screenful.
- The renderer picks the **largest integer device-pixel scale** that fits the
  reference viewport and centers it, so one logical pixel is always a whole
  number of device pixels. The HUD can cycle zoom steps (device-pixel
  multiples) at runtime.
- **Nearest-neighbor sampling everywhere**: the static map is baked once into a
  Skia picture with `FilterMode.Nearest`, and actors draw from the atlas via
  the `Atlas` component with `sampling={{ filter: nearest, mipmap: none }}`.
- Camera translations are snapped to whole device pixels after follow-lerp and
  screen shake, keeping texel edges aligned while panning.
- Spike atlases are generated pixel-by-pixel by
  `scripts/generate-spike-atlases.mjs` (deterministic, dependency-free PNG
  writer) and described by `assets/atlases/manifest.json`, which is
  Zod-validated and cross-checked against the decoded image dimensions at
  load time. `loadGameAssets()` fails with a typed `AssetLoadingError` listing
  every missing/invalid asset by name.

## Tests

Jest runs two projects (see [`jest.config.js`](jest.config.js)):

- `unit` — pure TypeScript tests under `__tests__/{core,domain,application,data,game}`,
  executed with the `jest-expo/node` preset in a plain Node environment.
- `ui` — component/store tests under `__tests__/{app,presentation,stores}`,
  executed with the full `jest-expo` preset.

## Dependencies

Expo SDK 57 pins exact compatible versions of native/Expo packages.

- **Always install Expo/RN packages with `npx expo install <pkg>`** (never plain
  `npm install`) so versions match the SDK. `npx expo install --check` audits and
  fixes drift.
- Add a dependency **only when the phase that needs it begins**
  ([`project-phases.md`](project-phases.md) lists the planned stack).
- If npm warns about blocked install scripts (new npm allow-list behavior),
  review them and approve with `npm install-scripts approve <pkg>@<version>`
  (done for `@shopify/react-native-skia`, `fsevents`, `unrs-resolver`).

The three gameplay libraries are pinned to **exact reviewed versions** (no
caret ranges), so an upgrade is always an intentional `package.json` change:

- `@esengine/ecs-framework` `2.11.2`
- `effect` `4.0.0-rc.112` — RC upgrades are deliberate edits, never caret bumps
- `rot-js` `2.2.1`

Current stack: Expo SDK 57 · React Native 0.86 · Expo Router (typed routes) ·
Reanimated 4 + Worklets · Gesture Handler · Skia 2.x · Zustand 5 · Zod 4 ·
expo-asset/audio/haptics · jest-expo · fast-check · ESLint 9 flat config +
Prettier.

## Domain foundations & content (Phase 2)

Game rules live in pure TypeScript under `src/core` and `src/domain`; the
domain knows nothing about React, Expo, Skia, or Zustand, and its tests run in
a plain Node Jest project.

- **Randomness** (`src/core/random/`): engines receive a `RandomSource`, never
  `Math.random()`. `SeededRandomSource` is a serializable mulberry32 PRNG
  (snapshot/restore reproduces a sequence exactly, draw counts included);
  `SequenceRandomSource` is the scripted test fake that throws when exhausted.
- **RNG streams** (`src/domain/shared/rng-streams.ts`): one independent
  generator per system (`dungeon`, `enemyAi`, `combat`, `loot`, `cosmetics`,
  `gacha`) is derived from a master seed, so drawing in one system never
  shifts another. Runs snapshot/restore streams individually. Randomness and
  stream independence are property-tested with fast-check.
- **Engine conventions** (`src/domain/shared/`): commands are flat
  discriminated unions, systems emit ordered domain events exported from the
  scene as immutable batches (`EngineResult` remains for pure helper
  engines), mutations use `deepFreeze`d immutable states, and exhaustive
  switches end in `assertNever` (`src/core/utils/`).
- **Content** (`src/domain/content/` + `assets/data/`): heroes, monsters,
  dice, abilities, status effects, items (equipment/consumable/material),
  loot tables, rarity tables, encounters, dungeons, generation profiles,
  banners (with optional pity-rule references), pity rules, tile definitions
  (contract-tested against the grid's `TileId` space and the atlas manifest),
  and experience curves are data files validated with Zod at load time. IDs
  are branded (`HeroId`, `MonsterId`, …), and `buildContentCatalog`
  cross-checks every reference, producing `ContentValidationError` problems
  that name the file, entry, and field.
- **Access** (`src/application/ports/content-repository.ts`): the app depends
  on the `ContentRepository` interface; `BundledContentRepository`
  (`src/data/content/`) implements it with the bundled JSON.

To change gameplay numbers, edit the JSON files — no engine source changes.
`npm test` re-validates every bundled file and every cross-reference.

## Native workflow (CNG + development builds)

This project uses **Continuous Native Generation**: `ios/` and `android/` are
generated and gitignored. Never hand-edit them; change `app.json`/config
plugins and regenerate.

> **Expo Go is not supported.** Expo Go no longer bundles third-party native
> modules, and this project requires Skia. Scanning the QR code into Expo Go
> fails at startup with "Skia is unavailable in this runtime" (by design — the
> asset loader reports it explicitly). Always launch through a development
> build: `npx expo run:ios`, `npx expo run:android`, or an EAS development
> build.

Verify and use native changes:

```bash
npx expo prebuild --platform ios --no-install      # validate native config
npx expo prebuild --platform android --no-install
npx expo run:ios                                    # build + install dev build (simulator)
npx expo run:ios --device                           # build + install on a physical device
npx expo run:android                                # build + install on emulator/device
```

After changing native config or adding a native package, rebuild the dev build
(`expo run:ios|android`) — JS-only changes just reload Metro.

Notes from this machine's setup:

- **Android builds need a JDK 17/21 runtime**, not 24+. The user-global
  `~/.gradle/gradle.properties` on this machine pins `org.gradle.java.home` to
  Temurin 25, which makes AGP's Prefab step fail ("restricted method" warnings
  are scraped as fatal errors). Run local Android builds with an override:

  ```bash
  JH17=$(/usr/libexec/java_home -v 17)
  JAVA_HOME="$JH17" PATH="$JH17/bin:$PATH" GRADLE_OPTS="-Dorg.gradle.java.home=$JH17" \
    npx expo run:android
  ```

- On iOS 26 simulators the first `expo-development-client://` deep link shows a
  system "Open in …?" confirmation that cannot be auto-dismissed headlessly.
  For unattended launches, cold-start the app with the dev launcher's process
  argument instead:
  `xcrun simctl launch <udid> <bundle-id> --args --initialUrl "<dev-client-url>"`.

### EAS profiles ([`eas.json`](eas.json))

| Profile       | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `development` | Dev client build; iOS artifact targets the simulator |
| `preview`     | Release-mode internal QA build for physical devices  |
| `production`  | Store submission build (`autoIncrement` on)          |

```bash
npm i -g eas-cli         # or: npx eas-cli
eas login
eas build --profile development --platform all
```

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to
`main` and every PR:

1. `quality` — format check, lint (with boundary zones), typecheck, tests.
2. `native-config` — `expo-doctor` plus an Android `expo prebuild` to prove the
   native config still generates.
