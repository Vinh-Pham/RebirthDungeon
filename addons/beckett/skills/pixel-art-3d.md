# 3D pixel art: render a 3D scene as crisp low-res pixels with 1-px outlines

> Pixelate a 3D scene with a SubViewport rendered at 1/N of the window and upscaled with nearest filtering, then add a full-screen depth+normal edge shader for dark silhouettes and light crease lines. Exact node tree and values, a ready shader, a pixel-snapping camera that also fits the sun's shadow map to the view, a crisp shadow edge for cel shaders, the render gate, and the traps (blurry or jagged ortho shadows, vanishing transparent objects).

## When to use
The user wants "3D pixel art", "pixelated 3D", "low-res 3D with outlines", a pixel diorama look, or asks to reproduce the "3D PixelArt Tutorial - Godot" video. The technique comes from that tutorial (Eduardo Schildt, Godot 4.4) and its MIT example project; the crease term is Kody King's normal edge indicator from the three.js pixel pass. Companion packs: `pixel-art-3d-foliage` (the light and wind for this look, and the map to `pixel-art-3d-grass`, `pixel-art-3d-trees` and `pixel-art-3d-light-shafts`), `viewport-camera` (SubViewport basics), `shaders` (GDShader basics), `node3d` (meshes, materials, lights).

## Version and renderer
- **Godot 4.3+.** The outline quad writes `POSITION = vec4(VERTEX.xy, 1.0, 1.0)`: z 1.0 is the NEAR plane because 4.3 switched to a reversed-Z depth buffer, and pre-4.3 code (`vec4(VERTEX, 1.0)`) no longer works. 4.3+ also decodes the normal-roughness buffer for user shaders: sampling it gives `rgb = view-space normal * 0.5 + 0.5`, `a = roughness`.
- **The pixelation layer works on every renderer. The outline layer needs Forward+**, the only renderer with `hint_normal_roughness_texture`. Check `get_project_setting setting=rendering/renderer/rendering_method` (want `forward_plus`).
- Verified with the recipes below, through these exact tool calls, on 4.4.1, 4.6.2 and 4.7.

## How it works
1. **Pixelation, the whole look on its own.** The 3D world renders into a `SubViewport` N times smaller than the window. Its `SubViewportContainer` (a Control) stretches it back to full size with NEAREST filtering, so each game pixel becomes an N x N block.
2. **Outlines, optional and recommended.** A `MeshInstance3D` with a 2x2 `QuadMesh`, parented to the camera, runs a spatial shader over the whole screen. Each pixel compares its linear depth and normal with its 4 neighbours: a depth jump draws a dark silhouette line, a sharp normal change a lighter crease line. Inside the SubViewport every line is exactly one game pixel wide.

## Node tree
```
Main (Node3D)                                  scene root
└─ PixelView (SubViewportContainer)            Control: full rect, stretch, stretch_shrink = N, texture_filter = NEAREST
   └─ SubViewport (SubViewport)                size is driven by the container: never set it
      ├─ Camera3D                              MUST be inside the SubViewport; orthographic; far kept small
      │  └─ OutlinePass (MeshInstance3D)       mesh = QuadMesh (2x2, flip_faces), material_override = ShaderMaterial
      ├─ DirectionalLight3D, WorldEnvironment
      └─ the world: meshes, or an instanced level scene
```
HUD and menus stay OUTSIDE the SubViewport (a CanvasLayer beside PixelView) so text stays sharp. `QuadMesh`, `ShaderMaterial`, `Shader` and `StandardMaterial3D` are Resources (`set_resource`); everything in the tree is a Node.

