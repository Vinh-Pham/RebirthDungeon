# Stylized 3D water: waves, depth colour, refraction, caustics, foam and an underwater view

> One spatial shader on a subdivided plane gives stylized, Sea of Thieves-flavoured water: sharp-crested waves, a colour that follows the real depth under every pixel, ripples that bend the view, light absorbed red first, caustics on whatever is under the surface, and bubbly foam with a dark rim along shores, around anything that pierces the water and on high crests. A screen quad on the camera adds the underwater view with a clean split waterline. Exact node tree, three ready shaders, verified presets, an endless-sea script, the gate, and the traps (a water plane that shadows its own seabed, transparent things that vanish under water, a colour set from "r g b").

## When to use
The user wants an ocean, sea, lake, river or pond in a 3D scene with a stylized look, foam where things meet the water, caustics, a see-through shallow-to-deep gradient, or an underwater camera; or asks to reproduce gameidea.org's "Creating a Stylized 3D Water Shader" (February 2026). This pack follows that walkthrough's techniques (depth under the surface, refraction with a ghosting guard, per-colour light absorption, projected caustics, cell-noise foam with a dark edge, an underwater screen quad), but every line of code here was written for Beckett: the article's site license lets you use its snippets in your own game but forbids redistributing them, and its wave function is TDM's "Seascape" from Shadertoy, licensed CC BY-NC-SA 3.0 (no commercial use). Companion packs: `shaders` (GDShader basics), `node3d` (meshes, materials, lights), `renderer-tuning`, `viewport-camera`.

## Version and renderer
- **Godot 4.3+.** The underwater quad places itself on the near plane in clip space, which is z = 1 in the reversed-Z depth buffer 4.3 introduced. Verified with these exact tool calls on 4.4.1, 4.6.2 and 4.7.
- **Forward+ and Mobile** render it identically. **Compatibility** works too (depth, refraction, foam, caustics and the split waterline all behave; the shaders switch clip-space conventions with `CURRENT_RENDERER`), but it renders brighter and more saturated: take `shallow_color` and `deep_color` down a step there.

## How it works
1. **Waves.** The vertex shader lifts a subdivided `PlaneMesh` by a sum of sharp-crested waves (`exp(sin)`, so crests are pointed and troughs wide) travelling in a fan of directions at real deep-water speeds; each wave nudges where the next, smaller one is sampled, which crowds small waves onto the crests. The fragment shader adds more, smaller waves for the lighting only.
2. **What is under each pixel.** The depth buffer gives the point the opaque pass drew behind the water. From it come two numbers: how much water stands over that point (`column`, vertical, for foam and caustics) and how far light travels through water to the eye (`path`, for absorption).
3. **Colour.** The screen texture (the scene without the water) is sampled a little off-centre where ripples tilt the surface, never from something in front of the water. Light is absorbed per colour channel over `path` (red is gone first), and what is lost becomes `deep_color`.
4. **Caustics.** Two drifting layers of a cell-noise texture are projected straight down onto the underwater point and fade with `column`.
5. **Foam.** Where `column` is small (shores, anything poking through) and on the highest crests, a warped, drifting cell pattern is cut at a threshold into clumps; a band just outside the cut is the dark rim, and smaller cells inside make bubbles.
6. **Underwater.** A screen-sized quad on the camera decides, per pixel, whether the view starts below the waves a short distance in front of the lens. Those pixels are fogged and tinted by the real distance to what they show; the rest is discarded, so a half-submerged camera gets a sharp, moving waterline.

## Node tree
```
Main (Node3D)                          scene root (any 3D scene: a level, an island, a test pool)
├─ Water (MeshInstance3D)              mesh = PlaneMesh (subdivided), material_override = ShaderMaterial(water.gdshader)
│                                      cast_shadow OFF; its Y is the water level; no rotation, Y scale 1
├─ Camera3D
│  └─ Underwater (MeshInstance3D)      optional: mesh = QuadMesh 2x2, material_override = ShaderMaterial(underwater.gdshader)
└─ the world: terrain, seabed, props  anything opaque under or through the surface gets refraction, foam and caustics
```
Files: `res://shaders/water_waves.gdshaderinc` (the wave field both shaders include), `res://shaders/water.gdshader`, `res://shaders/underwater.gdshader`, `res://shaders/caustics.tres` (a generated `NoiseTexture2D`, no download). `PlaneMesh`, `QuadMesh`, `ShaderMaterial` and `NoiseTexture2D` are Resources (`set_resource`); the rest are Nodes.

The recipes below use the test pool's names: root `Main`, camera `Camera3D`. In a real scene use its root name for `parent=` and the path of the camera that renders. Nothing to look at yet? Build "A test pool" (further down) first, then Recipes 1 to 3.

