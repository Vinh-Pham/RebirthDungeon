# Rebirth Dungeon

Rebirth Dungeon is a text-driven, tile-based roguelike dungeon crawler built in Godot. Mabinogi, the Korean MMORPG, is the main gameplay reference for trainable skills, talent specializations, inventory, and melee counters. The player explores procedurally generated dungeons, collects and equips items, completes quests, and ranks up skills while uncovering the mystery of the dungeon. Develop original characters, quests, items, and art for the science-fantasy setting.

## Gameplay

- **Skills and talents.** Let players train and rank up individual skills through relevant actions. Group related skills into talents that reward specialization while allowing players to learn skills across talents.
- **Inventory.** Use a grid inventory where items occupy space according to their size. Support stackable items, equipment slots, and bags that expand storage. Keep inventory management keyboard-friendly.
- **Combat.** Resolve committed actions in discrete turns using a rock-paper-scissors cycle. **Smash** breaks **Defend** and bypasses its damage reduction. **Defend** reduces damage from a **Normal Attack**. **Normal Attack** interrupts **Smash**. Show enemy preparation through readable cues and explain each outcome in the message log.
- **Dungeon Towns.** Keep settlements inside the dungeon. These monster-free hubs offer NPCs, quests, shops, blacksmiths, and healer houses. Connect them through hostile, explorable dungeon passages.
- **Moon Gates.** Let players register a gate by interacting with it in person. Save activated gates per character and allow instant travel between them at any time.

See the [gameplay implementation plan](docs/mabinogi-inspired-gameplay-plan.md) for research sources, the combat outcome table, and build milestones.

## Interface

Use Caves of Qud as a reference for how a dense, keyboard-friendly roguelike presents information. Keep the dungeon map central, with player status and a message log easy to scan during exploration. Make inventory, quests, and skills easy to reach through keyboard-friendly menus. Use an original layout, icons, and artwork for Rebirth Dungeon.

Use [Departure Mono](assets/fonts/DepartureMono/) for the game UI, including menus, HUD labels, and button text. Use [Source Code Pro](assets/fonts/SourceCodePro/) for all long-form text, including dialogue, lore, and journal entries.

## Graphics style

Draw inspiration from Caves of Qud for the game's original pixel art. Use the [reference images in `inspiration/`](./inspiration/) to study how distinct character silhouettes and bright accents stand out against dark teal terrain, and how repeating tile motifs make science-fantasy environments readable at a glance. Apply these principles to original sprites and tiles using Dungeon-20.

Minimalist ASCII-inspired roguelike pixel art, 16×24 pixel sprites, two-tone coloring, restricted color palette, high-contrast silhouettes, orthographic top-down perspective, retro CRT terminal aesthetic, dark teal background, science-fantasy setting, no anti-aliasing, no smooth gradients.

Use nearest-neighbor filtering for pixel art in Godot to keep sprite edges crisp. Make the player, creatures, items, and terrain distinguishable by silhouette as well as color.

## Game art workflow

Use the Aseprite MCP server configured in [`.codex/config.toml`](.codex/config.toml) whenever game art is needed. Use the project's [Dungeon-20 palette](palette/) for all game art. Set the sprite palette with `set_palette` using the colors in [`dungeon-20.hex`](palette/dungeon-20.hex).

1. **Plan the palette first.** Use `generate_color_ramp` to plan colors for each material, such as skin, armor, or a blade, or `apply_palette_preset` to explore a retro look. Map the result to Dungeon-20 before drawing and keep 16×24 sprites two-tone.
2. **Build in layers.** Separate the background, body, equipment, and effects as needed so each can be edited and animated independently.
3. **Draw coarse to fine.** Block in the silhouette with `draw_rectangle_at`, `draw_ellipse_at`, or `fill_area_at`. Refine the shape and draw details with `draw_rows`.
4. **Review each pass.** Inspect the sprite with `view_sprite` and use `region` to zoom in. Check palette usage with `get_color_stats` and use `lint_sprite` to catch stray or detached pixels. Fix issues and inspect again.
5. **Shade with intent.** Use `adjust_hsl` to explore shadow colors and `outline_cel` where it improves readability. Keep the final colors within Dungeon-20. Reserve `apply_dither_gradient` for blends on larger artwork and use flat tones on 16×24 sprites.
6. **Animate with cel tools.** Use `propagate_cels` to reuse cels, then `tween_cel_positions_eased` or `oscillate_cel_positions` for rigid parts and secondary motion. Verify frames and alignment with `view_sprite`, `compare_frames`, and `get_bounds`. Export with `export_animation` or `export_tag`.

## Godot plugins

Beckett is enabled in [project settings](project.godot). The five gameplay plugins are installed under `addons/` for future integration.

| Plugin | Use in Rebirth Dungeon |
| --- | --- |
| [Beckett](addons/beckett/plugin.cfg) | Connect the Godot editor to MCP for scene and script authoring, playtesting, screenshots, and runtime logs. |
| [Gaea](addons/gaea/plugin.cfg) | Generate tile-based dungeon floors, including room and corridor layouts, and render them to tile maps. |
| [GECS](addons/gecs/plugin.cfg) | Model the player, creatures, and items with reusable components such as grid position and health. Keep shared rules, such as movement and status effects, in systems that query those components. |
| [Beehave](addons/beehave/plugin.cfg) | Use behavior trees to choose enemy and NPC actions, such as patrolling, pursuing, attacking, or retreating. |
| [Dialogue Manager](addons/dialogue_manager/plugin.cfg) | Author branching NPC conversations, quest-related choices, and conditional lore reveals. Render dialogue text in Source Code Pro. |
| [Phantom Camera](addons/phantom_camera/plugin.cfg) | Frame the player and dungeon map with a top-down 2D camera and handle transitions between viewpoints when needed. Keep tile edges crisp during camera movement. |

## Godot development workflow

- Use the project's Beckett MCP server for Godot editor operations. Inspect and edit scenes, nodes, resources, and scripts through Beckett. Use `find_classes` and `describe_class` to check the installed engine's classes and method signatures. When a change affects gameplay or the interface, run the scene through Beckett and check the runtime logs.
- Use Exa to look up Godot API references, tutorials, and other technical documentation. Search for the relevant class, method, or feature and prefer official documentation that matches the Godot version in `project.godot`. Open the source page to verify the details before applying them.
