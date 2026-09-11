# One-shot 3D scene — from a one-line brief to a finished environment

> Entry-point pack for "build me a 3D scene/environment" requests: expand a vague brief into a SceneSpec via defaults (never ask follow-ups), then build phase-by-phase behind RENDER gates. The gates exist because a 3D scene can look wrong for six unrelated reasons and pixels cannot tell you which — prove the geometry is drawn before you tune anything about how it looks.

## When to use
The user asks for a 3D environment, level, diorama, landscape or "scene" rather than gameplay ("a sunlit meadow", "a foggy canyon", "a sci-fi corridor"). For a playable game load `game-oneshot` instead. Companion packs to load as you reach each phase: `node3d`, `shaders`, `renderer-tuning`, `particles3d`, `import-3d`.

Do NOT ask clarifying questions. Every missing detail has a default below. State the expanded spec in one short message, then build.

## Step 1 — expand the brief into a SceneSpec (silently, with defaults)

| Field | Default |
|---|---|
| Ground | one procedural heightfield ~100×100 m, ArrayMesh built in `_ready` |
| Time of day | mid-morning: one DirectionalLight3D, ~35° elevation, warm white |
| Sky | ProceduralSkyMaterial on a WorldEnvironment (never leave the default gray) |
| Vegetation / props | ONE scattered type (MultiMeshInstance3D), a second only after P2 passes |
| Water / FX | only if the brief names it |
| Camera | one slow orbit or dolly path + a `flying` free-look flag the agent can drive |
| Perf budget | 60 fps at 1152×648, under 2000 draw calls |
| Scope cap | 5–8 scripts, ONE scene, ONE shader to start |

Theme reskin: "meadow", "tundra" and "alien desert" are the SAME build — change palette, height amplitude and prop mesh. Structure stays identical.

## Step 2 — build order, and the one rule that matters

```
P0 grey-box   terrain mesh + camera + DirectionalLight3D. NO materials, NO shaders.
P1 material   terrain material/shader + palette.
P2 vegetation scatter props/grass.
P3 water/fx   particles, water, decals.
P4 atmosphere fog, god rays, exposure, tonemap.   <- "make it pretty" starts HERE
P5 camera     the cinematic path + hero shot.
```

> **Do not tune lighting, fog, exposure, tonemap or palette until `render_probe` says the geometry is actually drawn.** Every one of those is a plausible-looking explanation for a mesh that is not on screen at all, and each one you "fix" makes the real cause harder to see. This rule was written after a session spent adjusting fog, exposure, colour space and palette on terrain that had never been rendered for a single frame — the "ground" in the screenshot was sky below the horizon.

## Step 3 — the render gate (binary, never skip)

Run this at the end of EVERY phase. `save_scene` first.

```
play_scene                                  # add on_ready= to restore the camera pose in the same call
wait_until condition=game_connected         # answers "not yet"? call it again
render_probe path=<the mesh this phase added>
screenshot
game_logs level=error
```

Read `render_probe` BEFORE the screenshot. It answers in numbers what the image can only hint at:

| Field | What it means |
|---|---|
| `warnings` | present = the stage that broke, named. Fix that, nothing else. |
| `verdict` | present = geometry reaches the camera; a wrong image is now genuinely a look problem |
| `in_frustum: false` | off-screen. Move the camera or the mesh, do not touch materials |
| `winding.facing_camera: 0` | reversed index buffer — the whole surface is culled (see below) |
| `winding.vs_normals: reversed` | indices and normals were generated with opposite conventions |
| `layers` vs `camera_cull_mask` | no overlap = this camera never draws this node |
| `surfaces[].cull_mode` | `front` in a shader's `render_mode` looks identical to reversed winding |

**P0 gate is the strictest one:** grey untextured terrain must be visible in the screenshot, and `render_probe` must return a `verdict` rather than `warnings`, before you write a single line of material code. A winding bug found here costs 5 minutes against 100 lines of suspects; found at P4 it costs an hour against 2000.

## Triangle winding — the trap that produces zero errors

**Godot treats CLOCKWISE winding as the FRONT face**, the opposite of the OpenGL convention most generator code is written against. Get it backwards and, with the default `cull_mode = back`, the mesh vanishes: no error, no warning, a clean log, `visible = true`, a correct AABB, and a healthy node in `get_remote_tree`. Every signal reads fine.

When hand-building an ArrayMesh, emit each triangle's indices so the face reads clockwise from the side you want visible. The outward normal for a triangle `(v0, v1, v2)` is `(v2 - v0).cross(v1 - v0)` — note the order.