## Recipe 1: the pixelation layer
```
write_file path=res://pixel_main.tscn content="[gd_scene format=3]\n\n[node name=\"Main\" type=\"Node3D\"]\n"
open_scene path=res://pixel_main.tscn
create_node type=SubViewportContainer name=PixelView parent=Main
call_method target=PixelView method=set_anchors_and_offsets_preset args=[15]    # PRESET_FULL_RECT
set_property target=PixelView property=stretch value=true
set_property target=PixelView property=stretch_shrink value=4                   # 1 game pixel = 4x4 screen pixels
set_property target=PixelView property=texture_filter value=1                   # TEXTURE_FILTER_NEAREST: blocky, not blurry
create_node type=SubViewport name=SubViewport parent=PixelView
create_node type=Camera3D name=Camera3D parent=PixelView/SubViewport
set_property target=PixelView/SubViewport/Camera3D property=projection value=1  # PROJECTION_ORTHOGONAL
set_property target=PixelView/SubViewport/Camera3D property=size value=6.0     # metres of world visible vertically
set_property target=PixelView/SubViewport/Camera3D property=far value=100.0    # default 4000 blurs every shadow, see Shadows
set_property target=PixelView/SubViewport/Camera3D property=position value="0 6 7.5"
set_property target=PixelView/SubViewport/Camera3D property=rotation_degrees value="-30 0 0"
```
The world goes INSIDE the SubViewport: new nodes with `parent=PixelView/SubViewport`, or a whole level with `instance_scene scene=res://level.tscn parent=PixelView/SubViewport`. If that level brings its own Camera3D, delete the one above and do Recipe 2 inside the level scene, under the level's camera.

Pick N so the window divides evenly, or the game pixels come out uneven: 1152x648 takes 2, 3, 4, 6, 8, 9, 12; 1920x1080 takes 2, 3, 4, 5, 6, 8, 10, 12.

## Recipe 2: the outline pass
Paths start at the scene root. A path that walks into a resource (`.../OutlinePass/mesh`) must be the full path: a bare `OutlinePass/mesh` does not resolve.
```
create_node type=MeshInstance3D name=OutlinePass parent=PixelView/SubViewport/Camera3D
set_resource target=PixelView/SubViewport/Camera3D/OutlinePass property=mesh class=QuadMesh
set_property target=PixelView/SubViewport/Camera3D/OutlinePass/mesh property=size value="2 2"
set_property target=PixelView/SubViewport/Camera3D/OutlinePass/mesh property=flip_faces value=true
set_property target=PixelView/SubViewport/Camera3D/OutlinePass property=extra_cull_margin value=16384   # max: never frustum-culled, also previews in the editor
set_property target=PixelView/SubViewport/Camera3D/OutlinePass property=cast_shadow value=0            # SHADOW_CASTING_SETTING_OFF
set_property target=PixelView/SubViewport/Camera3D/OutlinePass property=gi_mode value=0                # GI_MODE_DISABLED: kept out of GI bakes
write_file path=res://shaders/pixel_outline.gdshader content=<the shader below, verbatim>
set_resource target=PixelView/SubViewport/Camera3D/OutlinePass property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/Camera3D/OutlinePass/material_override property=shader resource=res://shaders/pixel_outline.gdshader
set_property target=PixelView/SubViewport/Camera3D/OutlinePass/material_override property=render_priority value=-128   # RENDER_PRIORITY_MIN, see Traps
save_scene
```

