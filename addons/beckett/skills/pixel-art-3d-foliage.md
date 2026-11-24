# 3D pixel-art foliage: the shared light, one global wind, and the map to grass, trees and light shafts

> Start here for stylized nature in a pixelated 3D scene: the warm light and grade of the demo, one project-wide wind (shader globals + a noise texture) that every foliage shader sways in, and the traps the foliage packs share (editor shader globals, transparent foliage, outlines on every tuft, generated meshes that are never saved). Then load the pack for each piece: `pixel-art-3d-grass` (billboard grass that melts into the ground, tall grass, meadow flowers), `pixel-art-3d-trees` (cel-shaded trees with leaf-card canopies, faceted rocks), `pixel-art-3d-light-shafts` (soft sun shafts over the whole view).

## When to use
The user wants grass, tall grass, trees, flowers, rocks or light shafts for a 3D pixel-art or toon scene, wind-animated foliage, or the look of the "Stylized Grass & Trees for Pixel Art 3D in Godot 4" video. Build `pixel-art-3d` first (the SubViewport and the outline pass); this pack adds the light and the wind, and the packs it maps below add the vegetation. The shaders are adapted from that video's MIT demo project (Eduardo Schildt, Godot 4.5); the leaf-card billboard follows Pontus Karlsson. Companion packs: `pixel-art-3d`, `pixel-art-3d-grass`, `pixel-art-3d-trees`, `pixel-art-3d-light-shafts`, `shaders`, `node3d`.

## Version and renderer
- Godot 4.3+ (verified with these exact calls on 4.4.1, 4.6.2 and 4.7). Forward+ for the outline interplay; the foliage shaders themselves are plain spatial shaders.
- The video models the meshes in Blender. `pixel-art-3d-grass` and `pixel-art-3d-trees` build equivalents inside Godot so an agent can do everything through tools; each summarises the Blender route at its end.

## The pieces
| Piece | Node / resource | Why it looks right |
|---|---|---|
| Light | warm `DirectionalLight3D` with shadows + sky + Filmic tonemap | warm key vs cool sky ambient makes the palette |
| Wind | 5 shader globals + `NoiseTexture2D` | one place drives every foliage shader |
| Ground | `MeshInstance3D` + `ground.gdshader` | same colour and the same light formula as the grass |
| Grass | `MultiMeshInstance3D`, `QuadMesh` 0.5 x 0.5 + `grass.gdshader` + `grass_field.gd` | Y-billboard, normal forced UP, lit at its pivot, roughness 0 = no outline |
| Tree | `Node3D` > trunk (`MeshInstance3D` + `tree_trunk.gd` + `trunk.gdshader`) + canopy (`MeshInstance3D` + `tree_canopy.gd` + `leaves.gdshader`) | root-flared trunk with banded cel light and bark stripes, lobed canopy of leaf cards with a rim light, still spheres cast the shadow; every copy grows its own shape |
| Tall grass | another grass MultiMesh: 7 thin blades, taller card, clumped | same shader and wind, lighter and bendier |
| Flowers | MultiMesh + `flower.gdshader`, clumped | stem and five-petal head drawn in the shader, white or lilac per flower |
| Rocks | `MeshInstance3D` + `rock.gd` + `trunk.gdshader` (pink stone, no stripes) | rounded stone with flat chips, a new shape per seed, one cel band per facet, never a spike |
| Light shafts | 2 x 2 quad under the camera + `light_shafts.gdshader` | streaks of sun in the air over the whole view, direction and colour from the sun |

Which pack builds which piece:
- Light and Wind: this pack, Recipes 1 and 2. Run both first: the grass, flower and leaf shaders read Recipe 2's shader globals and do not compile without them.
- The crisp shadow edge: `pixel-art-3d`, Shadows. The ground, grass, flower, trunk and leaf shaders include its `res://shaders/sunshadow.gdshaderinc` and do not compile without it; its camera script and 8192 shadow map keep the edges still.
- Ground, Grass, Tall grass, Flowers: `pixel-art-3d-grass`.
- Tree, Rocks: `pixel-art-3d-trees` (the rocks reuse its `trunk.gdshader`).
- Light shafts: `pixel-art-3d-light-shafts`. They need only a DirectionalLight3D; Recipe 1's warm sun is the one their default `tint` is tuned for.

