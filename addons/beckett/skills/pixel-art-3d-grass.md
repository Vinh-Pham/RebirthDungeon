# 3D pixel-art grass: billboard grass, tall grass and flowers that melt into the ground

> A MultiMesh field of billboard grass tufts that melts into the ground, clumps of tall grass and patches of meadow flowers for a pixelated 3D scene, swaying in the project-wide wind of `pixel-art-3d-foliage`. Godot-native meshes (no Blender needed) from a `@tool` script that also draws in the editor view without bloating the scene, ready shaders, the gate, and the traps (a ground that does not match the grass, the MultiMesh transform format).

## When to use
The user wants grass, tall grass or flowers for a 3D pixel-art or toon scene, or the meadow of the "Stylized Grass & Trees for Pixel Art 3D in Godot 4" video. Build `pixel-art-3d` first (the SubViewport, the outline pass, and its Shadows section, whose `res://shaders/sunshadow.gdshaderinc` these shaders include for a crisp shadow edge), then `pixel-art-3d-foliage` Recipes 1 and 2: the light, and the wind these shaders read (without its shader globals they do not compile). Its Traps cover these shaders and `grass_field.gd` too. The shaders are adapted from that video's MIT demo project (Eduardo Schildt, Godot 4.5). Companion packs: `pixel-art-3d-foliage`, `pixel-art-3d-trees`, `pixel-art-3d-light-shafts`, `pixel-art-3d`, `shaders`.

## Version and renderer
- Godot 4.3+ (verified with these exact calls on 4.4.1, 4.6.2 and 4.7). Forward+ for the outline interplay; the foliage shaders themselves are plain spatial shaders.
- The video models the meshes in Blender. This pack builds equivalents inside Godot so an agent can do everything through tools; the Blender route is summarised at the end.

## The pieces
| Piece | Node / resource | Why it looks right |
|---|---|---|
| Ground | `MeshInstance3D` + `ground.gdshader` | same colour and the same light formula as the grass |
| Grass | `MultiMeshInstance3D`, `QuadMesh` 0.5 x 0.5 + `grass.gdshader` + `grass_field.gd` | Y-billboard, normal forced UP, lit at its pivot, roughness 0 = no outline |
| Tall grass | another grass MultiMesh: 7 thin blades, taller card, clumped | same shader and wind, lighter and bendier |
| Flowers | MultiMesh + `flower.gdshader`, clumped | stem and five-petal head drawn in the shader, white or lilac per flower |

## Recipe 1: the ground
```
write_file path=res://shaders/ground.gdshader content=<ground shader below>
create_node type=MeshInstance3D name=Ground parent=PixelView/SubViewport
set_resource target=PixelView/SubViewport/Ground property=mesh class=PlaneMesh
set_property target=PixelView/SubViewport/Ground/mesh property=size value="14 14"
set_resource target=PixelView/SubViewport/Ground property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/Ground/material_override property=shader resource=res://shaders/ground.gdshader
```
`res://shaders/ground.gdshader`:
```glsl
shader_type spatial;
// Ground under billboard grass: the SAME lighting and colour as grass.gdshader, so tufts melt into it.
// The sun's shadows end in a crisp edge (sunshadow.gdshaderinc, from pixel-art-3d).
// Adapted from Eduardo Schildt's 3DPixelArt_Tutorial_Vegetation (MIT, 2026).
render_mode specular_disabled;

#include "res://shaders/sunshadow.gdshaderinc"

uniform vec4 ground_color : source_color = vec4(0.1, 0.69, 0.21, 1.0);
uniform float outline_mask = 1.0; // written to ROUGHNESS: 1 keeps outlines, 0 opts out

void fragment() {
	ALBEDO = ground_color.rgb;
	SPECULAR = 0.0;
	ROUGHNESS = outline_mask;
}

void light() {
	float fall = LIGHT_IS_DIRECTIONAL ? crisp_shadow(ATTENUATION) : ATTENUATION; // the sun's edge cut crisp, a lamp's fall-off kept soft
	DIFFUSE_LIGHT += clamp(dot(NORMAL, LIGHT), 0.0, 1.0) * fall * LIGHT_COLOR / PI;
}
```