## Recipe 1: the shader files (once per project)
```
write_file path=res://shaders/water_waves.gdshaderinc content=<the wave field below, verbatim>
write_file path=res://shaders/water.gdshader content=<the surface shader below, verbatim>
write_file path=res://shaders/underwater.gdshader content=<the underwater shader below, verbatim>
write_file path=res://shaders/caustics.tres content="[gd_resource type=\"NoiseTexture2D\" load_steps=2 format=3]\n\n[sub_resource type=\"FastNoiseLite\" id=\"FastNoiseLite_caustics\"]\nnoise_type = 2\nfrequency = 0.014\nfractal_type = 0\ncellular_return_type = 4\ndomain_warp_enabled = true\ndomain_warp_amplitude = 40.0\ndomain_warp_frequency = 0.008\n\n[resource]\nwidth = 512\nheight = 512\ninvert = true\nseamless = true\nnoise = SubResource(\"FastNoiseLite_caustics\")\n"
rescan_filesystem
```
The caustics texture is FastNoiseLite cellular noise (`noise_type` 2 = TYPE_CELLULAR, `fractal_type` 0 = none, `cellular_return_type` 4 = DISTANCE2_SUB, the distance between the two nearest cells), inverted so cell borders are bright, with domain warp so the borders curve. Any grayscale caustics texture works in its place.

The shared wave field (`res://shaders/water_waves.gdshaderinc`):
```glsl
// Wave field shared by water.gdshader and underwater.gdshader. Each material keeps its own copy
// of these uniforms: give both the same values, or the underwater waterline drifts off the waves.
group_uniforms waves;
uniform float wave_height : hint_range(0.0, 4.0, 0.01) = 0.9; // metres, about trough to crest of the swell
uniform float wave_length : hint_range(1.0, 100.0, 0.1) = 16.0; // metres, the longest wave
uniform float wave_speed : hint_range(0.0, 4.0, 0.01) = 1.0; // 1 = deep-water speed for that length
uniform float wave_angle : hint_range(-180.0, 180.0, 1.0) = 30.0; // degrees the waves travel toward (0 = +X, 90 = +Z)
uniform float wave_spread : hint_range(0.0, 3.14, 0.01) = 1.1; // radians the directions fan out around wave_angle
uniform float wave_peak : hint_range(0.1, 6.0, 0.01) = 1.6; // crest sharpness: low = rolling swell, high = pointed crests
uniform float wave_chop : hint_range(0.0, 1.0, 0.01) = 0.35; // big waves bunch the small ones on their crests
uniform int wave_count : hint_range(1, 16) = 6; // waves that move the mesh
uniform int detail_count : hint_range(0, 32) = 12; // extra smaller waves, for the lighting only
group_uniforms;

const float WAVE_FALLOFF = 0.6; // each wave is this much lower than the one before it
const float WAVE_SHRINK = 1.33; // and this much shorter

// Height of the surface above its rest level, in metres, at world (x, z) = p.
float water_height(vec2 p, float t, int count) {
	float k = 6.2831853 / wave_length;
	float amp = 1.0;
	float sum = 0.0;
	float base = radians(wave_angle);
	for (int i = 0; i < count; i++) {
		// golden-ratio steps scatter the directions across the fan without repeating
		float a = base + wave_spread * (fract(float(i) * 0.618034) * 2.0 - 1.0);
		vec2 dir = vec2(cos(a), sin(a));
		float phase = dot(dir, p) * k - sqrt(9.81 * k) * wave_speed * t + float(i) * 2.4;
		float crest = exp(wave_peak * (sin(phase) - 1.0)); // 1 on a crest, near 0 in a trough
		sum += crest * amp;
		// slide the sample point down this wave's slope: the smaller waves crowd onto its crests
		p -= dir * (wave_peak * cos(phase) * crest) * (amp * wave_chop / k);
		k *= WAVE_SHRINK;
		amp *= WAVE_FALLOFF;
	}
	return wave_height * (sum * (1.0 - WAVE_FALLOFF) - 0.35);
}
```

