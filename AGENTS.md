# Rebirth Dungeon

Run `pnpm dev` for the Vite + TypeScript game. The browser entry is
[`src/main.tsx`](src/main.tsx). Read [web tooling](docs/web-tooling.md),
[architecture](docs/architecture.md), [status](docs/implementation-status.md),
and the [migration plan](docs/web-migration-plan.md) before making changes.

Rebirth Dungeon is a text-driven, tile-based science-fantasy roguelike using
React, HeroUI and PixiJS through `@pixi/react`. Mabinogi is the main gameplay reference for trainable skills, talent
specializations, inventory, and melee counters. The player explores procedurally
generated dungeons, collects and equips items, completes quests, and ranks up
skills while uncovering the mystery of the dungeon. Develop original characters,
quests, items, and art for the science-fantasy setting.

## Gameplay

- **Skills and talents.** Let players train and rank up individual skills through relevant actions. Group related skills into talents that reward specialization while allowing players to learn skills across talents.
- **Inventory.** Use a grid inventory where items occupy space according to their size. Support stackable items, equipment slots, and bags that expand storage. Keep inventory management keyboard-friendly.
- **Combat.** Use Chrono Trigger-inspired Active Time Battle. Players can queue an attack or skill while their Time gauge fills. The latest queued command executes at full charge. Enemies act automatically on their own clock, and items leave the player's gauge intact. **Smash** breaks **Defend** and bypasses its damage reduction. **Defend** reduces damage from a **Normal Attack**. **Normal Attack** interrupts **Smash**. Show enemy preparation through readable cues and explain each outcome in the message log.
- **Dungeon Towns.** Keep settlements inside the dungeon. These monster-free hubs offer NPCs, quests, shops, blacksmiths, and healer houses. Connect them through hostile, explorable dungeon passages.
- **Moon Gates.** Let players register a gate by interacting with it in person. Save activated gates per character and allow instant travel between them at any time.

See the [gameplay implementation plan](docs/mabinogi-inspired-gameplay-plan.md) for research sources, the combat outcome table, and build milestones.

## Interface

For web UI, apply the `heroui-pro-design-taste` skill and look up each
component’s API with the HeroUI MCP. Use semantic theme variants, accessible
overlays, visible focus, and a DOM message log. Keep PixiJS responsible for the
world canvas and HeroUI responsible for the interface.

Use Caves of Qud as a reference for how a dense, keyboard-friendly roguelike presents information. Keep the dungeon map central, with player status and a message log easy to scan during exploration. Make inventory, quests, and skills easy to reach through keyboard-friendly menus. Use an original layout, icons, and artwork for Rebirth Dungeon.

Use [Departure Mono](assets/fonts/DepartureMono/) for the game UI, including menus, HUD labels, and button text. Use [Source Code Pro](assets/fonts/SourceCodePro/) for all long-form text, including dialogue, lore, and journal entries.

## Graphics style

Draw inspiration from Caves of Qud for the game's original pixel art. Use the [reference images in `inspiration/`](./inspiration/) to study how distinct character silhouettes and bright accents stand out against dark teal terrain, and how repeating tile motifs make science-fantasy environments readable at a glance. Apply these principles to original sprites and tiles using Dungeon-20.

Minimalist ASCII-inspired roguelike pixel art, 16×24 pixel sprites, two-tone coloring, restricted color palette, high-contrast silhouettes, orthographic top-down perspective, retro CRT terminal aesthetic, dark teal background, science-fantasy setting, no anti-aliasing, no smooth gradients.

Use nearest-neighbor filtering and pixel-grid alignment to keep sprite edges
crisp. Make the player, creatures, items, and terrain distinguishable by
silhouette as well as color.

## Game art workflow

Use the Aseprite MCP server configured in [`.codex/config.toml`](.codex/config.toml) whenever game art is needed. Use the project's [Dungeon-20 palette](palette/) for all game art. Set the sprite palette with `set_palette` using the colors in [`dungeon-20.hex`](palette/dungeon-20.hex).

1. **Plan the palette first.** Use `generate_color_ramp` to plan colors for each material, such as skin, armor, or a blade, or `apply_palette_preset` to explore a retro look. Map the result to Dungeon-20 before drawing and keep 16×24 sprites two-tone.
2. **Build in layers.** Separate the background, body, equipment, and effects as needed so each can be edited and animated independently.
3. **Draw coarse to fine.** Block in the silhouette with `draw_rectangle_at`, `draw_ellipse_at`, or `fill_area_at`. Refine the shape and draw details with `draw_rows`.
4. **Review each pass.** Inspect the sprite with `view_sprite` and use `region` to zoom in. Check palette usage with `get_color_stats` and use `lint_sprite` to catch stray or detached pixels. Fix issues and inspect again.
5. **Shade with intent.** Use `adjust_hsl` to explore shadow colors and `outline_cel` where it improves readability. Keep the final colors within Dungeon-20. Reserve `apply_dither_gradient` for blends on larger artwork and use flat tones on 16×24 sprites.
6. **Animate with cel tools.** Use `propagate_cels` to reuse cels, then `tween_cel_positions_eased` or `oscillate_cel_positions` for rigid parts and secondary motion. Verify frames and alignment with `view_sprite`, `compare_frames`, and `get_bounds`. Export with `export_animation` or `export_tag`.

## Web development and verification

- Follow the [target layout and milestones](docs/web-migration-plan.md). Put
  deterministic gameplay in `src/game/`, the `@pixi/react` scene in
  `src/render/`, and HeroUI components in `src/ui/`. Use Miniplex for ECS,
  Zustand for UI state, and Dexie for versioned per-character saves. Players
  create fresh characters in the game.
- Use Exa to research official documentation and upstream sources, then
  review the [dependency guide](docs/web-dependencies.md) and pin a compatible
  set in the pnpm lockfile. Use the [ROT.js module assignments](docs/web-migration-plan.md#rotjs-integration),
  scoped seeded streams, versioned layouts and deterministic command replay.
  Combat follows the ATB rules above.
- Keep gameplay, persistence and presentation separate. Resolve each command
  from committed state, publish after a successful required save, and animate
  committed outcomes. Share semantic commands across keyboard, pointer and UI.
- Preserve all art, dialogue and licenses. Keep authored assets under
  `assets/` and generate web assets from stable IDs. Update gameplay docs,
  architecture, run commands and evidence as milestones land.
- Run `pnpm typecheck`, `pnpm test`, and `pnpm build`.
  Use Vitest for rule parity and fast-check for procedural invariants. Use
  `agent-browser` with an isolated session against the served build for actual
  keyboard/pointer input, screenshots, resizing, and save/reload. Check the
  browser console, stop the processes you launch, and keep personal saves,
  credentials and build output out of version control.
