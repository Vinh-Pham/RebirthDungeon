# 3D pixel-art trees and rocks: cel-shaded trunks, leaf-card canopies, faceted stones

> Cel-shaded trees for a pixelated 3D scene: a root-flared trunk with banded light and bark stripes under a lobed canopy of camera-facing leaf cards with a rim light, swaying in the wind of `pixel-art-3d-foliage`, with still spheres casting the shadow and every copy growing its own shape; plus rounded, faceted rocks with a new shape per seed on the trunk's cel shader. Godot-native meshes (no Blender needed) from `@tool` scripts that also draw in the editor view without bloating the scene, ready shaders, the gate, and the traps (flickering shadows, white seams, holes and dark speckles in the crown, look-alike copies, spiky rocks).

## When to use
The user wants trees or rocks for a 3D pixel-art or toon scene, or the trees of the "Stylized Grass & Trees for Pixel Art 3D in Godot 4" video. Build `pixel-art-3d` first (the SubViewport, the outline pass, and its Shadows section, whose `res://shaders/sunshadow.gdshaderinc` both shaders here include for a crisp shadow edge), then `pixel-art-3d-foliage` Recipes 1 and 2: the warm light that colours bark, leaves and stone, and the wind the leaf shader reads (without its shader globals it does not compile). Its Traps cover these shaders and scripts too. Rocks alone need only the first line of Recipe 1 (`trunk.gdshader`) and that include, not the wind. The shaders are adapted from that video's MIT demo project (Eduardo Schildt, Godot 4.5); the leaf-card billboard follows Pontus Karlsson. Companion packs: `pixel-art-3d-foliage`, `pixel-art-3d-grass`, `pixel-art-3d-light-shafts`, `pixel-art-3d`, `shaders`, `node3d`.

## Version and renderer
- Godot 4.3+ (verified with these exact calls on 4.4.1, 4.6.2 and 4.7). Forward+ for the outline interplay; the foliage shaders themselves are plain spatial shaders.
- The video models the meshes in Blender. This pack builds equivalents inside Godot so an agent can do everything through tools; the Blender route is summarised at the end.

## The pieces
| Piece | Node / resource | Why it looks right |
|---|---|---|
| Tree | `Node3D` > trunk (`MeshInstance3D` + `tree_trunk.gd` + `trunk.gdshader`) + canopy (`MeshInstance3D` + `tree_canopy.gd` + `leaves.gdshader`) | root-flared trunk with banded cel light and bark stripes, lobed canopy of leaf cards with a rim light, still spheres cast the shadow; every copy grows its own shape |
| Rocks | `MeshInstance3D` + `rock.gd` + `trunk.gdshader` (pink stone, no stripes) | rounded stone with flat chips, a new shape per seed, one cel band per facet, never a spike |

## Recipe 1: a tree
```
write_file path=res://shaders/trunk.gdshader content=<trunk shader below>
write_file path=res://shaders/leaves.gdshader content=<leaves shader below>
write_script path=res://tree_trunk.gd content=<tree_trunk.gd below>
write_script path=res://tree_canopy.gd content=<tree_canopy.gd below>
create_node type=Node3D name=Tree parent=PixelView/SubViewport
set_property target=PixelView/SubViewport/Tree property=position value="1.5 0 -1.5"
create_node type=MeshInstance3D name=Trunk parent=PixelView/SubViewport/Tree
set_resource target=PixelView/SubViewport/Tree/Trunk property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/Tree/Trunk/material_override property=shader resource=res://shaders/trunk.gdshader
attach_script target=PixelView/SubViewport/Tree/Trunk path=res://tree_trunk.gd
create_node type=MeshInstance3D name=Canopy parent=PixelView/SubViewport/Tree
set_property target=PixelView/SubViewport/Tree/Canopy property=position value="0 2.7 0"
set_resource target=PixelView/SubViewport/Tree/Canopy property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/Tree/Canopy/material_override property=shader resource=res://shaders/leaves.gdshader
attach_script target=PixelView/SubViewport/Tree/Canopy path=res://tree_canopy.gd
save_scene
```
More trees: `duplicate_node target=PixelView/SubViewport/Tree name=Tree2`, then move it. The copy grows its own crown and trunk by itself: with `seed_value` 0 both scripts take their seed from the tree's name, and `variety` sets how far a seed reshapes them. Give the copy its own size and facing too, on the tree node: `set_property target=PixelView/SubViewport/Tree2 property=scale value="1.25 1.25 1.25"`, `set_property target=PixelView/SubViewport/Tree2 property=rotation_degrees value="0 140 0"`. Between 0.8 and 1.3 the leaves stay leaf-sized.