The shader (`res://shaders/pixel_outline.gdshader`):
```glsl
shader_type spatial;
// Pixel-art outline pass: depth jumps get a dark silhouette line, normal creases a light inner line.
// Adapted from Eduardo Schildt's 3DPixelArt_Tutorial (MIT, 2025). normal_edge() is Kody King's
// normal edge indicator from the three.js pixel post-processing example (MIT).
render_mode unshaded, fog_disabled;

uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform sampler2D normal_tex : hint_normal_roughness_texture, filter_nearest;

uniform float depth_threshold : hint_range(0.0, 4.0, 0.01) = 0.25; // world units, summed over 4 neighbours
uniform float normal_threshold : hint_range(0.0, 2.0, 0.01) = 0.2;
uniform float line_highlight : hint_range(0.0, 1.0, 0.01) = 0.2; // inner creases get lighter
uniform float line_shadow : hint_range(0.0, 1.0, 0.01) = 0.55; // silhouettes get darker

void vertex() {
	POSITION = vec4(VERTEX.xy, 1.0, 1.0); // cover the screen in clip space; z 1.0 = near plane (reverse-Z, 4.3+)
}

float linear_depth(vec2 uv, mat4 inv_proj) {
	vec4 view = inv_proj * vec4(uv * 2.0 - 1.0, texture(depth_tex, uv).r, 1.0);
	return -view.z / view.w;
}

vec3 view_normal(vec2 uv) {
	return texture(normal_tex, uv).rgb * 2.0 - 1.0;
}

float normal_edge(vec3 n, vec3 neighbor) {
	float side = smoothstep(-0.01, 0.01, dot(n - neighbor, vec3(1.0))); // one side of a crease draws, so lines stay 1 px
	return (1.0 - dot(n, neighbor)) * side;
}

void fragment() {
	vec2 px = 1.0 / VIEWPORT_SIZE;
	vec2 offsets[4] = { vec2(0.0, -1.0), vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(-1.0, 0.0) };
	float mask = ceil(texture(normal_tex, SCREEN_UV).a); // roughness 0.0 opts a surface out of outlines
	float depth = linear_depth(SCREEN_UV, INV_PROJECTION_MATRIX);
	vec3 n = view_normal(SCREEN_UV);
	float depth_edge = 0.0;
	float outer = 0.0;
	float creases = 0.0;
	for (int i = 0; i < 4; i++) {
		vec2 uv = SCREEN_UV + offsets[i] * px;
		float d = linear_depth(uv, INV_PROJECTION_MATRIX);
		depth_edge += clamp(d - depth, 0.0, 1.0); // a farther neighbour: this pixel is on a silhouette
		outer += depth - d; // a nearer neighbour: this pixel sits just outside one
		creases += normal_edge(n, view_normal(uv));
	}
	depth_edge = smoothstep(depth_threshold, depth_threshold + 0.05, depth_edge) * mask;
	float outside = step(depth_threshold * 1.6, outer); // drops the second line a crease would draw next to a silhouette
	float crease = clamp(step(normal_threshold, creases) - outside, 0.0, 1.0) * mask;

	vec3 color = texture(screen_tex, SCREEN_UV).rgb;
	color += clamp(crease - depth_edge, 0.0, 1.0) * line_highlight;
	color -= color * depth_edge * line_shadow;
	ALBEDO = color;
}
```
Where it differs from the video's shader, on purpose: the thresholds are uniforms; `smoothstep(e, e, x)` became `step(e, x)` (GLSL leaves smoothstep undefined when both edges are equal); the roughness mask scales the results instead of the inputs (the original's `normal * 2.0 - 1.0 * mask` is an operator-precedence slip); and `unshaded` replaces the custom `light()` path, so a scene without a light does not turn the screen black.

## The gate: prove it rendered
```
save_scene
assert_scene scene=res://pixel_main.tscn require_types=["SubViewportContainer","SubViewport","Camera3D","MeshInstance3D"]
play_scene scene=res://pixel_main.tscn
wait_until condition=game_connected
game_logs level=error          # a shader compile error shows up here at the first drawn frame (Godot 4.5+; on 4.4 use logs_read level=error)
screenshot
stop_scene
```
In the editor, the 3D tab renders the scene at full resolution through the editor camera (the outline pass shows there too); the 2D tab shows PixelView itself, the pixelated game-camera view, live, as the video does. `screenshot target=editor` captures the one the editor shows: the pixelated view on the 2D screen, the full-resolution editor-camera view on the 3D screen. In the running game, `screenshot viewport=PixelView/SubViewport` returns the game pixels themselves, one PNG pixel per game pixel.

Pass = visible N x N blocks, a dark 1-px line around every silhouette against sky and ground, lighter 1-px lines on box edges and where objects meet the ground, hard-edged shadows, and an empty error log. A green `set_resource` only proves the handler ran: look at the screenshot. (`render_probe` on OutlinePass reports a meaningless winding, because the vertex shader bypasses the transform. Judge the quad by the screenshot.)

