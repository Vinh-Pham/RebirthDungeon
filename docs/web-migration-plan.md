# Web runtime and release plan

See [implementation status](implementation-status.md) for delivered behavior
and [web tooling](web-tooling.md) for current commands.

## Target project layout

```text
index.html                     Vite HTML entry
vite.config.ts                 React, Tailwind and base path
src/
  main.tsx                     React entry
  app/                         Screen lifetimes, keyboard routing and UI store
  game/
    core/                      Commands, session, events and immutable projections
    ecs/                       Miniplex entities, components and queries
    systems/                   Combat, inventory, progression, quests and economy
    world/                     Generation, occupancy, paths, visibility and lighting
    content/                   Typed catalogs, authored data and Ink story wiring
    persistence/               Dexie schema, save service and migration
  render/                      @pixi/react scene, camera, tilemaps and GSAP
  ui/                          HeroUI screens, HUD, panels and theme
assets/                        Shared authored art, fonts, audio and dialogue
public/assets/                 Generated runtime assets and manifest
tests/web/                     Vitest suites and ported parity fixtures
tools/web/                     Asset build and browser smoke checks
docs/                          Live web guides, gameplay contracts and provenance
```

## Simulation, renderer and save ownership

- A TypeScript session owns character state and accepts semantic commands.
  The pure rules and catalogs are under `src/game/`. Use Miniplex
  for the live actors, items and landmark queries. Persist plain records
  with stable IDs and rebuild transient indexes on load or character change.
- Run the simulation on explicit elapsed time with deterministic ordering.
  Port queue replacement, counters, target changes and retreat from
  [the combat model](../src/game/systems/combat.ts). Preserve independent gauges
  and the baseline's restrictions on movement and equipment during panels
  and encounters. Define hidden-tab and focus behavior explicitly so resuming
  cannot spend accumulated background time in a burst. Inject time in model
  tests. Let the rendering ticker project the latest committed state.
- Zustand owns UI selection, focus, active panel and read models. Route
  keyboard, pointer and on-screen actions through the same game commands.
  Keep hotkey conflicts, editor fields, modal focus and pointer drags under
  one input policy. Release held keys and routes on focus loss or screen exit.
- Render the world with `@pixi/react` and PixiJS. Use `@pixi/tilemap` for
  terrain layers and dirty chunks, actor sprites for animated parts, and
  `pixi-viewport` for follow, bounded panning, zoom and CSS-to-world picking.
  Start with WebGL and validate resize and device pixel ratio on real browsers.
  GSAP interpolates movement and plays committed combat feedback. Cancel
  timelines on teardown and honor reduced motion.
- Use Dexie for versioned IndexedDB profiles, checkpoints, active-character
  metadata and settings. Stage complete command results, write affected records
  in a single transaction, check the expected revision inside that transaction,
  then publish. Cover quota errors, transaction aborts, interrupted schema
  upgrades, competing tabs, duplicate claims and retry without duplicate
  effects. Persist checkpoint changes at the command boundaries.
## ROT.js integration

Use the npm package `rot-js` through a TypeScript world adapter. Normalize
coordinates, topology and passability in that adapter, including diagonal
corner rules where the baseline permits diagonal movement. The renderer uses
the same occupancy as movement, and explored cells remain character-specific.