Confirm, do not guess:
- `render_probe path=Ground` → `winding.facing_camera` should be a large fraction of `sampled`, and `vs_normals: agree`
- `set_debug_draw mode=wireframe` then `screenshot` → wireframe ignores culling, so geometry that appears here but nowhere else IS a winding or cull problem
- One-step confirmation: set the material's `cull_mode` to disabled (`2`), or add `render_mode cull_disabled;` to the shader. If the mesh appears, it was winding. Flip the indices and put culling back — shipping with culling off doubles the fragment cost.

## Isolating a bad-looking frame

`set_debug_draw` splits the render into stages so one screenshot eliminates whole classes of cause:

| Mode | Answers |
|---|---|
| `wireframe` | is the geometry there at all (culled, degenerate, zero-scale) |
| `unshaded` | albedo only — clears lighting, fog, exposure and tonemap in one shot |
| `lighting` | light contribution only: is anything actually lit |
| `normal_buffer` | flipped or NaN normals (black or garbage patches) |
| `overdraw` | how many transparent layers you are paying for |

`set_debug_draw mode=normal` restores the real image. Reach for `unshaded` the moment a colour looks wrong: if the albedo is right there but wrong in the real frame, the problem is downstream of the material and no amount of palette editing will fix it.

## Phase notes

**P0 grey-box.** Build the heightfield with `SurfaceTool` or `ArrayMesh` + `add_surface_from_arrays`; call `generate_normals()` rather than writing normals by hand (it also makes `vs_normals` a meaningful cross-check). Camera at human height looking slightly down. One DirectionalLight3D with `shadow_enabled = true`. Nothing else.

**P1 material.** One `StandardMaterial3D` first; only move to a `ShaderMaterial` once the flat version renders. While iterating a `.gdshader`, `reload_shader path=res://shaders/terrain.gdshader` hot-swaps it into the running game — no stop/play/re-place-the-camera round trip. It reports how many live materials it swapped; zero is an error, not a success. Compile errors surface in `game_logs` on the next frame, so read that after every reload.

**P2 vegetation.** `MultiMeshInstance3D` for anything above ~100 copies; `scatter_nodes source=... count=... region=[x,y,z,w,h,d]` for placed props. `visible_instance_count = 0` on a MultiMesh draws nothing while looking perfectly configured — `render_probe` reports it. Gate on `get_performance_monitors target=game duration_s=3` against the budget, not on how it looks.

**P3 water / FX.** Gate on `game_logs level=error` being clean: shader compile errors appear at first draw, not at load.

**P4 atmosphere.** Now, and only now, tune fog, exposure and tonemap. Sub-resource properties need a `:` path: `runtime_set_property path=WorldEnvironment property=environment:volumetric_fog_density value=0.02`. The response echoes `before`/`after` — if they are equal, the write did not land and nothing you do downstream of it means anything.

**P5 camera.** `screenshot save_to=user://shots/hero.png` on each candidate framing so you can compare them against each other instead of against memory.

## Iterating without paying for the restart

A code change means a restart, and a restart resets the camera. Queue the pose with the launch instead of re-issuing it every round:

```
play_scene on_ready=[{"path":"CameraRig","property":"position","value":[12,4,20]},{"path":"CameraRig","property":"flying","value":true}]
wait_until condition=game_connected     # reports whether each on_ready write landed
screenshot
```

Three calls per iteration instead of nine. For anything that does NOT need a restart — material values, light energy, fog — use `runtime_set_property` on the live game and skip the restart entirely.

## Quality bar — done means ALL of these
- `render_probe` on every hero mesh returns a `verdict`, not `warnings`.
- `game_logs level=error` is clean across a fresh 30 s run.
- `get_performance_monitors target=game duration_s=5` meets the budget: `fps.p95` at or above target, `draw_calls` under cap. Measured, never estimated.
- The screenshot has no default-gray sky, no untextured white surface, and readable depth (something near, something far).
- `set_debug_draw mode=wireframe` shows geometry everywhere the final image shows a surface. Restore with `mode=normal` before the hero shot.

## Rules for small models (anti-drift)
- **Never report a phase done without proof from THIS session** — a `render_probe` verdict plus a `screenshot` you actually looked at. A green `set_property` or `save_scene` proves the handler ran, not that anything is visible.
- **One suspect at a time.** When the image is wrong: `render_probe` → `set_debug_draw` → only then change something. Changing two things means learning nothing from the next screenshot.
- **A write is not a fact until it reads back.** `runtime_set_property` returns `before`/`after`; `set_project_setting` reports the stored TYPE. A rendering setting stored as the string `"2"` instead of the number `2` does nothing at all.
- Confirm exact class, property and method names with `describe_class` / `find_methods` before relying on them — 3D APIs shift between Godot versions. `get_godot_version` first.
- Do not add a second shader, a second scattered type, or a second light until the current phase's gate passes.