## Recipe 2: a grass field
```
write_file path=res://shaders/grass.gdshader content=<grass shader below>
write_script path=res://grass_field.gd content=<grass_field.gd below>
create_node type=MultiMeshInstance3D name=Grass parent=PixelView/SubViewport
set_resource target=PixelView/SubViewport/Grass property=multimesh class=MultiMesh
set_resource target=PixelView/SubViewport/Grass/multimesh property=mesh class=QuadMesh
set_property target=PixelView/SubViewport/Grass/multimesh/mesh property=size value="0.5 0.5"
set_property target=PixelView/SubViewport/Grass/multimesh/mesh property=center_offset value="0 0.25 0"   # bottom edge at y = 0, pivot at the root
set_resource target=PixelView/SubViewport/Grass property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/Grass/material_override property=shader resource=res://shaders/grass.gdshader
set_property target=PixelView/SubViewport/Grass property=cast_shadow value=0   # tufts receive shadows, never cast them
attach_script target=PixelView/SubViewport/Grass path=res://grass_field.gd
```
`res://shaders/grass.gdshader`:
```glsl
shader_type spatial;
// Billboard grass tuft: Y-billboard, global wind, lit and shadowed at its pivot, kept out of the outline pass.
// The sun's shadows end in a crisp edge, as on the ground (sunshadow.gdshaderinc, from pixel-art-3d).
// Adapted from Eduardo Schildt's 3DPixelArt_Tutorial_Vegetation (MIT, 2026).
render_mode cull_back;

global uniform float wind_scale;
global uniform float wind_speed;
global uniform float wind_strength;
global uniform vec3 wind_direction;
global uniform sampler2D wind_noise : filter_linear_mipmap;
#include "res://shaders/sunshadow.gdshaderinc"

uniform vec4 grass_color : source_color = vec4(0.1, 0.69, 0.21, 1.0);
uniform float grass_bend_amount = 1.0;
uniform float sway_back : hint_range(0.0, 1.0, 0.01) = 1.0; // 1 sways both ways, 0 only downwind
uniform float blades = 3.0; // per tuft: 3 wide leaves for lawn grass, 7 thin ones for tall grass
uniform float blade_width = 0.26; // fraction of the card width
uniform float blade_spread = 0.18; // how far the outer blades sit from the middle

varying vec3 node_pos_view;
varying vec3 node_pos_world;

float blade(vec2 p, float root_x, float lean, float height, float width) {
	float t = p.y / height; // 0 at the root, 1 at the tip
	float half_width = width * 0.5 * sin(PI * (0.15 + 0.85 * clamp(t, 0.0, 1.0)));
	return step(abs(p.x - root_x - lean * t), half_width) * step(t, 1.0);
}

float tuft(vec2 uv) { // a hand-drawn mask works too: texture(mask, UV).r
	vec2 p = vec2(uv.x, 1.0 - uv.y);
	float a = 0.0;
	for (float i = 0.0; i < blades; i += 1.0) {
		float k = blades > 1.0 ? i / (blades - 1.0) * 2.0 - 1.0 : 0.0; // -1 at the left blade, 1 at the right
		float jitter = fract(sin((i + 1.0) * 78.233) * 43758.5453) - 0.5;
		float root = 0.5 + k * blade_spread;
		float lean = k * 0.16 + jitter * 0.12; // outer blades lean outwards
		float height = 1.0 - abs(k) * 0.3 + jitter * 0.1; // the middle blade is the tallest
		a = max(a, blade(p, root, lean, height, blade_width));
	}
	return a;
}

void vertex() {
	node_pos_view = NODE_POSITION_VIEW;
	node_pos_world = NODE_POSITION_WORLD;
	NORMAL = vec3(0.0, 1.0, 0.0); // light the tuft like the ground under it

	// Wind: world-space noise scrolls through the field, only the top of the tuft moves
	vec4 world_pos = MODEL_MATRIX * vec4(VERTEX, 1.0);
	vec3 noise = textureLod(wind_noise, world_pos.xz * wind_scale - TIME * wind_speed * wind_direction.xz, 2.0).rgb;
	noise = noise * (1.0 + sway_back) - sway_back;
	vec3 direction = normalize((VIEW_MATRIX * vec4(wind_direction, 0.0)).xyz);
	VERTEX += noise * direction * wind_strength * grass_bend_amount * (1.0 - UV.y);

	// Y-billboard, keep scale (the code StandardMaterial3D generates)
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
			vec4(normalize(cross(vec3(0.0, 1.0, 0.0), MAIN_CAM_INV_VIEW_MATRIX[2].xyz)), 0.0),
			vec4(0.0, 1.0, 0.0, 0.0),
			vec4(normalize(cross(MAIN_CAM_INV_VIEW_MATRIX[0].xyz, vec3(0.0, 1.0, 0.0))), 0.0),
			MODEL_MATRIX[3]);
	MODELVIEW_MATRIX = MODELVIEW_MATRIX * mat4(
			vec4(length(MODEL_MATRIX[0].xyz), 0.0, 0.0, 0.0),
			vec4(0.0, length(MODEL_MATRIX[1].xyz), 0.0, 0.0),
			vec4(0.0, 0.0, length(MODEL_MATRIX[2].xyz), 0.0),
			vec4(0.0, 0.0, 0.0, 1.0));
	MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
}

void fragment() {
	float variation = texture(wind_noise, node_pos_world.xz * 0.04).r; // per-tuft shade, 5 flat steps
	variation = ceil((variation + 2.5) / 3.5 * 5.0) / 5.0;
	ALBEDO = grass_color.rgb * variation;
	ALPHA = tuft(UV);
	ALPHA_SCISSOR_THRESHOLD = 0.75; // stays in the opaque pass: cheap, and in the depth buffer
	SPECULAR = 0.0;
	ROUGHNESS = 0.0; // 0 = no outline from the pixel-art-3d edge pass
	LIGHT_VERTEX = node_pos_view; // light and shadow the whole tuft at its pivot
}

void light() {
	float fall = LIGHT_IS_DIRECTIONAL ? crisp_shadow(ATTENUATION) : ATTENUATION; // as on the ground
	DIFFUSE_LIGHT += clamp(dot(NORMAL, LIGHT), 0.0, 1.0) * fall * LIGHT_COLOR / PI;
}
```
`res://grass_field.gd`:
```gdscript
@tool
extends MultiMeshInstance3D
## Scatters instances of this node's mesh (grass tufts, tall grass, flowers) over a rectangle
## centred on the node, evenly or in clumps, in the editor view and in the game. They live in an internal
## child that is never saved into the scene; this node's own MultiMesh only carries the mesh, and its
## material_override and cast_shadow are copied over.

const FoliageWind := preload("res://foliage_wind.gd")

@export var count := 4000
@export var extent := Vector2(14.0, 14.0)
@export var scale_range := Vector2(0.8, 1.3)
@export var patches := 0  # 0 = spread evenly; N = gather everything into N clumps
@export var patch_radius := 1.2
@export var seed_value := 1

var _built := ""


func _init() -> void:
	if is_inside_tree():  # attached to a node of an open scene: _ready will not run, so start now
		_start.call_deferred()


func _ready() -> void:
	_start()


func _process(_delta: float) -> void:
	if _key() != _built:  # the editor only (see _start): an export or the material changed
		_rebuild()


func tuft_count() -> int:
	for child in get_children(true):
		if child.has_meta(&"generated") and not child.is_queued_for_deletion():
			return (child as MultiMeshInstance3D).multimesh.instance_count
	return 0


func _start() -> void:
	FoliageWind.ensure(material_override)
	set_process(Engine.is_editor_hint())
	_rebuild()


func _key() -> String:
	return str([count, extent, scale_range, patches, patch_radius, seed_value, cast_shadow, extra_cull_margin, multimesh, multimesh.mesh if multimesh else null, material_override])


func _rebuild() -> void:
	_built = _key()
	for child in get_children(true):
		if child.has_meta(&"generated"):
			child.queue_free()
	if multimesh == null or multimesh.mesh == null:
		return
	var field := MultiMesh.new()
	field.transform_format = MultiMesh.TRANSFORM_3D
	field.mesh = multimesh.mesh
	field.instance_count = count
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var centres: Array[Vector3] = []
	for c in patches:
		centres.append(Vector3(rng.randf_range(-0.5, 0.5) * extent.x, 0.0, rng.randf_range(-0.5, 0.5) * extent.y))
	for i in count:
		var spot := Vector3(rng.randf_range(-0.5, 0.5) * extent.x, 0.0, rng.randf_range(-0.5, 0.5) * extent.y)
		if not centres.is_empty():  # a clump: a random centre, spread like a bell curve around it
			spot = centres[rng.randi() % centres.size()] + Vector3(rng.randfn(), 0.0, rng.randfn()) * patch_radius * 0.5
		var size := rng.randf_range(scale_range.x, scale_range.y)
		field.set_instance_transform(i, Transform3D(Basis.from_scale(Vector3.ONE * size), spot))
	var tufts := MultiMeshInstance3D.new()
	tufts.multimesh = field
	tufts.material_override = material_override
	tufts.cast_shadow = cast_shadow
	tufts.extra_cull_margin = extra_cull_margin
	tufts.set_meta(&"generated", true)
	add_child(tufts, false, Node.INTERNAL_MODE_BACK)  # internal: drawn, never saved, not in the Scene dock
```

