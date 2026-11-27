# Rebirth Dungeon architecture

## Web runtime

`src/main.tsx` mounts `src/app/App.tsx`. `GameSession` in
`src/game/core/session.ts` owns commands, projected UI state and the active
character. The application drives a bounded simulation tick and pauses on
focus loss or document hiding. The session's Zustand store supplies DOM and
canvas projections.

| Path | Responsibility |
| --- | --- |
| `src/app/contracts.ts` | Shared view and semantic action interfaces |
| `src/app/useGameHotkeys.ts` | Screen-aware shortcuts and remappable game bindings |
| `src/game/core/` | Character profiles, session coordination and service actions |
| `src/game/systems/` | ATB, inventory transactions and economy |
| `src/game/world/world.ts` | ROT maps, FOV, lighting, paths, names, schedulers and Miniplex index |
| `src/game/world/ldtk-town.ts` | Town terrain, spawn and landmark import from the LDtk project |
| `src/game/content/` | Skill, enemy, item data and Ink continuation adapter |
| `src/game/content/level-experience.ts` | Normal level thresholds, level lookup and XP meter projection |
| `src/game/persistence/` | Dexie transactions, revisions, settings and local checkpoints |
| `src/render/WorldCanvas.tsx` | `@pixi/react` application, tilemap, viewport and GSAP movement |
| `src/ui/` | HeroUI title, creation, HUD, panels and controls |
| `src/ui/GameDialog.tsx` | HeroUI overlay lifecycle and wmkit window movement |
| `src/ui/WorldDialogue.tsx` | HeroUI world interactions anchored to the canvas |
| `src/ui/GameLog.tsx` | Category tabs, timestamps and retained log display |
| `src/ui/GameMenu.tsx` | Live vital meters and game panel buttons |
| `src/ui/InventoryGrid.tsx` | React DnD and keyboard input for grid placement |
| `src/ui/ActionBar.tsx` | Shared exploration and combat slots with drag-and-drop assignment |
| `tools/web/pack-assets.mjs` | Reproducible original asset copy, Pixi atlas and hash manifest |
| `tests/web/` | Vitest and fast-check model and adapter checks |

Miniplex indexes transient world entities. ROT map generation isolates its
global RNG state. The LDtk importer translates authored towns into the same
map representation used by pathfinding and rendering. Renderer objects and
GSAP timelines stay outside saved profiles. React consumes projections and
issues semantic commands. Animation completion never grants gameplay rewards.

UI components use Tailwind utilities in their markup. The game stylesheet
holds font declarations, shared page defaults, and native meter styling.

LDtk resident markers provide spawn positions. The session simulates their
movement on a separate seeded stream and publishes it to a dedicated canvas
layer. Live resident positions are transient and leave town services and player
pathfinding accessible.

The Threshold's continuous floor shares one layout and exploration record per
run. Room ownership determines encounter participants. Winning an encounter
removes that room's enemies and opens its corridor in the same saved command.
The viewport fits the full floor and draws its visible and explored tiles.
See [save ownership](web-saves.md) and [dependency ownership](web-dependencies.md).