## Tuning
| Uniform / property | Default | Raise it when | Lower it when |
|---|---|---|---|
| `depth_threshold` | 0.25 | flat ground or slopes show stripes or noise | silhouettes lose their outline |
| `normal_threshold` | 0.2 | smooth spheres get speckled lines | box edges have no inner line |
| `line_highlight` | 0.2 | inner lines are too faint | inner lines glow |
| `line_shadow` | 0.55 | outlines are too faint | outlines are too heavy |
| `stretch_shrink` (PixelView) | 4 | you want chunkier pixels | detail turns to mush |

`depth_threshold` is in world units, so it depends on the camera's `size`, pitch and projection; the default suits the recipe camera (orthographic, `size` 6, 30 degrees down). Re-tune it whenever those change. Pushed too high (1.5 here), silhouettes lose their dark line and keep only the light crease line.

Tune on the running game without a restart (the `:` walks into the material):
```
runtime_set_property path=PixelView/SubViewport/Camera3D/OutlinePass property=material_override:shader_parameter/depth_threshold value=0.5
runtime_set_property path=PixelView property=stretch_shrink value=6
screenshot
```
Runtime writes die with the game. Keep the value you settled on with `set_property target=PixelView/SubViewport/Camera3D/OutlinePass/material_override property=shader_parameter/depth_threshold value=0.5`, then `save_scene`.