The surface (`res://shaders/water.gdshader`):
```glsl
shader_type spatial;
// Stylized water surface: waves, depth tint, refraction, light absorption, caustics and foam.
// Written for Beckett's water-3d skill pack. The look follows gameidea.org's walkthrough
// "Creating a Stylized 3D Water Shader" (2026); its code is not used here.
render_mode cull_back, depth_draw_always;

// The wave field shared with underwater.gdshader; change this path if the files move.
#include "res://shaders/water_waves.gdshaderinc"

uniform sampler2D screen_tex : hint_screen_texture, filter_linear, repeat_disable;
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest, repeat_disable;

group_uniforms colour;
uniform vec3 shallow_color : source_color = vec3(0.4, 0.95, 1.0); // tints what you see through shallow water
uniform vec3 deep_color : source_color = vec3(0.03, 0.38, 0.78); // what deep water fades to
uniform vec3 absorption = vec3(0.35, 0.14, 0.08); // light lost per metre of water it crosses: red goes first
uniform float roughness : hint_range(0.0, 1.0, 0.01) = 0.05;
uniform float specular : hint_range(0.0, 1.0, 0.01) = 0.5;

group_uniforms ripples;
uniform float ripple_strength : hint_range(0.0, 4.0, 0.01) = 1.8; // steeper small waves = more sun glints
uniform float refraction : hint_range(0.0, 0.3, 0.001) = 0.06; // how far ripples bend the view underneath
uniform float detail_distance : hint_range(1.0, 500.0, 1.0) = 60.0; // metres: ripples fade out by here (no far sparkle)

group_uniforms caustics;
uniform sampler2D caustics_tex : hint_default_black, filter_linear_mipmap, repeat_enable;
uniform float caustics_scale : hint_range(0.01, 4.0, 0.01) = 0.25; // texture repeats per metre
uniform float caustics_speed : hint_range(0.0, 1.0, 0.001) = 0.04;
uniform float caustics_strength : hint_range(0.0, 4.0, 0.01) = 0.7;
uniform float caustics_sharpness : hint_range(1.0, 16.0, 0.1) = 4.0;
uniform float caustics_depth : hint_range(0.1, 30.0, 0.1) = 5.0; // metres of water before they are gone

group_uniforms foam;
uniform vec3 foam_color : source_color = vec3(1.0);
uniform vec3 foam_edge_color : source_color = vec3(0.02, 0.06, 0.14);
uniform float foam_distance : hint_range(0.0, 4.0, 0.01) = 0.7; // metres of depth where shore foam runs out
uniform float foam_crest : hint_range(0.0, 1.0, 0.01) = 0.3; // how far down the crests foam reaches
uniform float foam_scale : hint_range(0.1, 8.0, 0.01) = 1.5; // foam clumps per metre
uniform float foam_speed : hint_range(0.0, 4.0, 0.01) = 0.7;
uniform float foam_edge : hint_range(0.0, 0.3, 0.005) = 0.1; // width of the dark rim around the foam
uniform float foam_bubbles : hint_range(0.0, 1.0, 0.01) = 0.6; // how much water shows through each bubble
group_uniforms;

varying float swell; // big-wave height at this point, metres above rest

void vertex() {
	vec3 world = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	const float STEP = 0.05;
	float h = water_height(world.xz, TIME, wave_count);
	float hx = water_height(world.xz + vec2(STEP, 0.0), TIME, wave_count);
	float hz = water_height(world.xz + vec2(0.0, STEP), TIME, wave_count);
	VERTEX.y += h;
	NORMAL = normalize(vec3(h - hx, STEP, h - hz));
	swell = h;
}

// pcg2d-style integer hash (Jarzynski and Olano 2020): no sin(), stable on every GPU.
vec2 hash2(vec2 cell) {
	uvec2 v = uvec2(ivec2(cell)) * 1664525u + 1013904223u;
	v.x += v.y * 1664525u;
	v.y += v.x * 1664525u;
	v ^= v >> 16u;
	v.x += v.y * 1664525u;
	v.y += v.x * 1664525u;
	v ^= v >> 16u;
	return vec2(v) * (1.0 / 4294967295.0);
}

float value_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i).x, hash2(i + vec2(1.0, 0.0)).x, f.x),
			mix(hash2(i + vec2(0.0, 1.0)).x, hash2(i + vec2(1.0, 1.0)).x, f.x), f.y);
}

// Distances to the nearest and second-nearest of a jittered grid of points, each circling slowly.
vec2 cells2(vec2 p, float t) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	float d1 = 8.0;
	float d2 = 8.0;
	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 o = vec2(float(x), float(y));
			vec2 r = hash2(i + o);
			vec2 d = o + 0.5 + 0.38 * sin(t + 6.2831853 * r) - f;
			float dd = dot(d, d);
			if (dd < d1) {
				d2 = d1;
				d1 = dd;
			} else if (dd < d2) {
				d2 = dd;
			}
		}
	}
	return sqrt(vec2(d1, d2));
}

float cells(vec2 p, float t) {
	return cells2(p, t).x;
}

// 0..1, high in the middle of a foam clump. Warped so the clumps do not sit on a grid.
float foam_field(vec2 p, float t) {
	vec2 warp = vec2(value_noise(p * 0.4 + t * 0.07), value_noise(p * 0.4 + vec2(17.3, 5.1) - t * 0.05)) - 0.5;
	p += warp * 1.8;
	float big = 1.0 - cells(p, t);
	float small = 1.0 - cells(p * 2.1 + 31.7, t * 1.4);
	return big * 0.7 + small * 0.3;
}

// View-space position of whatever the opaque pass drew at this screen point.
vec3 scene_at(vec2 uv, mat4 inv_proj) {
	float z = texture(depth_tex, uv).r;
#if CURRENT_RENDERER == RENDERER_COMPATIBILITY
	vec4 p = inv_proj * vec4(vec3(uv, z) * 2.0 - 1.0, 1.0);
#else
	vec4 p = inv_proj * vec4(uv * 2.0 - 1.0, z, 1.0);
#endif
	return p.xyz / p.w;
}

void fragment() {
	vec3 world = (INV_VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float dist = length(VERTEX);

	// Ripples: more, smaller waves for the lighting; a wider step further out averages away
	// ripples smaller than a pixel, and past detail_distance only the swell is left.
	vec3 n = normalize((INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz); // the swell, from the vertices
	float detail = 1.0 - smoothstep(detail_distance * 0.5, detail_distance, dist);
	if (detail > 0.0) {
		float e = max(0.02, dist * 0.004);
		int all_waves = wave_count + detail_count;
		float h0 = water_height(world.xz, TIME, all_waves);
		vec2 slope = vec2(water_height(world.xz + vec2(e, 0.0), TIME, all_waves) - h0,
				water_height(world.xz + vec2(0.0, e), TIME, all_waves) - h0) / e;
		vec2 swell_slope = -n.xz / max(n.y, 0.05);
		slope = swell_slope + (slope - swell_slope) * ripple_strength * detail; // scale only the ripples
		n = normalize(vec3(-slope.x, 1.0, -slope.y));
	}
	NORMAL = normalize((VIEW_MATRIX * vec4(n, 0.0)).xyz);

	// What lies behind the surface. The tilt of the surface away from flat bends the view:
	// less in shallow water and far away, and never onto something in front of the water.
	vec3 behind = scene_at(SCREEN_UV, INV_PROJECTION_MATRIX);
	float depth_here = max(0.0, VERTEX.z - behind.z);
	vec3 flat_up = (VIEW_MATRIX * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
	vec2 bend = (NORMAL.xy - flat_up.xy) * refraction * clamp(depth_here, 0.0, 1.0) * clamp(8.0 / dist, 0.0, 1.0);
	vec2 uv = SCREEN_UV + bend;
	vec3 floor_view = scene_at(uv, INV_PROJECTION_MATRIX);
	if (floor_view.z > VERTEX.z) {
		uv = SCREEN_UV;
		floor_view = behind;
	}
	vec3 seen = texture(screen_tex, uv).rgb;
	vec3 floor_world = (INV_VIEW_MATRIX * vec4(floor_view, 1.0)).xyz;
	float column = max(0.0, world.y - floor_world.y); // metres of water standing over that point
	float path = max(0.0, length(floor_view) - dist); // metres the light travels under water to the eye

	// Caustics on whatever is under water: two drifting layers of a cell texture. Sampled outside
	// any branch: a mipmapped texture() inside a per-pixel if has undefined derivatives.
	vec2 cuv = floor_world.xz * caustics_scale;
	float ct = TIME * caustics_speed;
	float c1 = texture(caustics_tex, cuv + vec2(ct, ct * 0.35)).r;
	float c2 = texture(caustics_tex, cuv * 1.31 + vec2(0.37 - ct * 0.55, 0.71 + ct * 0.8)).r;
	float caustic = pow(min(c1, c2), caustics_sharpness) * caustics_strength;
	seen += caustic * step(0.0001, column) * (1.0 - smoothstep(0.0, caustics_depth, column));

	// Light lost on the way through the water: red first, blue last.
	vec3 keep = exp(-absorption * path);
	vec3 water = mix(deep_color, seen * shallow_color, keep);

	// Foam: along shores and around anything that pierces the surface, and on the highest crests.
	// It thins out with distance, and open water skips the noise entirely.
	float shore = 1.0 - smoothstep(0.0, foam_distance, column);
	float crest = smoothstep(1.0 - foam_crest, 1.0, swell / max(wave_height, 0.001) + 0.35); // swell back to about 0..1
	float amount = max(shore, crest) * (1.0 - smoothstep(detail_distance * 0.6, detail_distance * 1.5, dist));
	float soft = max(length(fwidth(world.xz)) * foam_scale * 1.5, 0.01); // edge blur of about a pixel (derivatives taken outside the branch)
	float foam = 0.0;
	float rim = 0.0;
	float body = 0.0;
	if (amount > 0.001) {
		float field = foam_field(world.xz * foam_scale, TIME * foam_speed);
		float cut = 1.0 - amount;
		foam = smoothstep(cut - soft, cut + soft, field);
		// the rim only where foam is thick: around faint crest specks it would leave dark dots on open water
		rim = (smoothstep(cut - foam_edge - soft, cut - foam_edge + soft, field) - foam) * smoothstep(0.1, 0.35, amount);
		// packed bubbles: thin white walls where two cells meet, a little water showing through each middle
		vec2 b = cells2(world.xz * foam_scale * 4.0 + 5.3, TIME * foam_speed * 1.7);
		float inside = smoothstep(0.0, 0.3, b.y - b.x);
		body = foam * (1.0 - foam_bubbles * 0.5 * inside);
	}

	vec3 col = mix(water, foam_edge_color, clamp(rim, 0.0, 1.0));
	col = mix(col, foam_color, body);
	ALBEDO = col;
	ROUGHNESS = mix(roughness, 0.9, foam);
	SPECULAR = mix(specular, 0.05, foam);
}
```