## Recipe 3: tall grass in clumps
The same grass shader with seven thin blades on a taller card, a lighter green, more bend, and the instances gathered into patches.
```
create_node type=MultiMeshInstance3D name=TallGrass parent=PixelView/SubViewport
set_resource target=PixelView/SubViewport/TallGrass property=multimesh class=MultiMesh
set_resource target=PixelView/SubViewport/TallGrass/multimesh property=mesh class=QuadMesh
set_property target=PixelView/SubViewport/TallGrass/multimesh/mesh property=size value="0.55 1.0"
set_property target=PixelView/SubViewport/TallGrass/multimesh/mesh property=center_offset value="0 0.5 0"
set_resource target=PixelView/SubViewport/TallGrass property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/TallGrass/material_override property=shader resource=res://shaders/grass.gdshader
set_property target=PixelView/SubViewport/TallGrass/material_override property=shader_parameter/blades value=7
set_property target=PixelView/SubViewport/TallGrass/material_override property=shader_parameter/blade_width value=0.12
set_property target=PixelView/SubViewport/TallGrass/material_override property=shader_parameter/blade_spread value=0.38
set_property target=PixelView/SubViewport/TallGrass/material_override property=shader_parameter/grass_color value="#36c421"
set_property target=PixelView/SubViewport/TallGrass/material_override property=shader_parameter/grass_bend_amount value=1.4
set_property target=PixelView/SubViewport/TallGrass/material_override property=shader_parameter/sway_back value=0.5
set_property target=PixelView/SubViewport/TallGrass property=cast_shadow value=0
attach_script target=PixelView/SubViewport/TallGrass path=res://grass_field.gd
set_property target=PixelView/SubViewport/TallGrass property=count value=240
set_property target=PixelView/SubViewport/TallGrass property=patches value=8
set_property target=PixelView/SubViewport/TallGrass property=patch_radius value=1.0
set_property target=PixelView/SubViewport/TallGrass property=seed_value value=2
```