## Shadows: crisp edges that hold still
A sun shadow in this look should end in a clean line of game pixels and keep still while the camera pans and zooms and the sun moves. Four things blur it or make it crawl:
- **An orthographic camera ignores the light's `directional_shadow_max_distance`**: Godot spreads the directional shadow map over the camera's own range instead, from `near` to `far` (`renderer_scene_cull.cpp`). At the default `far` of 4000, one shadow texel covered about 0.2 m of ground and every shadow came out as a soft blob with a 4-5 game-pixel gradient, whatever the filter settings. Set `far` to just past the deepest thing the camera must see (100 in Recipe 1; the example project uses 200). Measured: with `far` 50 the same shadows had hard, stair-stepped game-pixel edges.
- **The ground can sit in a deep slice.** The light's shadows come in four slices of that range (PSSM), each with a quarter of the shadow atlas, cut where `directional_shadow_split_1` to `_3` say, as fractions of the range: 0.1, 0.2 and 0.5 by default. Godot fits each slice's map round a sphere through the slice's corners, so a texel is about the slice's diagonal (width, height and depth) over half the atlas's size, and in a deep slice the depth decides it. An orthographic camera can stand far back without changing the picture, which keeps tall things in front of `near`. With the camera 40 m from the ground and `far` 100, the ground lay in the third slice, 30 m deep, and zoomed in to `size` 4 a texel was 1.5 cm, 0.6 of a game pixel. Recipe 1's camera, 12 m from the ground, gets two slices 10 m deep from the defaults: a texel of 0.8 cm at the default atlas size, a fifth of a game pixel.
- **The engine filters the shadow map over one texel (hardware PCF)**, even at `soft_shadow_filter_quality` 0, so ATTENUATION ramps from shade to light across every edge. A banded `light()` multiplies that ramp into its bands and draws shades between them. Where the light grazes a surface, a texel stretches across it (about 7 times on a wall 8.5 degrees off the sun's rays) and can cover several game pixels, and the ramp draws long soft teeth.
- **A turning sun slides the texel grid.** Godot snaps each slice to its texel grid along the light's axes, so the grid stays put in the world while the camera pans. A sun that turns, as in a day-night cycle, moves the grid, and the stair steps along every edge crawl. Small texels and the cut below keep that to a few pixels.

Hard filtering, a shadow atlas twice the default size, the cut, and the camera script that fits the slices:
```
set_project_setting setting=rendering/lights_and_shadows/directional_shadow/soft_shadow_filter_quality value=0   # 0 = Hard; the game reads both settings at launch
set_project_setting setting=rendering/lights_and_shadows/directional_shadow/size value=8192   # each slice gets 4096 x 4096 texels
write_file path=res://shaders/sunshadow.gdshaderinc content=<the include below>
write_script path=res://pixel_snap_camera.gd content=<the script in Camera motion without shimmer>
attach_script target=PixelView/SubViewport/Camera3D path=res://pixel_snap_camera.gd
```
The camera script's `_fit_shadows()` lays out the slices of every DirectionalLight3D in the SubViewport over the ground in view. The two middle slices take the ground from the view's bottom edge to its top, with `shadow_height` (3 m) above it and a metre below it; the first takes what rises higher, and the last what lies past the top edge. It finds the ground at `ground_depth`, the distance along the view to the ground in the middle of the picture. Left at 0, the script measures it at the start from the camera's height over y = 0: 12 m for Recipe 1's camera. The cuts change only with `size`, the pitch, `near`, `far` and `ground_depth`, so the texels stay where they are in the world while the camera pans or follows a jumping player. Set `ground_depth` again if the camera moves nearer to the ground or further from it.

Every cel shader then passes a directional light's ATTENUATION through `crisp_shadow()`, which cuts the ramp in the middle: each pixel is lit or shaded, and the edge runs where the filtered map puts it, smoother than the map's texels. The ground, grass, flower, trunk and leaf shaders of the foliage packs do this already. In a shader of your own:
```glsl
#include "res://shaders/sunshadow.gdshaderinc"

void light() {
	float fall = LIGHT_IS_DIRECTIONAL ? crisp_shadow(ATTENUATION) : ATTENUATION; // a lamp's ATTENUATION is also its fall-off: keep it soft
	DIFFUSE_LIGHT += clamp(dot(NORMAL, LIGHT), 0.0, 1.0) * fall * LIGHT_COLOR / PI;
}
```
`res://shaders/sunshadow.gdshaderinc`:
```glsl
// The sun's shadow edge for cel shaders (pixel-art-3d). The engine filters a directional light's shadow map over one
// texel, so ATTENUATION ramps across a shadow's edge, and a banded light() draws that ramp as shades between its bands.
// crisp_shadow() cuts it in the middle: every pixel is lit or shaded, and the edge runs where the filtered map puts it.
// Pass it only a directional light's ATTENUATION: another light's also holds its fall-off with distance.

// How dark the light's shadows are: its shadow_opacity, 1 unless you lowered it. To change it while the game runs,
// make this `global uniform float shadow_opacity;` and set it from the script that changes the light.
const float shadow_opacity = 1.0;

float crisp_shadow(float attenuation) {
	if (shadow_opacity < 0.01) { // no shadows to speak of
		return attenuation;
	}
	float shade = (1.0 - attenuation) / shadow_opacity; // 0 in the light to 1 in the shadow, before the opacity
	return 1.0 - shadow_opacity * step(0.5, shade);
}
```
A light whose `shadow_opacity` is below 1 needs the same number in the include: left at 1, the cut draws that light's shadows full black, or none at all when its opacity is under 0.5. For an opacity that changes while the game runs (a moon, a day-night cycle), turn the constant into the global uniform, add it with `set_project_setting setting=shader_globals/shadow_opacity value={"type":"float","value":1.0}`, and call `RenderingServer.global_shader_parameter_set(&"shadow_opacity", light.shadow_opacity)` every frame; the running editor learns a new global only at startup (`pixel-art-3d-foliage`, Traps). Let only one DirectionalLight3D cast shadows at a time, since two share the atlas. A StandardMaterial3D (the toon look below) has no `light()` to cut in, so its edges keep the ramp, narrowed by the finer map and the fitted slices.

The gate, with the sun of `pixel-art-3d-foliage` Recipe 1 in the scene:
```
play_scene scene=res://pixel_main.tscn
wait_until condition=game_connected
game_logs level=error            # a missing include shows as "Tokenizer: Unknown character #35: '#'" (Godot 4.5+; on 4.4 use logs_read level=error)
runtime_get_property path=PixelView/SubViewport/Sun property=directional_shadow_split_3   # about 0.19 with Recipe 1's camera (default 0.5): the camera fitted the slices
screenshot
stop_scene
```
Pass = shadow edges in two shades, lit and shaded, with no row of in-between pixels along them, also on a wall the sun grazes.

The fix was measured in Pixvale, a game built on these packs, on 2026-10-09, with the camera 40 m from the ground, zoomed in to `size` 4, the sun turning at the pace of a 24-minute day and a frame taken every 0.5 s. Next to a wall the sun grazed, 345 game pixels changed from one frame to the next with the default slices, the 4096 atlas and no cut, and 52 with all three changes. The pixels that flicked back a frame later fell from about 60 to 20. A texel there shrank from 1.5 cm to 0.25 cm, a tenth of a game pixel. A 16384 atlas cut that flicker to a third again but took the frame rate from about 114 to 89. The 8192 atlas costs about 100 MB more video memory than the default and no frame rate that could be measured.

Checked again on 4.4.1 and 4.7 in a scene built from these packs (Recipe 1's camera, the sun of `pixel-art-3d-foliage`, a tree, a rock and a post, the grass hidden), with the sun turning 0.125 degrees a frame: the pixels that flicked back fell from about 11 a frame to 2, and from 15 to 2 with the camera 40 m back at `size` 4. For Recipe 1's own camera the fitted slices alone changed nothing; with the camera back they halved the pixels that changed. With the cut, no shade between lit and shaded was left along any shadow edge (46 such pixels before, 172 with the camera back), and a lamp's light came out the same with it as without.

## Optional: the toon look of the example project
Per mesh material (`StandardMaterial3D`, a Resource):
```
set_resource target=PixelView/SubViewport/Box property=material_override class=StandardMaterial3D
set_property target=PixelView/SubViewport/Box/material_override property=diffuse_mode value=3    # DIFFUSE_TOON
set_property target=PixelView/SubViewport/Box/material_override property=specular_mode value=2   # SPECULAR_DISABLED
set_property target=PixelView/SubViewport/Box/material_override property=texture_filter value=0  # BaseMaterial3D TEXTURE_FILTER_NEAREST
```
Two different `texture_filter` enums: on a Control or any CanvasItem NEAREST is **1** (0 means "inherit from parent"); on a BaseMaterial3D NEAREST is **0**.

## Camera motion without shimmer
A camera that moves by fractions of a game pixel makes every still edge crawl. Snap it to the pixel grid in its own right/up axes. Measured with `compare_screenshots` at tolerance 0: a 0.3-pixel pan left the frame identical (0.0% diff) with snapping and changed it (0.15%) without; a 0.6-pixel pan moved the camera exactly one game pixel.
```gdscript
extends Camera3D
## Orthographic camera that only moves in whole game pixels, so still geometry does not
## shimmer while it pans. Move follow_position (from the player, a path, input); never position.
## It also lays the sun's shadow slices over the ground in view (_fit_shadows), so shadow edges stay crisp.

@export var snap := true
@export var ground_depth := 0.0  # metres along the view to the ground in the middle of the picture; 0 = measured at the start
@export var shadow_height := 3.0  # the finest shadow slices reach this far above the ground: walls, trunks, the player
var follow_position: Vector3
var _splits := Vector3.ZERO  # the shadow slices last handed to the lights


func _ready() -> void:
	follow_position = global_position
	if ground_depth <= 0.0:  # the height over y = 0, divided by the sine of the pitch
		ground_depth = global_position.y / maxf(global_transform.basis.z.y, 0.01)


func _process(_delta: float) -> void:
	_fit_shadows()
	if not snap:
		global_position = follow_position
		return
	var texel := size / float(get_viewport().get_visible_rect().size.y)  # world units per game pixel (keep_aspect = KEEP_HEIGHT)
	var axes := global_transform.basis
	var local := axes.inverse() * follow_position  # follow_position measured along the camera's right/up/back axes
	local.x = snappedf(local.x, texel)
	local.y = snappedf(local.y, texel)
	global_position = axes * local


## Lays the shadow slices of every DirectionalLight3D in this viewport over the ground in view. For an orthographic
## camera Godot cuts a light's four slices (PSSM, a quarter of the shadow map each) from `near` to `far`, and its
## default cuts can leave the ground in one slice tens of metres deep, whose texels outgrow a game pixel. Here the two
## middle slices take the ground from the view's bottom edge to its top, with shadow_height above it and a metre below
## it; the first takes what rises higher, the last what lies past the top edge. The cuts follow the zoom and the pitch
## only, so panning leaves the texels where they are in the world.
func _fit_shadows() -> void:
	var pitch := asin(clampf(global_transform.basis.z.y, -1.0, 1.0))  # how far the view looks down
	if pitch < deg_to_rad(10.0):
		return  # nearly level: no ground to fit
	var reach := size * 0.5 / tan(pitch)  # depth from the middle of the view to its top or bottom edge, along the ground
	var rise := 1.0 / sin(pitch)  # depth per metre up or down
	var span := far - near
	var first := clampf((ground_depth - shadow_height * rise - reach - near) / span, 0.01, 0.96)
	var last := clampf((ground_depth + rise + reach - near) / span, first + 0.02, 0.99)
	var splits := Vector3(first, (first + last) * 0.5, last)
	if splits == _splits:
		return
	_splits = splits
	for node in get_viewport().find_children("*", "DirectionalLight3D", true, false):
		var light := node as DirectionalLight3D
		light.directional_shadow_split_1 = splits.x
		light.directional_shadow_split_2 = splits.y
		light.directional_shadow_split_3 = splits.z
```
```
write_script path=res://pixel_snap_camera.gd content=<the script above>
attach_script target=PixelView/SubViewport/Camera3D path=res://pixel_snap_camera.gd
```
Gameplay code then sets `follow_position`, never `position`. Rotating the camera still shimmers: snapping only fixes translation. Panning moves in whole game-pixel steps, which is the look. The script also lays out the sun's shadow slices (see Shadows), which needs `ground_depth` set by hand when the camera does not start at its working distance from the ground.

## Traps
- **Camera outside the SubViewport**: the game renders at full resolution and nothing is pixelated. The camera that draws the world must be a descendant of the SubViewport.
- **Blurry instead of blocky**: `texture_filter` on PixelView left at 0 (inherit). Set 1.
- **Setting the SubViewport `size` by hand** does nothing with `stretch = true`: the container overwrites it. Change `stretch_shrink`.
- **Soft, blobby shadows**: the default camera `far` (4000) with an orthographic camera, not the filter. See Shadows.
- **Shadow edges in teeth, or edges that crawl while the sun turns or the camera zooms in**: the ground lies in a deep shadow slice, the shadow atlas is small, or `light()` multiplies the filter's one-texel ramp into its bands. Raising the light's `directional_shadow_max_distance` changes nothing for an orthographic camera. See Shadows.
- **Transparent objects vanish** (alpha glass, particles, alpha sprites): the outline quad reads the screen texture, so it draws in the transparent pass, and at the default `render_priority` 0 (or at 127) it painted the opaque-only frame over a half-transparent pane, which disappeared. `render_priority = -128` on its ShaderMaterial draws it first, and the pane rendered on top. Transparent objects still get no outline: they are not in the depth or normal buffers.
- **Mobile or Compatibility renderer**: no `hint_normal_roughness_texture`, so the outline shader cannot work there. Keep the pixelation layer and drop Recipe 2, or switch to Forward+.
- **Stripes on flat ground** mean `depth_threshold` is too low for this camera, not a broken shader. Raise it.
- **Mouse picking**: a node inside the SubViewport gets mouse positions in game pixels. `get_mouse_position()` on the SubViewport returned the window's value divided by `stretch_shrink` ((-1839, 482) became (-459.75, 120.5) at N = 4). Feed that one to `Camera3D.project_ray_origin` / `project_ray_normal`; the window's is N times too large.
- **Roughness exactly 0.0 opts a surface out of outlines** (the shader's mask). A 0.0 on a material you wanted outlined explains a missing line.
- `write_script` validates GDScript, not GDShader: a shader typo surfaces only in `game_logs` after `play_scene`, or after `reload_shader path=res://shaders/pixel_outline.gdshader` on a running game.

Confirm exact property names and enum values with `describe_class class=SubViewportContainer` (or `Camera3D`, `GeometryInstance3D`, `BaseMaterial3D`) before relying on them.