The underwater view (`res://shaders/underwater.gdshader`):
```glsl
shader_type spatial;
// Underwater view for the water-3d pack: a screen quad on the camera that fogs and tints every
// pixel looking out from under the waves and leaves the rest alone, so a half-submerged camera
// gets a clean split waterline.
render_mode unshaded, cull_disabled, depth_test_disabled, depth_draw_never, fog_disabled;

// The wave field shared with water.gdshader; change this path if the files move.
#include "res://shaders/water_waves.gdshaderinc"

uniform sampler2D screen_tex : hint_screen_texture, filter_linear, repeat_disable;
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest, repeat_disable;

group_uniforms underwater;
uniform float water_level = 0.0; // world Y of the Water node
uniform vec3 fog_color : source_color = vec3(0.02, 0.17, 0.23);
uniform vec3 absorption = vec3(0.4, 0.12, 0.07); // light lost per metre the eye looks through
uniform float fog_density : hint_range(0.0, 2.0, 0.001) = 0.12;
uniform float wobble : hint_range(0.0, 0.03, 0.0005) = 0.004; // screen sway
uniform float wobble_speed : hint_range(0.0, 5.0, 0.01) = 0.9;
uniform float waterline_distance : hint_range(0.01, 2.0, 0.01) = 0.25; // metres in front of the camera where above/below is decided
uniform vec3 waterline_color : source_color = vec3(0.75, 0.95, 1.0);
uniform float waterline_width : hint_range(0.0, 0.2, 0.001) = 0.015; // metres; 0 = no line
group_uniforms;

#if CURRENT_RENDERER == RENDERER_COMPATIBILITY
const float NEAR_Z = -1.0; // OpenGL clip space: near plane at -1
#else
const float NEAR_Z = 1.0; // reverse-Z (4.3+): near plane at 1
#endif

varying vec3 eye_world; // where this pixel's view ray crosses a plane waterline_distance in front of the camera

void vertex() {
	POSITION = vec4(VERTEX.xy, NEAR_Z, 1.0); // cover the screen
	vec4 v = INV_PROJECTION_MATRIX * vec4(VERTEX.xy, NEAR_Z, 1.0);
	vec3 p = v.xyz / v.w; // on the near plane, view space
	bool ortho = PROJECTION_MATRIX[3][3] > 0.5;
	p = ortho ? vec3(p.xy, -waterline_distance) : p * (waterline_distance / -p.z);
	eye_world = (INV_VIEW_MATRIX * vec4(p, 1.0)).xyz;
}

vec3 scene_at(vec2 uv, mat4 inv_proj) {
	float z = texture(depth_tex, uv).r;
#if CURRENT_RENDERER == RENDERER_COMPATIBILITY
	vec4 p = inv_proj * vec4(vec3(uv, z) * 2.0 - 1.0, 1.0);
#else
	vec4 p = inv_proj * vec4(uv * 2.0 - 1.0, z, 1.0);
#endif
	return p.xyz / p.w;
}

void fragment() {
	float below = water_level + water_height(eye_world.xz, TIME, wave_count) - eye_world.y;
	if (below < 0.0) {
		discard; // this pixel looks out from above the water
	}
	float t = TIME * wobble_speed;
	vec2 uv = SCREEN_UV + wobble * vec2(sin(SCREEN_UV.y * 23.0 + t), cos(SCREEN_UV.x * 19.0 + t * 1.3));
	vec3 scene = texture(screen_tex, uv).rgb;
	float dist = length(scene_at(uv, INV_PROJECTION_MATRIX)); // metres from the eye, all under water
	vec3 col = scene * exp(-absorption * dist);
	col = mix(col, fog_color, 1.0 - exp(-fog_density * dist));
	if (waterline_width > 0.0) {
		col = mix(col, waterline_color, 0.8 * (1.0 - smoothstep(0.0, waterline_width, below)));
	}
	ALBEDO = col;
}
```

