# Rebirth Dungeon

Open [`game.project`](game.project) for the playable project.
Follow the [tooling guide](docs/defold-tooling.md) for MCP setup, development,
and verification.

Rebirth Dungeon is a text-driven, tile-based roguelike dungeon crawler built in
Defold. Mabinogi is the main gameplay reference for trainable skills, talent
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

Use Caves of Qud as a reference for how a dense, keyboard-friendly roguelike presents information. Keep the dungeon map central, with player status and a message log easy to scan during exploration. Make inventory, quests, and skills easy to reach through keyboard-friendly menus. Use an original layout, icons, and artwork for Rebirth Dungeon.

Use [Departure Mono](assets/fonts/DepartureMono/) for the game UI, including menus, HUD labels, and button text. Use [Source Code Pro](assets/fonts/SourceCodePro/) for all long-form text, including dialogue, lore, and journal entries.

## Graphics style

Draw inspiration from Caves of Qud for the game's original pixel art. Use the [reference images in `inspiration/`](./inspiration/) to study how distinct character silhouettes and bright accents stand out against dark teal terrain, and how repeating tile motifs make science-fantasy environments readable at a glance. Apply these principles to original sprites and tiles using Dungeon-20.

Minimalist ASCII-inspired roguelike pixel art, 16×24 pixel sprites, two-tone coloring, restricted color palette, high-contrast silhouettes, orthographic top-down perspective, retro CRT terminal aesthetic, dark teal background, science-fantasy setting, no anti-aliasing, no smooth gradients.

Use nearest-neighbor filtering for pixel art in Defold to keep sprite edges crisp. Make the player, creatures, items, and terrain distinguishable by silhouette as well as color.

## Game art workflow

Use the Aseprite MCP server configured in [`.codex/config.toml`](.codex/config.toml) whenever game art is needed. Use the project's [Dungeon-20 palette](palette/) for all game art. Set the sprite palette with `set_palette` using the colors in [`dungeon-20.hex`](palette/dungeon-20.hex).

1. **Plan the palette first.** Use `generate_color_ramp` to plan colors for each material, such as skin, armor, or a blade, or `apply_palette_preset` to explore a retro look. Map the result to Dungeon-20 before drawing and keep 16×24 sprites two-tone.
2. **Build in layers.** Separate the background, body, equipment, and effects as needed so each can be edited and animated independently.
3. **Draw coarse to fine.** Block in the silhouette with `draw_rectangle_at`, `draw_ellipse_at`, or `fill_area_at`. Refine the shape and draw details with `draw_rows`.
4. **Review each pass.** Inspect the sprite with `view_sprite` and use `region` to zoom in. Check palette usage with `get_color_stats` and use `lint_sprite` to catch stray or detached pixels. Fix issues and inspect again.
5. **Shade with intent.** Use `adjust_hsl` to explore shadow colors and `outline_cel` where it improves readability. Keep the final colors within Dungeon-20. Reserve `apply_dither_gradient` for blends on larger artwork and use flat tones on 16×24 sprites.
6. **Animate with cel tools.** Use `propagate_cels` to reuse cels, then `tween_cel_positions_eased` or `oscillate_cel_positions` for rigid parts and secondary motion. Verify frames and alignment with `view_sprite`, `compare_frames`, and `get_bounds`. Export with `export_animation` or `export_tag`.

## Defold development and verification

- Write Lua 5.1-compatible runtime code. Put deterministic rules in pure `.lua`
  modules; keep `.script`, `.gui_script`, and rendering adapters thin. Explicitly
  create/reset per-character state; required modules are shared, cached tables.
- Use Exa to search official Defold manuals/API docs and each library's upstream
  docs; open the relevant source before applying it. Match the engine version in
  `tools/defold/toolchain.json`. Use MCP API search for that version as well.
- Use the configured `defold` MCP for project inspection, build/run/log checks,
  and bounded iteration. Pass the pinned `version` to versioned tools and build
  with `archive: true` to keep native bundle manifests current; the
  server's default `stable` floats. Use `aseprite` for game art.
- Follow Defold's [AI agents guide](https://defold.com/manuals/ai-agents/): define
  acceptance criteria, inspect → change → build/test → inspect logs and required
  screenshots. Keep build/test steps reproducible without an agent. Limit repair
  loops to three attempts before reporting the remaining failure.
- When an editor is open, read `.internal/editor.port` and discover its current
  `/openapi.json`; never assume fixed editor endpoints or confuse editor and
  engine ports. Check runtime extension health/version/capabilities before use.
- Keep editor tokens and credentials local. Use stdio/loopback controls. Do not
  add unrestricted `/eval` tooling. The requested MCP setup is authorized;
  proceed with dependencies/native extensions already authorized by an
  implementation task. Seek approval for unapproved dependency or release
  changes per the guide, and for publishing, signing or destructive cleanup.
- Run `luajit tests/run.lua` from the repository root. Verify the MCP,
  in-engine DefTest suites and generated native bundle with
  `node tools/defold/verify-mcp.mjs --tests --run`. The upstream MCP `defold_run`
  uses a stock engine and cannot load this project's native extensions. Use the
  generated native bundle and Automation Bridge for runtime input/state/capture.
  Always stop the processes you launch. The desktop and browser playtest scripts
  in `tools/defold/` exercise actual input, combat and save/reload.
- Use the project skills in
  [`.agents/skills/rebirth-defold-development`](.agents/skills/rebirth-defold-development/SKILL.md)
  and [`.agents/skills/rebirth-defold-verify`](.agents/skills/rebirth-defold-verify/SKILL.md)
  for development and completion checks.
- Keep build output, `.internal/` (including `editor.token`), and personal saves
  out of version control. Save and load characters through the Defold profile
  service.