## Recipe 1: light and grade (the demo's look)
Every shader here lights itself in a custom `light()`, so the light decides the palette. The demo's warm sun against the cool sky ambient is what turns lit leaves yellow-green and shades an orange trunk maroon on its dark side; a white sun gives flat, dull greens. Skip a `create_node` if the scene already has that node, but apply the values.
```
create_node type=DirectionalLight3D name=Sun parent=PixelView/SubViewport
set_property target=PixelView/SubViewport/Sun property=rotation_degrees value="-45 100 0"   # side light from the right: lit right, shaded left, shadows fall left
set_property target=PixelView/SubViewport/Sun property=shadow_enabled value=true
set_property target=PixelView/SubViewport/Sun property=light_color value="#ffaf5e"
set_property target=PixelView/SubViewport/Sun property=light_energy value=1.2
create_node type=WorldEnvironment name=Env parent=PixelView/SubViewport
set_resource target=PixelView/SubViewport/Env property=environment class=Environment
set_property target=PixelView/SubViewport/Env/environment property=background_mode value=2     # BG_SKY: the sky is also the cool ambient
set_resource target=PixelView/SubViewport/Env/environment property=sky class=Sky
set_resource target=PixelView/SubViewport/Env/environment/sky property=sky_material class=ProceduralSkyMaterial
set_property target=PixelView/SubViewport/Env/environment property=tonemap_mode value=2        # TONE_MAPPER_FILMIC
set_property target=PixelView/SubViewport/Env/environment property=tonemap_exposure value=1.2
set_property target=PixelView/SubViewport/Camera3D/OutlinePass/material_override property=shader_parameter/line_highlight value=0.0   # depth lines only, as the vegetation demo runs it
```
The last line matters: the `pixel-art-3d` edge pass also draws light 1-px crease lines where normals jump, and in a forest that puts a white seam wherever a trunk meets its leaf cards. The vegetation demo keeps only the dark silhouette lines, so does this pack.

## Recipe 2: wind for the whole project (once)
```
write_file path=res://wind_noise.tres content="[gd_resource type=\"NoiseTexture2D\" load_steps=2 format=3]\n\n[sub_resource type=\"FastNoiseLite\" id=\"FastNoiseLite_wind\"]\nseed = 1\nfrequency = 0.0185\n\n[resource]\nnoise = SubResource(\"FastNoiseLite_wind\")\nseamless = true\n"
set_project_setting setting=shader_globals/wind_noise value={"type":"sampler2D","value":"res://wind_noise.tres"}
set_project_setting setting=shader_globals/wind_direction value={"type":"vec3","value":[0,0,1]}
set_project_setting setting=shader_globals/wind_scale value={"type":"float","value":0.025}
set_project_setting setting=shader_globals/wind_speed value={"type":"float","value":0.075}
set_project_setting setting=shader_globals/wind_strength value={"type":"float","value":0.4}
write_script path=res://foliage_wind.gd content=<foliage_wind.gd below>
```
A JSON array is fine for the vec3: the engine converts an Array into the vector when it loads the global.

The running editor reads shader globals only at startup, so on its own it would reject every foliage shader until a restart. `foliage_wind.gd` closes that gap: the grass and canopy scripts call it in the editor, it registers the missing globals with the RenderingServer and recompiles their shader, and the editor view shows the foliage at once.

`res://foliage_wind.gd`:
```gdscript
@tool
extends RefCounted
## The running editor loads the project's shader globals only at startup (or from its own Shader Globals
## panel), so foliage shaders added in this session fail there with "Global uniform ... does not exist".
## ensure() registers the missing ones from ProjectSettings and recompiles the given material's shader.
## Editor only: the game reads the globals itself at launch.

const TYPES := {
	"bool": RenderingServer.GLOBAL_VAR_TYPE_BOOL, "int": RenderingServer.GLOBAL_VAR_TYPE_INT,
	"float": RenderingServer.GLOBAL_VAR_TYPE_FLOAT, "vec2": RenderingServer.GLOBAL_VAR_TYPE_VEC2,
	"vec3": RenderingServer.GLOBAL_VAR_TYPE_VEC3, "vec4": RenderingServer.GLOBAL_VAR_TYPE_VEC4,
	"color": RenderingServer.GLOBAL_VAR_TYPE_COLOR, "sampler2D": RenderingServer.GLOBAL_VAR_TYPE_SAMPLER2D,
}
static var _added_this_session := false


static func ensure(material: Material) -> void:
	if not Engine.is_editor_hint():
		return
	var known := RenderingServer.global_shader_parameter_get_list()
	for prop in ProjectSettings.get_property_list():
		var key := str(prop.name)
		if not key.begins_with("shader_globals/"):
			continue
		var global_name := StringName(key.trim_prefix("shader_globals/"))
		var entry: Variant = ProjectSettings.get_setting(key)
		if known.has(global_name) or not (entry is Dictionary) or not TYPES.has(str(entry.get("type", ""))):
			continue
		var value: Variant = entry.get("value")
		if str(entry["type"]) == "sampler2D":
			value = load(str(value))
		RenderingServer.global_shader_parameter_add(global_name, TYPES[str(entry["type"])], value)
		_added_this_session = true
	var shader_material := material as ShaderMaterial
	if _added_this_session and shader_material != null and shader_material.shader != null:
		shader_material.shader.code = shader_material.shader.code  # compile again, now that the globals exist
```