## Recipe 2: the water surface
The node's Y is the water's rest level. 100 m with 249 subdivisions puts a vertex every 0.4 m; keep the spacing under about a tenth of `wave_length` (a coarser grid flattens the shorter waves).
```
create_node type=MeshInstance3D name=Water parent=Main
set_resource target=Water property=mesh class=PlaneMesh
set_property target=Water/mesh property=size value="100 100"
set_property target=Water/mesh property=subdivide_width value=249
set_property target=Water/mesh property=subdivide_depth value=249
set_property target=Water property=cast_shadow value=0                 # SHADOW_CASTING_SETTING_OFF: see Traps
set_property target=Water property=extra_cull_margin value=4.0         # the waves rise above the flat plane's bounds
set_resource target=Water property=material_override class=ShaderMaterial
set_resource target=Water/material_override property=shader resource=res://shaders/water.gdshader
set_resource target=Water/material_override property=shader_parameter/caustics_tex resource=res://shaders/caustics.tres
save_scene
```
Paths start at the scene root; a path that walks into a resource (`Water/material_override`) must be the full path from the root.

## Recipe 3: the underwater view (optional)
The quad goes under the camera that renders. Skip it when the camera never goes under water.
```
create_node type=MeshInstance3D name=Underwater parent=Camera3D
set_resource target=Camera3D/Underwater property=mesh class=QuadMesh
set_property target=Camera3D/Underwater/mesh property=size value="2 2"
set_property target=Camera3D/Underwater property=extra_cull_margin value=16384     # max: never frustum-culled
set_property target=Camera3D/Underwater property=cast_shadow value=0
set_property target=Camera3D/Underwater property=gi_mode value=0
set_resource target=Camera3D/Underwater property=material_override class=ShaderMaterial
set_resource target=Camera3D/Underwater/material_override property=shader resource=res://shaders/underwater.gdshader
set_property target=Camera3D/Underwater/material_override property=render_priority value=1   # after the surface (0)
set_property target=Camera3D/Underwater/material_override property=shader_parameter/water_level value=0.0   # the Water node's world Y
save_scene
```
Any `wave_*` value you change on the Water material, set on this one too (same name, same value): both evaluate the same waves, and that is what puts the waterline exactly on the surface.