## Recipe 4: flowers
Small billboard flowers scattered in meadow patches: a stem and a five-petal head drawn in the shader, white or pale lilac per flower, with a warm heart.
```
write_file path=res://shaders/flower.gdshader content=<flower shader below>
create_node type=MultiMeshInstance3D name=Flowers parent=PixelView/SubViewport
set_resource target=PixelView/SubViewport/Flowers property=multimesh class=MultiMesh
set_resource target=PixelView/SubViewport/Flowers/multimesh property=mesh class=QuadMesh
set_property target=PixelView/SubViewport/Flowers/multimesh/mesh property=size value="0.26 0.36"
set_property target=PixelView/SubViewport/Flowers/multimesh/mesh property=center_offset value="0 0.18 0"
set_resource target=PixelView/SubViewport/Flowers property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/Flowers/material_override property=shader resource=res://shaders/flower.gdshader
set_property target=PixelView/SubViewport/Flowers property=cast_shadow value=0
attach_script target=PixelView/SubViewport/Flowers path=res://grass_field.gd
set_property target=PixelView/SubViewport/Flowers property=count value=260
set_property target=PixelView/SubViewport/Flowers property=patches value=6
set_property target=PixelView/SubViewport/Flowers property=patch_radius value=1.8
set_property target=PixelView/SubViewport/Flowers property=seed_value value=3
```
`res://shaders/flower.gdshader`:
```glsl
shader_type spatial;
// Billboard flower: a stem and a five-petal head drawn in the shader, white or pale lilac per flower,
// swaying and drooping in the global wind, lit at its pivot, kept out of the outline pass. The sun's shadows end
// in a crisp edge (sunshadow.gdshaderinc, from pixel-art-3d).
// Adapted from Eduardo Schildt's 3DPixelArt_Tutorial_Vegetation flower.gdshader (MIT, 2026).
render_mode cull_disabled;

global uniform float wind_scale;
global uniform float wind_speed;
global uniform float wind_strength;
global uniform vec3 wind_direction;
global uniform sampler2D wind_noise : filter_linear_mipmap;
#include "res://shaders/sunshadow.gdshaderinc"

uniform vec4 petal_color : source_color = vec4(0.98, 0.95, 1.0, 1.0);
uniform vec4 petal_tint : source_color = vec4(0.88, 0.7, 0.95, 1.0); // about half the flowers take this one
uniform vec4 heart_color : source_color = vec4(1.0, 0.8, 0.3, 1.0);
uniform vec4 stem_color : source_color = vec4(0.22, 0.56, 0.16, 1.0);
uniform float flower_bendiness = 1.2;
uniform float sway_back : hint_range(0.0, 1.0, 0.01) = 0.5;
uniform float light_steps = 3.0;

varying vec3 node_pos_view;
varying vec3 node_pos_world;

void vertex() {
	node_pos_view = NODE_POSITION_VIEW;
	node_pos_world = NODE_POSITION_WORLD;
	NORMAL = vec3(0.0, 1.0, 0.0); // lit like the ground under it

	vec4 world_pos = MODEL_MATRIX * vec4(VERTEX, 1.0);
	vec3 noise = textureLod(wind_noise, world_pos.xz * wind_scale - TIME * wind_speed * wind_direction.xz, 4.0).rgb;
	noise = noise * (1.0 + sway_back) - sway_back;
	vec3 direction = normalize((VIEW_MATRIX * vec4(wind_direction, 0.0)).xyz);
	// sway, and droop a little as it bends (the demo's noise-squared term)
	VERTEX += (noise * direction - noise * noise * vec3(0.0, 0.3, 0.0)) * wind_strength * flower_bendiness * (1.0 - UV.y);

	// Y-billboard, keep scale (as in grass.gdshader)
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
			vec4(normalize(cross(vec3(0.0, 1.0, 0.0), MAIN_CAM_INV_VIEW_MATRIX[2].xyz)), 0.0),
			vec4(0.0, 1.0, 0.0, 0.0),
			vec4(normalize(cross(MAIN_CAM_INV_VIEW_MATRIX[0].xyz, vec3(0.0, 1.0, 0.0))), 0.0),
			MODEL_MATRIX[3]);
	MODELVIEW_MATRIX = MODELVIEW_MATRIX * mat4(
			vec4(length(MODEL_MATRIX[0].xyz), 0.0, 0.0, 0.0),
			vec4(0.0, length(MODEL_MATRIX[1].xyz), 0.0, 0.0),
			vec4(0.0, 0.0, length(MODEL_MATRIX[2].xyz), 0.0),
			vec4(0.0, 0.0, 0.0, 1.0));
	MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
}

void fragment() {
	vec2 p = vec2(UV.x * 2.0 - 1.0, 1.0 - UV.y); // x: -1..1 across, y: 0 at the root, 1 at the top
	vec2 h = vec2(p.x, (p.y - 0.66) / 0.34) / 0.95; // the head, centred two thirds up
	float r = length(h);
	float head = step(r, 0.55 + 0.45 * abs(cos(2.5 * atan(h.y, h.x))));
	float heart = step(r, 0.3);
	float stem = step(abs(p.x), 0.07) * step(p.y, 0.6);
	float pick = fract(sin(dot(node_pos_world.xz, vec2(12.9898, 78.233))) * 43758.5453);
	vec3 petal = pick < 0.5 ? petal_color.rgb : petal_tint.rgb;
	ALBEDO = heart > 0.5 ? heart_color.rgb : (head > 0.5 ? petal : stem_color.rgb);
	ALPHA = max(head, stem);
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	SPECULAR = 0.0;
	ROUGHNESS = 0.0; // no outline from the pixel-art-3d edge pass
	LIGHT_VERTEX = node_pos_view; // the whole flower lit at its pivot
}

void light() {
	float lit = clamp(dot(NORMAL, LIGHT), 0.0, 1.0);
	lit = round(lit * light_steps) / light_steps;
	float fall = LIGHT_IS_DIRECTIONAL ? crisp_shadow(ATTENUATION) : ATTENUATION; // the sun's edge cut crisp, a lamp's fall-off kept soft
	DIFFUSE_LIGHT += lit * fall * LIGHT_COLOR / PI;
}
```