`res://shaders/trunk.gdshader`:
```glsl
shader_type spatial;
// Cel-shaded trunk: light quantized into light_steps bands, two-tone bark stripes. The sun's shadows end in a crisp
// edge (sunshadow.gdshaderinc, from pixel-art-3d).
// Adapted from Eduardo Schildt's 3DPixelArt_Tutorial_Vegetation (MIT, 2026).
render_mode specular_disabled;

#include "res://shaders/sunshadow.gdshaderinc"

uniform vec4 trunk_color : source_color = vec4(0.78, 0.48, 0.3, 1.0); // orange bark: the warm sun lights it orange, the sky shades it maroon
uniform sampler2D bark : source_color, filter_nearest, hint_default_white; // optional; keep it low-detail
uniform vec2 uv_scale = vec2(1.0, 1.0);
uniform float stripes = 8.0; // darker wavy stripes around the trunk; 0 when a bark texture draws them
uniform float light_steps = 3.0;
uniform float outline_mask = 1.0; // written to ROUGHNESS: 1 keeps outlines, 0 opts out

varying float occlusion;

void fragment() {
	occlusion = round(COLOR.r * light_steps) / light_steps; // darker vertex colours = baked contact shadow; white without them
	vec2 uv = UV * uv_scale;
	float stripe = step(0.62, fract(uv.x * stripes + 0.08 * sin(uv.y * 9.0 + uv.x * 40.0))) * step(0.5, stripes);
	ALBEDO = trunk_color.rgb * texture(bark, uv).rgb * (1.0 - 0.17 * stripe);
	SPECULAR = 0.0;
	ROUGHNESS = outline_mask;
}

void light() {
	float lit = clamp(dot(NORMAL, LIGHT), 0.0, 1.0);
	lit = ceil(lit * light_steps) / light_steps;
	float fall = LIGHT_IS_DIRECTIONAL ? crisp_shadow(ATTENUATION) : ATTENUATION; // the sun's edge cut crisp, a lamp's fall-off kept soft
	DIFFUSE_LIGHT += lit * fall * occlusion * LIGHT_COLOR / PI;
}
```
`res://tree_trunk.gd`:
```gdscript
@tool
extends MeshInstance3D
## Trunk for trunk.gdshader: a tapered, open-topped tube whose foot spreads into root fins, in the editor
## view and in the game. The mesh lives in an internal child that is never saved into the scene; this
## node's material_override and cast_shadow are copied over. UV.x runs around the trunk (bark stripes),
## UV.y up it. The node's origin is the trunk's foot.

@export var height := 2.2
@export var radius_bottom := 0.3
@export var radius_top := 0.2
@export var roots := 5
@export var root_reach := 0.45  # how far each root spreads past the trunk at ground level
@export var root_climb := 0.7  # how high up the trunk the flare reaches
@export var sides := 40
@export var rings := 12
@export var seed_value := 0  # 0 = taken from the tree's name, so a copy (Tree2, Tree3...) grows its own trunk
@export var variety := 0.35  # how far a seed changes height, girth and roots; 0 = exactly as set above

var _built := ""
var _shape := Vector4(1.0, 1.0, 1.0, 0.0)  # this seed's height, girth and root-reach factors, and root turn


func _init() -> void:
	if is_inside_tree():  # attached to a node of an open scene: _ready will not run, so start now
		_start.call_deferred()


func _ready() -> void:
	_start()


func _process(_delta: float) -> void:
	if _key() != _built:  # the editor only (see _start): an export or the material changed
		_rebuild()


func _start() -> void:
	set_process(Engine.is_editor_hint())
	_rebuild()


func _key() -> String:
	return str([height, radius_bottom, radius_top, roots, root_reach, root_climb, sides, rings, _seed(), variety, cast_shadow, material_override])


## seed_value, or (when 0) one taken from the tree's name: the Trunk and Canopy of one tree agree on it.
func _seed() -> int:
	if seed_value != 0:
		return seed_value
	var tree := get_parent()
	return hash(String(tree.name) if tree != null else String(name))


func _rebuild() -> void:
	_built = _key()
	var rng := RandomNumberGenerator.new()
	rng.seed = _seed() + 2027  # its own stream: the canopy draws from the same seed
	_shape = Vector4(1.0 + rng.randf_range(-0.1, 0.4) * variety, 1.0 + rng.randf_range(-0.2, 0.25) * variety,
		1.0 + rng.randf_range(-0.5, 0.5) * variety, rng.randf() * TAU if variety > 0.0 else 0.0)
	for child in get_children(true):
		if child.has_meta(&"generated"):
			child.queue_free()
	var trunk := MeshInstance3D.new()
	trunk.mesh = _build()
	trunk.material_override = material_override
	trunk.cast_shadow = cast_shadow
	trunk.set_meta(&"generated", true)
	add_child(trunk, false, Node.INTERNAL_MODE_BACK)  # internal: drawn, never saved, not in the Scene dock


func _point(i: int, j: int) -> Vector3:
	var angle := TAU * i / sides
	var tall := height * _shape.x  # at most variety x 10% shorter: the canopy must still cover the top
	var y := tall * j / rings
	var flare := pow(maxf(cos(angle * roots + _shape.w), 0.0), 4.0) * pow(maxf(1.0 - y / root_climb, 0.0), 2.0)
	var r := lerpf(radius_bottom, radius_top, y / tall) * _shape.y + root_reach * _shape.z * flare
	return Vector3(cos(angle) * r, y, sin(angle) * r)


func _build() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for j in rings:
		for i in sides:
			var quad := [Vector2i(i, j), Vector2i(i + 1, j), Vector2i(i + 1, j + 1), Vector2i(i, j + 1)]
			for k in [0, 1, 2, 0, 2, 3]:  # clockwise seen from outside: Godot's front face
				var c: Vector2i = quad[k]
				st.set_uv(Vector2(float(c.x) / sides, 1.0 - float(c.y) / rings))
				st.add_vertex(_point(c.x, c.y))
	st.generate_normals()
	return st.commit()
```
`res://shaders/leaves.gdshader`:
```glsl
shader_type spatial;
// Leaf cards: every face of the canopy mesh opens into a camera-facing card, cel-shaded with a rim light,
// shadowed at its original position, swaying in the global wind. The sun's shadows end in a crisp edge
// (sunshadow.gdshaderinc, from pixel-art-3d).
// Adapted from Eduardo Schildt's 3DPixelArt_Tutorial_Vegetation (MIT, 2026); the UV billboard follows Pontus Karlsson.
render_mode specular_disabled, cull_back;

global uniform float wind_scale;
global uniform float wind_speed;
global uniform float wind_strength;
global uniform vec3 wind_direction;
global uniform sampler2D wind_noise : filter_linear_mipmap;
#include "res://shaders/sunshadow.gdshaderinc"

uniform vec4 color : source_color = vec4(0.36, 0.66, 0.18, 1.0);
uniform float leaves_scale = 0.4;
uniform float leaf_bend_amount = 0.7;
uniform float light_steps = 5.0;

varying vec4 view_pos;

float leaf(vec2 uv) { // five petals; a hand-drawn mask works too: texture(mask, UV).r
	vec2 p = uv * 2.0 - 1.0;
	float petals = 0.55 + 0.45 * abs(cos(2.5 * atan(p.y, p.x)));
	return step(length(p), 0.95 * petals);
}

void vertex() {
	vec4 world_pos = MODEL_MATRIX * vec4(VERTEX, 1.0);
	view_pos = MODELVIEW_MATRIX * vec4(VERTEX, 1.0); // before the card opens: shadows follow the canopy shape

	float noise = textureLod(wind_noise, world_pos.xz * wind_scale - TIME * wind_speed * wind_direction.xz, 1.0).r;
	noise = (noise * 2.0 - 1.0) * wind_strength * leaf_bend_amount;

	// Card corner from the UV corner, in view space
	vec4 card = normalize(vec4(UV.y, UV.x, 0.0, 1.0) * 2.0 - 1.0) * leaves_scale;
	// Fake rotation: top and bottom, left and right move in opposite directions
	card += noise * vec4(1.0, 0.0, 0.0, 0.0) * (UV.x * 2.0 - 1.0) - noise * vec4(0.0, 1.0, 0.0, 0.0) * (UV.y * 2.0 - 1.0);
	// Per-card spin and size from the vertex colour (tree_canopy.gd writes them; white leaves a card as it is)
	float spin = COLOR.r * TAU;
	card.xy = mat2(vec2(cos(spin), sin(spin)), vec2(-sin(spin), cos(spin))) * card.xy * (0.4 + 0.6 * COLOR.g);
	card *= MODELVIEW_MATRIX; // view-space offset back into model space
	VERTEX += card.xyz;
}

void fragment() {
	ALBEDO = color.rgb;
	ALPHA = leaf(UV);
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	ROUGHNESS = 0.0; // 0 = no outline from the pixel-art-3d edge pass
	SPECULAR = 0.0;
	LIGHT_VERTEX = view_pos.xyz;
}

void light() {
	float lit = clamp(dot(NORMAL, LIGHT), 0.0, 1.0);
	lit = ceil(lit * light_steps) / light_steps;
	float fall = LIGHT_IS_DIRECTIONAL ? crisp_shadow(ATTENUATION) : ATTENUATION; // the sun's edge cut crisp, a lamp's fall-off kept soft
	DIFFUSE_LIGHT += lit * fall * LIGHT_COLOR / PI;
	float rim = (1.0 - dot(NORMAL, VIEW)) * lit; // glow on the lit edge only
	rim = round(rim * light_steps) / light_steps;
	DIFFUSE_LIGHT += rim * rim * fall * LIGHT_COLOR / PI;
}
```
`res://tree_canopy.gd`:
```gdscript
@tool
extends MeshInstance3D
## Leaf canopy for leaves.gdshader, in the editor view and in the game: quads scattered at random over a
## few overlapping spheres (lobes), each quad with the full 0..1 UV square (the shader opens every quad
## into a camera-facing leaf card) and a random spin and size in its vertex colour, plus still spheres
## that only cast the canopy's shadow, so the swaying cards never make shadows flicker. All of it lives
## in internal children that are never saved into the scene; this node's material_override is copied.
## The seed turns, stretches and shifts the crown and may leave a side lobe out, so no two trees share one.

const FoliageWind := preload("res://foliage_wind.gd")

## One lobe per entry: xyz = centre offset, w = radius, all scaled by `size`. A core, a crown and six
## lobes around it, none below: the lumpy, flat-bottomed cloud the video remeshes in Blender.
@export var lobes: Array[Vector4] = [
	Vector4(0, 0, 0, 1.0), Vector4(0.05, 0.75, 0, 0.7),
	Vector4(-0.75, 0.35, 0.1, 0.7), Vector4(0.75, 0.4, -0.1, 0.7),
	Vector4(-0.95, -0.25, 0.25, 0.62), Vector4(0.9, -0.2, 0.2, 0.62),
	Vector4(0.1, -0.15, 0.8, 0.62), Vector4(-0.15, 0.2, -0.8, 0.62)]
@export var size := 1.0
@export var cards_per_area := 70.0  # random placement needs about 7x overlap, or sky, trunk and dark inside show through
@export var card_size := 0.2
@export var seed_value := 0  # 0 = taken from the tree's name, so a copy (Tree2, Tree3...) grows its own crown
@export var variety := 0.35  # how far a seed reshapes the lobes; 0 = exactly as listed

const SHELL := 0.85  # shadow spheres and the buried test sit at this fraction of a lobe radius, the cards above it

var _built := ""
var _lobes: Array[Vector4] = []  # `lobes` as this seed grows them
var _cards := 0


func _init() -> void:
	if is_inside_tree():  # attached to a node of an open scene: _ready will not run, so start now
		_start.call_deferred()


func _ready() -> void:
	_start()


func _process(_delta: float) -> void:
	if _key() != _built:  # the editor only (see _start): an export or the material changed
		_rebuild()


func _start() -> void:
	FoliageWind.ensure(material_override)
	set_process(Engine.is_editor_hint())
	_rebuild()


func _key() -> String:
	return str([lobes, size, cards_per_area, card_size, _seed(), variety, material_override])


func card_count() -> int:
	return _cards


## seed_value, or (when 0) one taken from the tree's name: the Trunk and Canopy of one tree agree on it.
func _seed() -> int:
	if seed_value != 0:
		return seed_value
	var tree := get_parent()
	return hash(String(tree.name) if tree != null else String(name))


func _rebuild() -> void:
	_built = _key()
	_lobes = _grown_lobes()
	for child in get_children(true):
		if child.has_meta(&"generated"):
			child.queue_free()
	var cards := MeshInstance3D.new()
	cards.mesh = _build_cards()
	cards.material_override = material_override
	cards.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_own(cards)
	for lobe in _lobes:
		var sphere := SphereMesh.new()
		sphere.radius = lobe.w * size * SHELL  # inside every card: a card inside it would sit in shadow forever
		sphere.height = sphere.radius * 2.0
		var shadow := MeshInstance3D.new()
		shadow.mesh = sphere
		shadow.position = Vector3(lobe.x, lobe.y, lobe.z) * size
		shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY
		_own(shadow)


func _own(node: Node) -> void:
	node.set_meta(&"generated", true)
	add_child(node, false, Node.INTERNAL_MODE_BACK)  # internal: drawn, never saved, not in the Scene dock


## The listed lobes as this seed grows them: the crown turned to a random side, stretched, and shifted off
## the trunk as a whole, and now and then a side lobe left out, which makes it lopsided. The lobes never
## move apart from each other: pushed apart, they open valleys that show the dark inside of the crown.
func _grown_lobes() -> Array[Vector4]:
	var rng := RandomNumberGenerator.new()
	rng.seed = _seed() + 1013  # its own stream, apart from the card scatter
	var turn := Basis(Vector3.UP, rng.randf() * TAU) if variety > 0.0 else Basis()
	var stretch := Vector3.ONE + Vector3(rng.randf_range(-0.2, 0.2), rng.randf_range(-0.3, 0.3), rng.randf_range(-0.2, 0.2)) * variety
	var shift := Vector3(rng.randf_range(-0.4, 0.4), 0.0, rng.randf_range(-0.4, 0.4)) * variety
	var grown: Array[Vector4] = []
	var left_out := 0
	for i in lobes.size():
		# the first two lobes (core and top) hold the crown together and always stay
		if i >= 2 and left_out < 2 and rng.randf() < variety * 0.25:
			left_out += 1
			continue
		var offset := turn * (Vector3(lobes[i].x, lobes[i].y, lobes[i].z) * stretch) + shift
		grown.append(Vector4(offset.x, offset.y, offset.z, lobes[i].w * (1.0 + rng.randf_range(-0.15, 0.15) * variety)))
	return grown


func _build_cards() -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = _seed()
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var uvs := [Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)]
	_cards = 0
	for lobe in _lobes:
		var origin := Vector3(lobe.x, lobe.y, lobe.z) * size
		var r := lobe.w * size
		var count := int(cards_per_area * 4.0 * PI * r * r)
		for i in count:
			# random, not an even lattice: an even spread lines the cards up into visible rows
			var dir := Vector3(rng.randfn(), rng.randfn(), rng.randfn()).normalized()
			var center := origin + dir * r * rng.randf_range(0.9, 1.0)
			if _buried(center, lobe):
				continue  # inside a neighbour lobe: never seen, and it would sit in that lobe's shadow
			# light the whole canopy as one blob with bumps: big, clean light bands instead of per-lobe speckle
			var normal := (center.normalized() * 0.65 + dir * 0.35).normalized()
			var side := dir.cross(Vector3.UP if absf(dir.y) < 0.95 else Vector3.RIGHT).normalized()
			var up := dir.cross(side)
			var h := card_size * 0.5
			var corners := [center - side * h - up * h, center + side * h - up * h, center + side * h + up * h, center - side * h + up * h]
			var look := Color(rng.randf(), rng.randf_range(0.33, 1.0), 1.0)  # r = spin, g = size (0.6..1.0 of leaves_scale)
			for k in [0, 1, 2, 0, 2, 3]:
				st.set_normal(normal)
				st.set_color(look)
				st.set_uv(uvs[k])
				st.add_vertex(corners[k])
			_cards += 1
	return st.commit()


func _buried(p: Vector3, own: Vector4) -> bool:
	for lobe in _lobes:
		if lobe != own and p.distance_to(Vector3(lobe.x, lobe.y, lobe.z) * size) < lobe.w * size * SHELL:
			return true
	return false
```

