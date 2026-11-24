# 3D pixel-art light shafts: soft sun streaks over the whole view

> Soft streaks of sunlight in the air over a pixelated 3D scene: broad shafts and thin streaks drifting slowly sideways, drawn by one 2 x 2 quad under the camera like the `pixel-art-3d` outline pass, so a shaft never ends in a hard line at a roof or the ground. Each streak is a sheet along the sun's rays that stays put while the camera moves, and its direction and colour follow the scene's DirectionalLight3D. One shader, the gate, tuning, and the traps (hard edges, no shafts at all, washed-out or yellow light).

## When to use
The user wants light shafts, sun rays, god rays or sunbeams in the air of a 3D pixel-art or toon scene, or the diagonal light of the final shot of the "Stylized Grass & Trees for Pixel Art 3D in Godot 4" video. Build `pixel-art-3d` first (the camera and the outline pass). The scene needs a DirectionalLight3D: `pixel-art-3d-foliage` Recipe 1 adds the warm sun the default `tint` is tuned for. No wind or foliage is needed. Companion packs: `pixel-art-3d`, `pixel-art-3d-foliage`, `pixel-art-3d-grass`, `pixel-art-3d-trees`, `shaders`.

## Version and renderer
- Godot 4.3+ (verified with these exact calls on 4.4.1, 4.6.2 and 4.7). Forward+ for the outline interplay; the shafts shader itself is a plain spatial shader.

## Recipe 1: light shafts
Soft streaks of sunlight in the air over the whole view, broad shafts and thin streaks of different widths drifting slowly sideways: the diagonal light of the demo's final shot. The video leaves it for a later tutorial, so this is this pack's own take. Like the `pixel-art-3d` outline pass it is one 2 x 2 quad under the camera that covers the view and draws over everything, so a shaft never ends in a hard line where it meets a roof or the ground, and it fills the view at any zoom. Each streak is a sheet along the sun's rays, so it stays put in the world while the camera moves. The direction and colour come from the DirectionalLight3D, read in `light()`: turn or recolour the sun and the shafts follow.
```
write_file path=res://shaders/light_shafts.gdshader content=<light shafts shader below>
create_node type=MeshInstance3D name=LightShafts parent=PixelView/SubViewport/Camera3D
set_resource target=PixelView/SubViewport/Camera3D/LightShafts property=mesh class=QuadMesh
set_property target=PixelView/SubViewport/Camera3D/LightShafts/mesh property=size value="2 2"
set_property target=PixelView/SubViewport/Camera3D/LightShafts property=extra_cull_margin value=16384   # it sits at the camera, behind the near plane: never cull it
set_property target=PixelView/SubViewport/Camera3D/LightShafts property=cast_shadow value=0
set_property target=PixelView/SubViewport/Camera3D/LightShafts property=gi_mode value=0
set_resource target=PixelView/SubViewport/Camera3D/LightShafts property=material_override class=ShaderMaterial
set_resource target=PixelView/SubViewport/Camera3D/LightShafts/material_override property=shader resource=res://shaders/light_shafts.gdshader
set_property target=PixelView/SubViewport/Camera3D/LightShafts/material_override property=render_priority value=127   # drawn last, over glass and particles too
```

