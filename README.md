# Rebirth Dungeon

A 2D pixel-art dungeon crawler with dice-based combat and gacha mechanics,
built with Flutter + Flame.

- `dart-game-plan.md` — full architecture and stack decisions.
- `project-phases.md` — implementation checklist and completion log.
- `ARCHITECTURE.md` — the short, enforceable layer rules.

## Development

```bash
make setup    # flutter pub get
make gen      # build_runner code generation
make check    # format-check + analyze + architecture boundaries + tests
make run      # run on the current device
```

Individual steps: `make format`, `make analyze`, `make boundaries`, `make test`.

Continuous integration (`.github/workflows/ci.yml`) runs the same checks on
every push and pull request.

## Project layout

Flutter owns the app shell and meta-game UI, Flame renders only the dungeon
scene, and all game rules live in a pure-Dart `lib/domain/` layer with no
Flutter or Flame dependencies. See `ARCHITECTURE.md` for the dependency
rules and how they are enforced.

```text
lib/
├── app/            MaterialApp shell, go_router, theme
├── core/           randomness, time, ids, errors, engine contracts (pure Dart)
├── domain/         combat, dungeon, loot, progression, economy, gacha
├── application/    Riverpod controllers
├── data/           Drift database, repositories
├── game/           Flame scene: DungeonGame, components, effects
└── presentation/   Flutter screens and widgets
```

Versioned game content lives in `assets/data/` (one `schemaVersion`-wrapped
JSON file per entity type), parsed and validated by `lib/domain/content/`.