## The gate: prove it rendered
```
save_scene
assert_scene scene=res://water_demo.tscn require_types=["MeshInstance3D","Camera3D"]
play_scene scene=res://water_demo.tscn
wait_until condition=game_connected
game_logs level=error            # a shader compile error shows up here at the first frame (Godot 4.5+; on 4.4 use logs_read level=error)
screenshot save_to=res://shots/water_a.png
compare_screenshots baseline=res://shots/water_a.png tolerance=0.0   # a moment later: diff_pct above 0 means the waves move
stop_scene
```
Pass = deep water a saturated blue with lit wave rows toward the horizon and white sun glints; turquoise, see-through water with drifting caustics wherever the bottom is within a few metres; a white foam band with a dark rim hugging every shore and everything that pierces the surface; submerged parts of objects visible, bent and fading with depth; and an empty error log. A green `set_resource` only proves the handler ran: look at the screenshot.

The editor's 3D view draws and animates the water as well (`TIME` runs in the editor), so the look can be judged there without playing: `screenshot target=editor` captures that view while the editor shows its 3D screen, through the editor camera and with its gizmos. The proof is still the running game, since that is what the player sees.

To check the underwater view, put the camera at the surface (`runtime_set_property path=Camera3D property=position value=[0,-0.1,8]` then `property=rotation_degrees value=[0,0,0]`) and screenshot: above the waterline the surface as before, below it the scene fogged in `fog_color` and gently wobbling. The waterline moves with the waves, so it may cover the whole frame or none of it on a given frame; take a couple of shots.

## A test pool
For an empty project, or to try the look before touching a level: a seabed 8 m down, an island with a shallow slope, a floating ring, a post, a half-sunk crate and a sunken ball, sun and sky. The two sky colours at the end make the plane's far edge blend into the horizon.
```
write_file path=res://water_demo.tscn content="[gd_scene format=3]\n\n[node name=\"Main\" type=\"Node3D\"]\n"
open_scene path=res://water_demo.tscn
create_node type=WorldEnvironment name=Env parent=Main
set_resource target=Env property=environment class=Environment
set_property target=Env/environment property=background_mode value=2
set_resource target=Env/environment property=sky class=Sky
set_resource target=Env/environment/sky property=sky_material class=ProceduralSkyMaterial
set_property target=Env/environment/sky/sky_material property=ground_horizon_color value="#3d6f9e"
set_property target=Env/environment/sky/sky_material property=ground_bottom_color value="#0d3a66"
create_node type=DirectionalLight3D name=Sun parent=Main
set_property target=Sun property=rotation_degrees value="-35 -150 0"
set_property target=Sun property=shadow_enabled value=true
create_node type=Camera3D name=Camera3D parent=Main
set_property target=Camera3D property=position value="0 6 11"
set_property target=Camera3D property=rotation_degrees value="-30 0 0"
create_node type=MeshInstance3D name=Seabed parent=Main
set_resource target=Seabed property=mesh class=PlaneMesh
set_property target=Seabed/mesh property=size value="120 120"
set_property target=Seabed property=position value="0 -8 0"
set_resource target=Seabed property=material_override class=StandardMaterial3D
set_property target=Seabed/material_override property=albedo_color value="#c9b27c"
create_node type=MeshInstance3D name=Island parent=Main
set_resource target=Island property=mesh class=SphereMesh
set_property target=Island/mesh property=radius value=7.0
set_property target=Island/mesh property=height value=14.0
set_property target=Island property=position value="12 -4.5 -4"
set_resource target=Island property=material_override class=StandardMaterial3D
set_property target=Island/material_override property=albedo_color value="#c9b27c"
create_node type=MeshInstance3D name=Ring parent=Main
set_resource target=Ring property=mesh class=TorusMesh
set_property target=Ring/mesh property=inner_radius value=1.1
set_property target=Ring/mesh property=outer_radius value=2.4
set_property target=Ring property=position value="-3 0 1"
set_resource target=Ring property=material_override class=StandardMaterial3D
set_property target=Ring/material_override property=albedo_color value="#2333f0"
create_node type=MeshInstance3D name=Pillar parent=Main
set_resource target=Pillar property=mesh class=CylinderMesh
set_property target=Pillar/mesh property=height value=12.0
set_property target=Pillar property=position value="3 -2 -1"
set_resource target=Pillar property=material_override class=StandardMaterial3D
set_property target=Pillar/material_override property=albedo_color value="#e22626"
create_node type=MeshInstance3D name=Crate parent=Main
set_resource target=Crate property=mesh class=BoxMesh
set_property target=Crate property=position value="0.5 -0.2 3"
set_property target=Crate property=rotation_degrees value="0 25 0"
set_resource target=Crate property=material_override class=StandardMaterial3D
set_property target=Crate/material_override property=albedo_color value="#f2e21a"
create_node type=MeshInstance3D name=Ball parent=Main
set_resource target=Ball property=mesh class=SphereMesh
set_property target=Ball property=position value="-0.5 -1.6 4.5"
set_resource target=Ball property=material_override class=StandardMaterial3D
set_property target=Ball/material_override property=albedo_color value="#33d24d"
save_scene
```
The sun shines toward the camera from the far left, which is where the glints come from; light from behind the camera reflects away from it and the water shows almost none.