## The gate
The light and the wind show only on the foliage, so the gates of `pixel-art-3d-grass` and `pixel-art-3d-trees` prove them: the wind moves the grass between two frames, and the leaf cards are lighter on the side facing the sun. Recipe 2 alone is in place when every global reads back with its type:
```
get_project_setting setting=shader_globals/wind_strength   # {"type":"float","value":0.4}; wind_noise, wind_direction, wind_scale and wind_speed answer the same way
```

## Tuning
| Knob | Where | Default | Effect |
|---|---|---|---|
| `wind_strength` / `wind_speed` / `wind_scale` / `wind_direction` | project setting `shader_globals/...` | 0.4 / 0.075 / 0.025 / (0,0,1) | every foliage shader at once; set with `set_project_setting` as in Recipe 2 |
| `line_highlight` | outline material (`pixel-art-3d`) | 0 here | light crease lines; 0 keeps trunk and leaves free of white seams |

## Traps
These hold for every foliage pack: the grass, flower and leaf shaders, and the `@tool` generators of `pixel-art-3d-grass` and `pixel-art-3d-trees`.
- **`SHADER ERROR: Global uniform 'wind_scale' does not exist` in the editor's output** comes from the moment a foliage shader was assigned, before its script ran: the editor reads shader globals only at startup or from its own Project Settings > Globals panel. `foliage_wind.gd` then registers them and recompiles, so those lines are stale; do not rename the globals to silence them. A material on one of these shaders that is NOT on a node running `grass_field.gd` or `tree_canopy.gd` (say a bush with its own script) stays broken in the editor, without a parameter list, so `set_property ... property=shader_parameter/...` fails with "ShaderMaterial has no property": call `foliage_wind.gd`'s `ensure()` from that script too, or ask the user to restart the editor once (Project > Reload Current Project). The game is never affected: it reads `project.godot` at launch.
- **Global names must match exactly** between the shader (`global uniform float wind_speed;`) and the setting (`shader_globals/wind_speed`), types included.
- **`SHADER ERROR: Tokenizer: Unknown character #35: '#'` on an `#include` line** means the file it names does not exist. The ground, grass, flower, trunk and leaf shaders include `res://shaders/sunshadow.gdshaderinc`, which `pixel-art-3d`'s Shadows section writes. In the game's log on 4.4.1, 4.6.2 and 4.7 the error says nothing about a missing file.
- **Transparent foliage is a trap**: keep `ALPHA_SCISSOR_THRESHOLD`. Scissor keeps grass in the opaque pass, where it is cheap, writes depth, and works with the outline pass. Alpha blending puts thousands of tufts in the sorted transparent pass and out of the depth buffer.
- **Grass and leaves set ROUGHNESS 0 on purpose**: that is the `pixel-art-3d` outline opt-out. Outlines on every tuft turn a field into noise.
- **Generated geometry lives in INTERNAL children**: `grass_field.gd` (`pixel-art-3d-grass`), `tree_trunk.gd`, `tree_canopy.gd` and `rock.gd` (`pixel-art-3d-trees`) are `@tool` and add their meshes with `INTERNAL_MODE_BACK`. They draw in the editor view and the game, but they are never saved into the `.tscn` and do not show in the Scene dock or in `get_scene_tree`: count them with `tuft_count` (`card_count` on a canopy), judge them by screenshot. Assigning the mesh to the node itself instead would save thousands of vertices and transforms into the scene (the demo's scene is about 1 MB for that reason).
- **Rewrote one of these `@tool` scripts with a NEW export while the scene is open?** Godot's script reload gives the nodes already using it `null` for that export until the scene is reopened: the build fails on it, and `save_scene` writes `= null` into the `.tscn`. Set the new export once on each of those nodes (`set_property`).
- **`set_property ... shader_parameter/x` says the material has no such property right after you rewrote that shader's file**: the editor still holds the old code. Push the new code into the loaded shader with `set_property target=<node>/material_override/shader property=code value=<the file's text>`. The game reads the file at launch and is not affected.
- **High-frequency textures shimmer at low resolution.** Keep bark and leaf masks simple, as the video advises.

Confirm property names with `describe_class class=DirectionalLight3D` (or `Environment`, `ProceduralSkyMaterial`) before relying on them.
