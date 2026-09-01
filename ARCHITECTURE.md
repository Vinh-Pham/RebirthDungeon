# Architecture

> **Flame renders the game. Your Dart domain decides what happens in the game.**

Full rationale lives in `dart-game-plan.md` (sections 1, 7, 24–25, 29). This
file is the short, enforceable version for day-to-day work.

## Layers and dependency direction

```text
presentation/ (Flutter widgets)      game/ (Flame scene)
        │                                  │
        ▼                                  │
application/ (Riverpod controllers) ◄──────┘
        │
        ▼
   domain/  +  core/          ◄── pure Dart, no Flutter/Flame, ever
        ▲
     data/ (Drift, storage, future remote APIs)
```

Allowed dependencies:

| Layer         | May depend on                          |
|---------------|----------------------------------------|
| `presentation`| `application`, `domain`                |
| `game`        | `application`, `domain` (events)       |
| `application` | `domain`, repository interfaces        |
| `data`        | `domain`, repository interfaces        |
| `domain`      | `core`, pure-Dart packages only        |
| `core`        | pure-Dart packages only                |

Forbidden everywhere:

- `domain` and `core` importing Flutter, Flame, Rive, or any upper layer.
- Flame components computing authoritative gameplay outcomes or owning game
  state; all results come from domain engines as state + events.
- `Random()` scattered through engines — randomness is injected
  (`RandomSource`, Phase 1); combat RNG and gacha RNG stay separate.
- SharedPreferences holding anything beyond UI preferences (never currency,
  inventory, ownership, pity, or run state).

## Folder map

```text
lib/
├── main.dart            ProviderScope + app bootstrap
├── app/                 MaterialApp shell, go_router, theme
├── core/                randomness, time, ids, errors, engine contracts, value objects (pure Dart)
├── domain/              combat, dungeon, loot, progression, economy, gacha
├── application/         Riverpod controllers/providers
├── data/                Drift database, repositories, platform integrations
├── game/                Flame: DungeonGame, components, effects, event bridge
└── presentation/        Flutter screens and widgets
```

Each layer folder carries a `README.md` with its specific rules. Add
subfolders per feature as they become necessary — do not pre-create them.

## Enforcement

`dart run tool/check_architecture_boundaries.dart` scans `lib/core/` and
`lib/domain/` for forbidden imports (`dart:ui`, `package:flutter*`,
`package:flame*`, `package:rive`, and imports of upper layers) and fails with
file/line details. It runs locally via `make check` and in CI. UI-facing
packages (Drift, SharedPreferences, Flame) belong only in `data/`, `game/`,
`app/`, and `presentation/`.

## Commands

| Command                   | Purpose                              |
|---------------------------|--------------------------------------|
| `make setup`              | `flutter pub get`                    |
| `make gen`                | build_runner code generation         |
| `make format`             | format `lib`, `test`, `tool`         |
| `make format-check`       | CI formatting check                  |
| `make analyze`            | `flutter analyze`                    |
| `make boundaries`         | pure-Dart boundary check             |
| `make test`               | `flutter test`                       |
| `make check`              | format-check + analyze + boundaries + test |
| `make run`                | run the app on the current device    |