## Tuning
| Uniform (material) | Default | Raise it for | Lower it for |
|---|---|---|---|
| `wave_height` (both) | 0.9 | rougher sea | calmer water (0.1 to 0.2 is a lake) |
| `wave_length` (both) | 16 | broad ocean swell | short, busy chop |
| `wave_peak` (both) | 1.6 | pointed, toon crests | round, rolling swell |
| `wave_chop` (both) | 0.35 | small waves crowding the crests | evenly spread ripples |
| `wave_angle`, `wave_spread` (both) | 30, 1.1 | | 0 spread = parallel lines of waves |
| `wave_count` (both) / `detail_count` (Water) | 6 / 12 | more varied waves / finer ripple lighting | cost (see Cost) |
| `shallow_color` / `deep_color` (Water) | `#66f2ff` / `#0861c7` | | |
| `absorption` (Water) | `0.35 0.14 0.08` | murkier water, deep colour sooner | clearer water, the bottom seen deeper |
| `ripple_strength` (Water) | 1.8 | more sun glints | glassy water |
| `refraction` (Water) | 0.06 | stronger bending of what is under | a still, clear view |
| `detail_distance` (Water) | 60 | ripples and foam further out | sparkle noise at the horizon |
| `caustics_strength` / `caustics_depth` (Water) | 0.7 / 5 | brighter / reaching deeper | fainter / only the shallows; 0 strength = off |
| `foam_distance` (Water) | 0.7 | wider shore and contact foam | a thin line |
| `foam_crest` (Water) | 0.3 | whitecaps further down the waves | none (0) |
| `foam_scale` (Water) | 1.5 | smaller clumps | bigger clumps |
| `foam_edge` (Water) | 0.1 | a thicker dark rim | no rim (0) |
| `fog_density` / `fog_color` (Underwater) | 0.12 / `#052b3b` | murkier underwater | clearer |
| `waterline_distance` (Underwater) | 0.25 | the split shows over a wider band of camera heights | a split only right at the lens |

Presets, all verified in the test pool (set each value on the material named; `wave_*` on both):

| Uniform | Ocean (defaults) | Tropical lagoon | Murky lake | Stormy sea |
|---|---|---|---|---|
| `shallow_color` | `#66f2ff` | `#9dfff0` | `#9fb36b` | `#7fb8c0` |
| `deep_color` | `#0861c7` | `#0a8a9a` | `#1d3a23` | `#12384a` |
| `absorption` | `0.35 0.14 0.08` | `0.22 0.06 0.05` | `1.2 0.7 1.0` | `0.5 0.25 0.2` |
| `caustics_strength` | 0.7 | 1.0 | 0.0 | 0.7 |
| `wave_height` | 0.9 | 0.4 | 0.12 | 2.4 |
| `wave_length` | 16 | 10 | 5 | 28 |
| `wave_peak` | 1.6 | 1.6 | 1.0 | 2.6 |
| `wave_chop` | 0.35 | 0.35 | 0.35 | 0.6 |
| `wave_speed` | 1.0 | 1.0 | 1.0 | 1.2 |
| `ripple_strength` | 1.8 | 1.8 | 0.8 | 1.8 |
| `foam_crest` | 0.3 | 0.15 | 0.0 | 0.55 |
| `foam_scale` | 1.5 | 1.5 | 1.5 | 1.0 |
| `foam_color` | `#ffffff` | `#ffffff` | `#d9dccb` | `#ffffff` |
| `roughness` | 0.05 | 0.05 | 0.05 | 0.12 |
| Underwater `fog_color` | `#052b3b` | `#0d5560` | `#16281a` | `#0a1f29` |
| Underwater `absorption` | `0.4 0.12 0.07` | `0.25 0.08 0.07` | `1.0 0.6 0.9` | `0.4 0.12 0.07` |
| Underwater `fog_density` | 0.12 | 0.06 | 0.5 | 0.2 |

Value forms, in the editor: colours as `"#rrggbb"` (a colour uniform is a Color, and `"0.5 0.2 0.1"` turned it black), vectors as `"x y z"`:
```
set_property target=Water/material_override property=shader_parameter/deep_color value="#12384a"
set_property target=Water/material_override property=shader_parameter/absorption value="0.5 0.25 0.2"
set_property target=Water/material_override property=shader_parameter/wave_height value=2.4
set_property target=Camera3D/Underwater/material_override property=shader_parameter/wave_height value=2.4
```
On the running game (gone when it stops), the `:` walks into the material; colours as `"#rrggbb"`, vectors as JSON arrays (a `"x y z"` string landed as 0, 0, 0 there):
```
runtime_set_property path=Water property=material_override:shader_parameter/wave_height value=2.4
runtime_set_property path=Water property=material_override:shader_parameter/deep_color value="#12384a"
runtime_set_property path=Water property=material_override:shader_parameter/absorption value=[0.5,0.25,0.2]
screenshot
```