## The gate
```
save_scene
assert_scene scene=res://pixel_main.tscn require_types=["MultiMeshInstance3D","MeshInstance3D","SubViewport"]
call_method target=PixelView/SubViewport/Grass method=tuft_count args=[]   # 4000: the field is built in the editor view too
call_method target=PixelView/SubViewport/Flowers method=tuft_count args=[]   # every grass_field.gd node answers: TallGrass 240, Flowers 260
play_scene scene=res://pixel_main.tscn
wait_until condition=game_connected
game_logs level=error            # Godot 4.5+; on 4.4 use logs_read level=error
runtime_call path=PixelView/SubViewport/Grass method=tuft_count   # 4000 in the game
screenshot save_to=res://shots/windA.png
compare_screenshots baseline=res://shots/windA.png tolerance=0.0   # a second later: diff_pct > 0 means the wind moves
stop_scene
```
Pass = grass tufts you can only tell apart by their shade steps and their shadows, clumps of lighter tall grass, patches of white and lilac flowers, no outline on grass or flowers, and a `diff_pct` above 0 between two frames a second apart (about 1.7% at the defaults on 4.4.1, 4.6.2 and 4.7, with every piece of the foliage packs in view).

## Tuning
| Knob | Where | Default | Effect |
|---|---|---|---|
| `grass_bend_amount` | grass material | 1.0 | how far this grass bends (tall grass higher) |
| `sway_back` | grass material | 1.0 | 1 = sways both ways, 0 = only leans downwind |
| `count` / `extent` / `patches` / `patch_radius` | any `grass_field.gd` node | 4000 / 14 x 14 / 0 / 1.2 | density, area, and clumping (0 = even; tall grass 8, flowers 6). Tall grass reads as clumps only when sparse: at 600 per 14 x 14 m it carpets the field |
| `blades` / `blade_width` / `blade_spread` | grass material | 3 / 0.26 / 0.18 | lawn tufts; tall grass uses 7 / 0.12 / 0.38 |