## Recipe 2: rocks with random shapes
Every `seed_value` gives a different boulder: a rounded stone with a few flat chips knocked off it, longer one way, squashed, cut flat underneath, flat-shaded so each facet takes its own cel band. No seed gives a spike: every step keeps the stone convex (jittering the vertices of a sphere instead pushed single points out into sharp peaks). It uses `trunk.gdshader` with a pinkish stone colour and no stripes: the warm sun lights the facets peach and the cool sky shades them lilac, as in the demo.
```
write_script path=res://rock.gd content=<rock.gd below>
create_node type=MeshInstance3D name=Rock parent=PixelView/SubViewport
set_property target=PixelView/SubViewport/Rock property=position value="-2.6 0 -2.2"
set_resource target=PixelView/SubViewport/Rock property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/Rock/material_override property=shader resource=res://shaders/trunk.gdshader
set_property target=PixelView/SubViewport/Rock/material_override property=shader_parameter/trunk_color value="#ccb0c4"
set_property target=PixelView/SubViewport/Rock/material_override property=shader_parameter/stripes value=0.0
attach_script target=PixelView/SubViewport/Rock path=res://rock.gd
duplicate_node target=PixelView/SubViewport/Rock name=Rock2
set_property target=PixelView/SubViewport/Rock2 property=position value="3.4 0 1.6"
set_property target=PixelView/SubViewport/Rock2 property=seed_value value=8
set_property target=PixelView/SubViewport/Rock2 property=radius value=0.5
```
`res://rock.gd`:
```gdscript
@tool
extends MeshInstance3D
## A low-poly boulder for trunk.gdshader (give it a stone colour and stripes = 0): a rounded stone with a few
## flat chips knocked off it, longer one way, squashed and cut flat underneath, with flat-shaded facets. Every
## seed_value is a new shape, and none has a spike: each step keeps the stone convex. Built in the editor
## view and in the game, in an internal child never saved into the scene.

@export var radius := 0.8
@export var squash := 0.7  # height / width
@export var stretch := 0.3  # how much longer than wide, along a random direction
@export var chips := 6  # flat facets knocked off it; 0 = a smooth pebble
@export var chip_depth := 0.22  # how deep a chip cuts, as a fraction of the radius
@export var detail := 1  # 1 = chunky (80 faces), 2 = rounder (320)
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


func _start() -> void:
	set_process(Engine.is_editor_hint())
	_rebuild()


func _key() -> String:
	return str([radius, squash, stretch, chips, chip_depth, detail, seed_value, cast_shadow, material_override])


func _rebuild() -> void:
	_built = _key()
	for child in get_children(true):
		if child.has_meta(&"generated"):
			child.queue_free()
	var rock := MeshInstance3D.new()
	rock.mesh = _build()
	rock.material_override = material_override
	rock.cast_shadow = cast_shadow
	rock.set_meta(&"generated", true)
	add_child(rock, false, Node.INTERNAL_MODE_BACK)  # internal: drawn, never saved, not in the Scene dock


func _build() -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var turn := rng.randf() * TAU
	var long_way := Vector3(cos(turn), 0.0, sin(turn))
	var cuts: Array[Plane] = []
	for i in chips:  # from the sides and above: underneath, the ground cut takes everything anyway
		var normal := Vector3(rng.randfn(), absf(rng.randfn()) * 0.6, rng.randfn()).normalized()
		cuts.append(Plane(normal, 1.0 - chip_depth * rng.randf_range(0.5, 1.0)))
	var centre := Vector3(0.0, radius * squash * 0.4, 0.0)  # inside the finished stone
	var sphere := _icosphere(clampi(detail, 0, 3))
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)  # flat facets
	for i in range(0, sphere.size(), 3):
		var a := _shape(sphere[i], long_way, cuts)
		var b := _shape(sphere[i + 1], long_way, cuts)
		var c := _shape(sphere[i + 2], long_way, cuts)
		var facing := (a - c).cross(a - b)  # Godot's front face, as Plane(a, b, c) sees it
		if facing.length_squared() < 1e-12:
			continue  # flattened to nothing by a chip or the ground cut
		if facing.dot((a + b + c) / 3.0 - centre) < 0.0:
			var swap := b  # the stone is convex, so outward means away from its centre
			b = c
			c = swap
		st.add_vertex(a)
		st.add_vertex(b)
		st.add_vertex(c)
	st.generate_normals()
	return st.commit()


func _shape(v: Vector3, long_way: Vector3, cuts: Array[Plane]) -> Vector3:
	var p := v + long_way * v.dot(long_way) * stretch  # longer one way
	for cut in cuts:
		var over := cut.distance_to(p)
		if over > 0.0:
			p -= cut.normal * over  # chipped flat
	p *= radius
	var ground := -radius * squash * 0.4
	p.y = maxf(p.y * squash, ground)  # cut flat underneath, so it sits on the ground
	return p - Vector3(0.0, ground, 0.0)


## Triangles (three points each) of a unit sphere: an icosahedron with every face split in four `detail` times.
## Its even, irregular facets read as stone; a UV sphere's rings read as a melon.
static func _icosphere(detail: int) -> PackedVector3Array:
	var t := (1.0 + sqrt(5.0)) * 0.5
	var corners: Array[Vector3] = [Vector3(-1, t, 0), Vector3(1, t, 0), Vector3(-1, -t, 0), Vector3(1, -t, 0),
		Vector3(0, -1, t), Vector3(0, 1, t), Vector3(0, -1, -t), Vector3(0, 1, -t),
		Vector3(t, 0, -1), Vector3(t, 0, 1), Vector3(-t, 0, -1), Vector3(-t, 0, 1)]
	var faces := [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
		3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1]
	var tris := PackedVector3Array()
	for i in faces:
		tris.append(corners[i].normalized())
	for _pass in detail:
		var finer := PackedVector3Array()
		for i in range(0, tris.size(), 3):
			var a := tris[i]
			var b := tris[i + 1]
			var c := tris[i + 2]
			var ab := (a + b).normalized()
			var bc := (b + c).normalized()
			var ca := (c + a).normalized()
			finer.append_array(PackedVector3Array([a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca]))
		tris = finer
	return tris
```