## An endless sea
The waves come from world position, so the plane can follow the camera and the sea never ends: each move is a whole number of grid cells, so every vertex lands where another one was and nothing swims. Measured: with the camera moved about 300 m, the plane sat at (137.2, 0, -252.0), exactly on its 0.4 m grid, with open water to the horizon. Nothing is under the water out there, so it reads as deep.

`res://water_follow.gd`:
```gdscript
extends MeshInstance3D
## Keeps a water plane centred under the camera, so the sea never runs out. The waves come
## from world position, so they stay where they are while the mesh slides; each move is a
## whole number of grid cells, so every vertex lands where another one was (no swimming).

@export var target: Node3D  ## what to follow; empty = the viewport's current camera


func _process(_delta: float) -> void:
	var plane := mesh as PlaneMesh
	var follow := target if target else get_viewport().get_camera_3d()
	if plane == null or follow == null:
		return
	var cell_x := plane.size.x / float(plane.subdivide_width + 1)
	var cell_z := plane.size.y / float(plane.subdivide_depth + 1)
	global_position.x = snappedf(follow.global_position.x, cell_x)
	global_position.z = snappedf(follow.global_position.z, cell_z)
```
```
write_script path=res://water_follow.gd content=<the script above>
attach_script target=Water path=res://water_follow.gd
save_scene
```
The plane's edge is still `size / 2` away from the camera: a larger plane, distance fog, or sky ground colours close to `deep_color` (as in the test pool) hide it.

## Cost
Measured on an RTX 5070 at 1152x648 (Forward+, the test pool, uncapped frame rate, two runs): 0.62 to 0.68 ms a frame with the water, 0.43 to 0.45 ms with it hidden, so the whole effect costs about 0.2 ms there. `detail_count` 4 instead of 12 saved 0.04 to 0.11 ms; switching the foam off (`foam_distance` and `foam_crest` 0) moved the frame time less than the run-to-run noise, because open water already skips the foam noise. Expect several times that on integrated and mobile GPUs: lower `detail_count` first, then `wave_count` (on both materials), then use fewer subdivisions with a shorter plane. Each frame the vertex shader evaluates the waves three times per vertex (about 63,000 vertices in Recipe 2).

## Traps
- **Everything under the water is in shadow**: the plane casts a shadow like any mesh. `cast_shadow = 0` on the Water node (Recipe 2). It still receives shadows, which is right: a post's shadow lies on the water.
- **Rotated or Y-scaled Water node**: the shader adds the wave height in world metres to the local Y and writes the normal without the node's rotation. Keep the node unrotated with Y scale 1; position and X/Z scale are free. The node's world Y is the rest level, and `water_level` on the Underwater material must match it.
- **The waterline floats above or below the surface**: the two materials disagree on a `wave_*` value or on `water_level`. They have separate copies of the wave uniforms.
- **Transparent things vanish under water** (particles, alpha glass, alpha sprites): the screen texture holds only the opaque pass, and the water draws over them with it. Measured with a half-transparent ball half under water: only the dome above the surface showed, and it got no contact foam (it is not in the depth buffer either). Make what must show under water opaque or alpha-scissor.
- **No foam, no caustics, flat deep colour**: the depth buffer has nothing under that pixel (water over the sky, or a seabed that is not opaque). Every effect here reads the opaque geometry under the surface.
- **A colour uniform turned black**: it was set with `"r g b"`. Colours take `"#rrggbb"`; plain vectors (`absorption`) take `"x y z"` in the editor and `[x, y, z]` on the running game.
- **Glassy water with no glints**: the sun is behind the camera. Light toward the camera from the far side, or raise `ripple_strength`.
- **The plane's far edge shows as a dark band**: that is the sky's ground colour beyond the plane. See An endless sea.
- **Compatibility looks brighter** than Forward+ and Mobile with the same values; tune colours on the renderer you ship.
- **The Underwater quad is on the wrong camera**: it must be a child of the camera that renders (the current one). A second camera needs its own quad.
- `write_file` validates nothing in a shader and only warns about folders the editor has not scanned yet: run `rescan_filesystem` after writing into a new folder (Recipe 1), and read shader errors in `game_logs` after `play_scene`, or with `reload_shader path=res://shaders/water.gdshader` on a running game. A moved file breaks the `#include` line in both shaders.
- **Editing a default in a `.gdshader` does not change a water that is already saved**: the editor wrote every uniform's value into the scene, defaults included (seen on 4.6.2). Change values on the material with `set_property ... property=shader_parameter/...`, as in Tuning. (A headless editor writes them as `shader_parameter/... = null` instead, because its stand-in renderer cannot read shader defaults; the game treats null as the default.)

Confirm property names and enum values with `describe_class class=PlaneMesh` (or `QuadMesh`, `GeometryInstance3D`, `ShaderMaterial`, `FastNoiseLite`) before relying on them.