| Module | Planned use and acceptance |
| --- | --- |
| [`ROT.FOV`](https://ondras.github.io/rot.js/doc/modules/fov.html) | Precise shadowcasting with the baseline radius and per-tile opacity. Expose visible, explored and unseen states for fog of war. Check occluded corridors, corners and exploration after reload. |
| [`ROT.Path.AStar`](https://ondras.github.io/rot.js/doc/classes/path_astar.default.html) | Click-to-move and individual enemy pursuit. Path to a reachable approach tile for occupied targets and revalidate each step against live occupancy. |
| [`ROT.Path.Dijkstra`](https://ondras.github.io/rot.js/doc/classes/path_dijkstra.default.html) | Reuse target-rooted paths for multiple actors pursuing one target or checking reachable approaches. Recreate the search when its target or passability changes. |
| [`ROT.Map.Arena`](https://github.com/ondras/rot.js/blob/v2.2.1/src/map/arena.ts) | Carves six rectangular rooms on one continuous floor arranged in two rows. Short corridors link the rooms, and five gates restrict progress until each preceding room is cleared. |
| [`ROT.Map.Cellular`](https://ondras.github.io/rot.js/doc/classes/map_cellular.default.html), [`Digger`](https://github.com/ondras/rot.js/blob/v2.2.1/src/map/digger.ts), [`Uniform`](https://github.com/ondras/rot.js/blob/v2.2.1/src/map/uniform.ts) | Generate missing chambers when continuing an active save from the previous Threshold. |
| [`ROT.Scheduler.Speed`](https://ondras.github.io/rot.js/doc/classes/scheduler_speed.default.html) | Order autonomous actors with different speeds during exploration ticks. Verify stable ordering and pause/resume across checkpoints. The combat model retains its independent ATB gauges. |
| [`ROT.Scheduler.Action`](https://ondras.github.io/rot.js/doc/classes/scheduler_action.default.html) | Schedule variable-duration world actions such as gathering, recovery or enemy waits. Rebuild queues from saved actor IDs and due times. Keep the existing player combat item and queue semantics. |
| [`ROT.RNG`](https://github.com/ondras/rot.js/blob/v2.2.1/src/rng.ts) | Seed ROT procedural consumers and persist their stream state where needed. For modules that use the singleton, set the scoped seed/state, generate synchronously and restore the previous state in finally. |
| [`ROT.Lighting`](https://ondras.github.io/rot.js/doc/classes/lighting.default.html) | Compute palette-constrained light around torches, spells and landmarks. Invalidate cached topology after changes to light passability and keep lighting within fog visibility rules. |
| [`ROT.StringGenerator`](https://github.com/ondras/rot.js/blob/v2.2.1/src/stringgenerator.ts) | Train on original setting names and short ambient text. Isolate its RNG stream, bound and validate the output, and persist generated names used by a save. Keep authored Ink dialogue. |

Import authored town terrain and landmarks from the
[LDtk project](../assets/maps/towns.ldtk). Keep dungeon generation,
combat, loot, and cosmetic streams isolated. Save the Threshold layouts and
their generator version. The Arena generator places rectangular walls and
floors without searching for corridors or using a time budget. Characters
resume an active legacy layout until they return to a settlement and enter
the continuous floor. The route stays open in both directions after completion.

## HeroUI play surface

Use HeroUI v3 components and theme tokens. Read each component’s API through
the HeroUI MCP and apply the `heroui-pro-design-taste` skill. Use the installed
Pro package where its components solve a specific UI need and its licensed
artifacts are available.

- Keep the map central, with character status/Time and enemy preparation in
  view during combat. Provide a readable DOM message log. Use semantic status
  colors and text cues so enemy intent is readable without relying on color.
- Use HeroUI Button, ProgressBar, Tabs, Modal, Tooltip, TextField and Select
  for their standard roles. Keep the footprint inventory as an accessible
  spatial grid with roving focus and keyboard pickup, place, cancel and
  inspection. Make mouse drag and keyboard moves dispatch the same commands.
- Apply Departure Mono to controls, labels and HUD. Use Source Code Pro for
  dialogue, journal and lore. Keep neutral dark-teal surfaces, concise labels,
  consistent spacing and visible keyboard outlines. Use tooltips and accessible
  names for icon-only controls, focus restoration on close, and a compact
  panel layout at narrow widths. Verify controls at desktop and narrow sizes.

## Assets and release checks

Keep authored artwork, fonts, audio and Ink in [assets](../assets/). Run
`pnpm assets` to compile stories and regenerate the atlas and source manifest.
Follow the [verification workflow](web-tooling.md) for build and browser checks.
Use a new character to verify creation, arrival, progression, combat, both
gates, and save/reload. Browser saves use the [current IndexedDB store](web-saves.md).