Material values, in the editor (kept in the scene): `set_property target=PixelView/SubViewport/TallGrass/material_override property=shader_parameter/grass_bend_amount value=1.6`; live on the running game: `runtime_set_property path=PixelView/SubViewport/TallGrass property=material_override:shader_parameter/grass_bend_amount value=1.6`. Script values: `set_property target=PixelView/SubViewport/Grass property=count value=2000`. The editor view rebuilds on the next frame after a script value changes; the game needs a replay.

## Coming from Blender (the video's route)
- Grass: a plane of the tuft's size, rotated 90 degrees on X, transforms applied, bottom at z 0, origin on the bottom edge, normals turned UP with a Data Transfer modifier (Face Corner Data, Custom Normals) from a flat plane. `center_offset` and `NORMAL = vec3(0.0, 1.0, 0.0)` above do the same thing in Godot.
- A MultiMesh needs a Mesh resource, and an imported `.glb` is a scene: open the import dialog, select the mesh, enable Save to File, reimport, and use that `.res`.

## Traps
- **The ground must use the grass lighting formula and colour** (`ground.gdshader`). With a StandardMaterial3D ground, the tufts read as a separate layer.
- **MultiMesh `transform_format` defaults to TRANSFORM_2D (0)** and can only change while `instance_count` is 0; `grass_field.gd` handles the order.
- **The traps shared with the trees** are in `pixel-art-3d-foliage`: the editor's shader globals, a missing shadow include, alpha scissor instead of blending, the ROUGHNESS 0 outline opt-out, generated meshes that are never saved (count them with `tuft_count`), a script reloaded with a new export, a rewritten shader the editor still holds, and busy masks that shimmer.

Confirm property names with `describe_class class=MultiMesh` (or `QuadMesh`, `CylinderMesh`, `GeometryInstance3D`) before relying on them.