`res://shaders/light_shafts.gdshader`:
```glsl
shader_type spatial;
// Sun shafts: soft streaks of sunlight in the air over the whole view. Like the pixel-art-3d outline pass it
// is a 2 x 2 quad under the camera, drawn over everything, so a shaft never ends in a hard line at a roof or
// the ground. Each streak is a sheet along the sun's rays: it stays put in the world while the camera moves.
// The direction and colour come from the scene's DirectionalLight3D in light(), so the shafts follow the sun.
render_mode blend_add, depth_test_disabled, depth_draw_never, cull_disabled, shadows_disabled,
	ambient_light_disabled, specular_disabled, fog_disabled;

uniform float intensity : hint_range(0.0, 2.0, 0.01) = 0.25;
uniform vec4 tint : source_color = vec4(0.78, 0.96, 1.0, 1.0); // times the sun's own colour: cools the orange sun of pixel-art-3d-foliage to a soft warm white
uniform float shaft_width = 2.5; // metres across a broad shaft
uniform float streak_width = 0.7; // metres across a thin streak
uniform float coverage : hint_range(0.0, 1.0, 0.01) = 0.55; // share of the view under broad shafts
uniform float streaks : hint_range(0.0, 1.0, 0.01) = 0.2; // brightness of the thin streaks
uniform float shaft_length = 12.0; // metres along a shaft between its brighter and fainter stretches
uniform float drift = 0.12; // metres per second the shafts slide sideways
uniform float shimmer : hint_range(0.0, 1.0, 0.01) = 0.3; // slow breathing of the brightness

varying vec3 ray_point;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) { // smooth value noise
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void vertex() {
	POSITION = vec4(VERTEX.xy, 1.0, 1.0); // the whole view; z 1.0 = near plane (reverse-Z, 4.3+)
}

void fragment() {
	vec4 p = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, 1.0, 1.0);
	ray_point = (INV_VIEW_MATRIX * vec4(p.xyz / p.w, 1.0)).xyz; // where this pixel's view ray starts
	ALBEDO = tint.rgb;
}

void light() {
	if (LIGHT_IS_DIRECTIONAL) {
		vec3 to_sun = normalize((INV_VIEW_MATRIX * vec4(LIGHT, 0.0)).xyz);
		vec3 forward = -INV_VIEW_MATRIX[2].xyz;
		vec3 across = cross(to_sun, forward); // square to the rays and to the view
		float slant = length(across); // 0 when the camera looks straight along the rays
		across /= max(slant, 0.0001);
		vec3 along = cross(forward, across);
		// both axes are square to the view ray, so the whole ray gets one value: a streak in the air, not on the ground
		float x = dot(ray_point, across) + TIME * drift;
		float y = dot(ray_point, along);
		float wide = noise(vec2(x / shaft_width, 0.5)) * 0.8 + noise(vec2(x / (shaft_width * 0.37), 3.5)) * 0.2;
		float broad = smoothstep(1.0 - coverage, 1.4 - coverage, wide); // a long ramp: soft edges, never a line across the grass
		float thin = smoothstep(0.65, 0.95, noise(vec2(x / streak_width, 7.5))) * streaks;
		float stretch = mix(0.3, 1.0, noise(vec2(x / shaft_width * 0.7, y / shaft_length))); // fainter and brighter along a shaft
		float breathe = 1.0 - shimmer * noise(vec2(x / shaft_width * 0.5, TIME * 0.1));
		float shaft = max(broad, thin) * stretch * breathe * smoothstep(0.05, 0.3, slant);
		DIFFUSE_LIGHT += LIGHT_COLOR / PI * shaft * intensity;
	}
}
```

## The gate
```
play_scene scene=res://pixel_main.tscn
wait_until condition=game_connected
game_logs level=error            # Godot 4.5+; on 4.4 use logs_read level=error
runtime_set_property path=PixelView/SubViewport/Camera3D/LightShafts property=material_override:shader_parameter/intensity value=0.0
screenshot save_to=res://shots/shafts_off.png
runtime_set_property path=PixelView/SubViewport/Camera3D/LightShafts property=material_override:shader_parameter/intensity value=0.25
screenshot save_to=res://shots/shafts_on.png
stop_scene
```
Pass = soft diagonal streaks of sunlight across the whole view with no hard edge at any object, and `shafts_on.png` brighter than `shafts_off.png`. Judge that pair by eye: `compare_screenshots` reports any change, and the wind changes the frame too.

## Tuning
| Knob | Where | Default | Effect |
|---|---|---|---|
| `intensity` / `coverage` / `shaft_width` / `streak_width` / `streaks` | light shafts material | 0.25 / 0.55 / 2.5 / 0.7 / 0.2 | brightness, how much of the view the broad shafts cover, broad and thin widths in metres, thin-streak strength (high values on a wide view read as scratches) |
| `shaft_length` / `drift` / `shimmer` / `tint` | light shafts material | 12 / 0.12 / 0.3 / (0.78, 0.96, 1.0) | how often a shaft fades along its length, sideways slide, breathing, and a colour on top of the sun's (the default cools the orange sun; with a white sun use white, or the shafts turn cyan) |

Material values, in the editor (kept in the scene): `set_property target=PixelView/SubViewport/Camera3D/LightShafts/material_override property=shader_parameter/intensity value=0.35`; live on the running game: `runtime_set_property path=PixelView/SubViewport/Camera3D/LightShafts property=material_override:shader_parameter/intensity value=0.35`.

## Traps
- **Light shafts that end in a hard line where they meet a roof or the ground** are beams standing in the world, cut by the depth test. Recipe 1 draws them over everything instead, like the outline pass: keep `depth_test_disabled`. **No shafts at all**: they read their direction and colour from a DirectionalLight3D in `light()`, so a scene without one has none, they fade out while the camera looks straight along the rays, and the quad needs its `extra_cull_margin` (it sits at the camera, behind the near plane).
- **Too much light, or yellow light**: the shafts add light on top of a Filmic grade; `intensity` 0.3-0.45 reads as sun through the air, much more washes the scene out. The sun's orange added to green grass turns yellow, which is why `tint` cools it. A wider view (a larger camera `size`) shows more streaks at once: lower `coverage` there rather than `intensity`.
- **`set_property ... shader_parameter/x` says the material has no such property right after you rewrote that shader's file**: the editor still holds the old code. Push the new code into the loaded shader with `set_property target=<node>/material_override/shader property=code value=<the file's text>`. The game reads the file at launch and is not affected.

Confirm property names with `describe_class class=GeometryInstance3D` (or `QuadMesh`, `ShaderMaterial`) before relying on them.