## The gate
```
save_scene
assert_scene scene=res://pixel_main.tscn require_types=["MeshInstance3D","SubViewport"]
call_method target=PixelView/SubViewport/Tree/Canopy method=card_count args=[]   # a few thousand leaf cards; a copy of the tree gets a different count
play_scene scene=res://pixel_main.tscn
wait_until condition=game_connected
game_logs level=error            # Godot 4.5+; on 4.4 use logs_read level=error
runtime_call path=PixelView/SubViewport/Tree/Canopy method=card_count   # the same count in the game: the seed comes from the tree's name
screenshot save_to=res://shots/trees.png
stop_scene
```
Pass = a fluffy tree whose cards are lighter on the side facing the light, with a brighter rim, a crisp shadow under it, no outline on the leaves, and two rounded, faceted rocks of different shapes with no spike.

## Tuning
| Knob | Where | Default | Effect |
|---|---|---|---|
| `leaves_scale` / `leaf_bend_amount` / `light_steps` | leaves material | 0.4 / 0.7 / 5 | card size (each card is 0.6-1.0 of it; about 1/12 of the canopy width reads as leaves, 1/7 as blobs), leaf flutter, number of light bands |
| `light_steps` / `stripes` / `trunk_color` | trunk material | 3 / 8 / orange | cel bands (1 = flat), bark stripes around the trunk, bark colour |
| `radius` / `squash` / `stretch` / `chips` / `chip_depth` / `detail` / `seed_value` | Rock node (script) | 0.8 / 0.7 / 0.3 / 6 / 0.22 / 1 / 1 | size, flatness, how long, how many flat facets and how deep, how round (2 = smoother), and the shape: every seed is a new stone |
| `height` / `radius_bottom` / `radius_top` / `roots` / `root_reach` / `root_climb` | Trunk node (script) | 2.2 / 0.3 / 0.2 / 5 / 0.45 / 0.7 | trunk shape and its root flare |
| `lobes` / `size` / `cards_per_area` / `card_size` | Canopy node (script) | 8 lobes / 1.0 / 70 / 0.2 | canopy silhouette (offset + radius per lobe), overall size, fullness (holes through the canopy: raise it, more so after shrinking `leaves_scale`) |
| `seed_value` / `variety` | Trunk and Canopy nodes (script) | 0 / 0.35 | which tree grows (0 = from the tree's name, so every copy differs) and how far a seed reshapes crown and trunk (0 = exactly as set) |

Material values, in the editor (kept in the scene): `set_property target=PixelView/SubViewport/Tree/Canopy/material_override property=shader_parameter/leaves_scale value=0.5`; live on the running game: `runtime_set_property path=PixelView/SubViewport/Tree/Canopy property=material_override:shader_parameter/leaves_scale value=0.5`. Script values: `set_property target=PixelView/SubViewport/Tree/Canopy property=size value=1.4`. The editor view rebuilds on the next frame after a script value changes; the game needs a replay.

## Coming from Blender (the video's route)
- Canopy: a sphere with Displace (Clouds texture) and Remesh, a few half spheres added around it, then a NEW UV map, so every face covers the whole 0..1 UV square. That per-face UV is what `leaves.gdshader` opens into a card; `tree_canopy.gd` builds the same thing from its `lobes`.
- Trunk: a cylinder with large roots modelled at the base; `tree_trunk.gd` grows the roots as a flare (`roots`, `root_reach`, `root_climb`).
- An imported `.glb` is a scene: open the import dialog, select the mesh, enable Save to File, reimport, and use that `.res`. The shadow twin is the same mesh duplicated with no material and `cast_shadow` = 3 (SHADOW_CASTING_SETTING_SHADOWS_ONLY).

## Traps
- **Flickering shadows under trees**: swaying cards casting shadows make every tuft lit at its pivot blink. The animated canopy casts nothing (`cast_shadow` 0) and a still twin casts instead (`tree_canopy.gd` adds the sphere).
- **A white seam where trunk meets leaves** is the edge pass's crease highlight, not lighting: keep `line_highlight` at 0 (`pixel-art-3d-foliage` Recipe 1).
- **A rock with a spike** comes from pushing single vertices of a sphere outward. `rock.gd` only stretches, slices flat and cuts the bottom, so every stone stays convex.
- **Copies of a tree that look the same** share a `seed_value`. Leave it at 0 on the copy's Trunk and Canopy (the seed then comes from the tree's name) or give each copy its own number; set `scale` and `rotation_degrees` on the tree node for size and facing.
- **A canopy that looks tiled or streaked** means the cards are too regular: an even lattice of identical, identically turned cards lines up into rows. Keep the random placement and the per-card spin and size (`tree_canopy.gd` writes them into the vertex colour, `leaves.gdshader` reads them). A remeshed Blender canopy gets the same irregularity from its uneven faces.
- **Dark speckles across the lit side, colours that never group into bands**: cards sitting inside a shadow sphere (they stay in shadow forever) or each lobe lit on its own normals. Keep every card above `SHELL` and the normals mostly pointing out of the whole canopy, as `tree_canopy.gd` does; the original's single remeshed blob gives the same big, smooth bands. Lobes moved apart from each other do it too (the valleys between them show the crown's shadowed inside), which is why `variety` moves the crown as a whole and never one lobe away from the rest.
- **Holes in the crown (black, sky or trunk-coloured specks between the leaves)**: random cards always leave gaps, and in a wide view a card is only a few game pixels. Raise `cards_per_area`. Plugging the gaps with solid spheres inside does not work: the fluffy look is several layers of cards seen through each other, and a solid core turns the crown into smooth balls.
- **The traps shared with the grass** are in `pixel-art-3d-foliage`: the editor's shader globals (a material on `leaves.gdshader` whose node does not run `tree_canopy.gd`), a missing shadow include, alpha scissor instead of blending, the ROUGHNESS 0 outline opt-out, generated meshes that are never saved (count leaf cards with `card_count`), a script reloaded with a new export, a rewritten shader the editor still holds, and bark or leaf masks too busy for low resolution.

Confirm property names with `describe_class class=GeometryInstance3D` (or `MeshInstance3D`, `SphereMesh`, `SurfaceTool`) before relying on them.
