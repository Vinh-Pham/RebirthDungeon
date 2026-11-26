# Rebirth Dungeon

A keyboard-friendly science-fantasy dungeon crawler built with Vite, TypeScript,
React, HeroUI and PixiJS through `@pixi/react`.

## Run

Use Node 24 or 26+ and pnpm 12.6.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. Create a character, speak with Ilex, and
explore Lantern Rest, Spindle Hollow and the Threshold. Move with WASD/arrows,
interact with E/Enter, and use the visible keyboard hints for menus and combat.
In Inventory, drag items between cells or use the arrow keys and Enter to move
them. Change game shortcuts in Settings.
The canvas supports click-to-move, panning and zooming. Create a new character
to start in the current IndexedDB save store.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`dev` and `build` reproduce the web asset pack from the retained original art,
fonts, palette and Ink stories. Build output is in `dist/`.

## Project

- `src/game/` contains simulation, world generation, content and persistence.
- `src/render/` contains the Pixi scene, tilemap, camera and animation adapter.
- `src/ui/` contains HeroUI screens and keyboard-friendly menus.
- `assets/`, `palette/` and `inspiration/` retain art sources and licenses.
- `tools/web/` contains asset packing and browser verification.
- `tests/web/` contains Vitest and fast-check suites.

Read the [documentation index](docs/README.md), [web tooling](docs/web-tooling.md),
[implementation status](docs/implementation-status.md),
[save guide](docs/web-saves.md) and [migration plan](docs/web-migration-plan.md).
