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
app (routes, thin) ─┐
presentation ───────┼─→ stores ─→ application ─→ domain ─→ core
game (renderer) ────┤
data ───────────────┘──────────↗ (data implements application/domain interfaces)
```

| Layer           | Path               | May import                                        | Must never import                                                         |
| --------------- | ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------- |
| Core            | `src/core`         | nothing (pure TypeScript)                         | everything above it, incl. `domain`                                       |
| Domain          | `src/domain`       | `core`                                            | React, React Native, Expo, Skia, Reanimated, Zustand, outer layers        |
| Application     | `src/application`  | `domain`, `core`                                  | UI/native/state packages, `data`, `stores`, `game`, `presentation`, `app` |
| Data            | `src/data`         | `application`, `domain`, `core`, Expo SDK         | React DOM, renderer stack, `stores`, `game`, `presentation`, `app`        |
| Stores          | `src/stores`       | `application`, `domain`, `core`, Zustand          | renderer stack, `data`, `game`, `presentation`, `app`                     |
| Game (renderer) | `src/game`         | `application`, `domain`, `core`, Skia/Reanimated  | Zustand, `data`, `stores`, `presentation`, `app`                          |
| Presentation    | `src/presentation` | `stores`, `application`, `domain`, `core`, `game` | `data`, `app`                                                             |
| Routes          | `src/app`          | everything inward (keep files thin)               | —                                                                         |

These rules are **enforced automatically** by per-directory `no-restricted-imports`
zones in [`eslint.config.js`](eslint.config.js), so `npm run lint` fails on a
boundary violation. Grow folders feature by feature; do not create empty ones.

Key invariants (details in the game plan):

- `src/domain` and `src/core` are pure TypeScript — no React, React Native, Expo,
  Skia, Reanimated, or Zustand imports. They are tested in a plain Node
  environment (`jest-expo/node`), so nothing native loads to run them.
- The renderer (`src/game`) consumes immutable scene snapshots and never mutates
  gameplay state; Skia/Reanimated values hold no authoritative game truth.
- Route files (`src/app`) stay thin and delegate to `src/presentation` screens.
- Data layer implementations are injected at bootstrap; domain/application code
  depends on interfaces, never on SQLite/HTTP/provider SDKs.

## Tests

Jest runs two projects (see [`jest.config.js`](jest.config.js)):

- `unit` — pure TypeScript tests under `__tests__/{core,domain,application,data}`,
  executed with the `jest-expo/node` preset in a plain Node environment.
- `ui` — component/store tests under `__tests__/{app,game,presentation,stores}`,
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

Current stack: Expo SDK 57 · React Native 0.86 · Expo Router (typed routes) ·
Reanimated 4 + Worklets · Gesture Handler · Skia 2.x · Zustand 5 · Zod 4 ·
expo-asset/audio/haptics · jest-expo · ESLint 9 flat config + Prettier.

## Native workflow (CNG + development builds)

This project uses **Continuous Native Generation**: `ios/` and `android/` are
generated and gitignored. Never hand-edit them; change `app.json`/config
plugins and regenerate.

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
