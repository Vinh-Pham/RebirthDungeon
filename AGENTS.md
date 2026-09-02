# Rebirth Dungeon — Agent Instructions

## Read first

1. [`react-native-expo-game-plan.md`](react-native-expo-game-plan.md) — the architecture. Its rules are binding: when code and plan disagree, fix the code or change the plan deliberately first.
2. [`project-phases.md`](project-phases.md) — the dependency-ordered tracker. **Work the first unchecked phase** unless the user reorders. Check a box only after inspecting the implementation and running the relevant tests/builds — never trust a stale checkbox, and never check one because a placeholder or happy-path demo exists. When completing a phase, update its checkboxes, **Current Focus**, and the **Completion Log** in the same change; leave dated notes under partially done or blocked phases.
3. [`README.md`](README.md) — commands, layer table, native workflow, and the current spike design.

## Expo SDK 57 has changed

Read the exact versioned docs at <https://docs.expo.dev/versions/v57.0.0/> before using any Expo API or adding an Expo package. Install Expo/React Native packages only with `npx expo install` (never bare `npm install`); `npx expo install --check` audits drift.

## Architecture (enforced by lint — `npm run lint` fails on violations)

Dependency direction points inward: presentation → stores → application → game (simulation) → domain → core; data implements application ports. The full per-layer table is in README → "Architecture"; the zones live in `eslint.config.js`. Non-negotiables:

- `src/game` is the pure ECS/rot-js simulation. Its only library imports are `@esengine/ecs-framework` and `rot-js`, and rot-js may only be imported inside `src/game/rot/**` (project-owned adapters). Never React, React Native, Expo, Zustand, SQLite, Skia, Reanimated, or Effect.
- `effect` runs fallible and asynchronous work at the application boundary and outward; `src/core`, `src/domain`, and `src/game` never import it.
- ECS systems are synchronous: no `await`, timers, async I/O, audio, haptics, or store writes inside a turn. A command enters, the ECS + rot-js adapters resolve it deterministically, and only then does Effect do external work and presentation animate the committed result.
- **One run = one `Scene`.** The ECS `Core` is an app-wide singleton; dispose the current run before creating the next (route unmount owns this).
- Do not add `ROT.Display`, `ROT.Engine`, a second ECS, another game loop, or a second source of gameplay truth.
- Authoritative positions and outcomes never live in Skia, Reanimated, or Zustand objects; presentation consumes frozen immutable snapshots.

## Dependencies

- The gameplay libraries are pinned to exact reviewed versions — `@esengine/ecs-framework` 2.11.2, `effect` 4.0.0-rc.112, `rot-js` 2.2.1. No caret ranges; an Effect RC upgrade is a deliberate `package.json` edit, never a caret bump.
- Add a dependency only when the phase that needs it begins.

## Verification (run before handing off)

```bash
npm run format:check && npm run lint && npm run typecheck && npm test -- --ci
```

- Pure simulation/domain tests run in the Jest `unit` project on `jest-expo/node` — no React Native loads. `effect` ships ESM-only and is transformed via `transformIgnorePatterns` in `jest.config.js`; a new ESM-only dependency needs the same treatment.
- `npx expo export --platform ios` is a fast full Metro/Hermes bundle check before spending time on native builds.

## Native workflow (development builds only — Expo Go cannot run this project)

- Development builds: `npx expo run:ios` / `npx expo run:android`. Production checks: `--configuration Release` (iOS) / `--variant release` (Android). Rebuild after adding a native package or changing `app.json`; JS-only changes just reload Metro.
- Android local builds need the JDK 17 override from README → "Native workflow" **plus** `ANDROID_HOME` (e.g. `~/Library/Android/sdk`).
- On iOS 26+ simulators the first dev-client deep link can block behind a system confirmation; relaunch with `xcrun simctl launch <udid> com.anonymous.RebirthDungeon --args --initialUrl "http://localhost:8081"`.
- Toolchain gotchas that already cost time — decorator setup, Effect ESM/`import.meta` handling, the presentation-hook identity rule, worklet restrictions — are recorded in `project-phases.md` → **Work Notes**. Read them before touching ECS, Effect, or rendering code.
