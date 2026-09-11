# Mobile & touch — VirtualJoystick, controller gyro, Android export

> Touch input, the built-in on-screen joystick, controller motion sensors (gyro aiming), runtime-drawable textures, and Android packaging (PiP, GABE, embedded window). Most of this is plain `Control` + `Input` + project/export settings — drive it through reflection.

## VirtualJoystick (Control, 4.7+) — on-screen thumbstick
A built-in touch joystick that **feeds four named actions** you assign, so gameplay reads it exactly like any action (no special API — just `Input.get_vector(...)`).
Properties: `action_left` / `action_right` / `action_up` / `action_down` (StringName — the InputMap actions it drives), `joystick_mode` (Fixed / Dynamic / Following), `visibility_mode` (when the stick is shown — confirm the enum via `describe_class`), `deadzone_ratio` (0..1), `clampzone_ratio` (0..1), `initial_offset_ratio`, `joystick_size`, `tip_size`.
- **Fixed** stays where placed; **Dynamic** appears where you first touch inside its area; **Following** re-centers under the dragging finger.
- The four actions must already exist in the Input Map; then any movement code using them works on mobile unchanged.

## Recipe — twin-stick-ready movement (touch + keyboard, one code path)
```
# move_left/right/up/down already defined in the Input Map (see the input skill)
create_node type=CanvasLayer name=TouchUI parent=.
create_node type=VirtualJoystick name=MoveStick parent=TouchUI
set_property target=TouchUI/MoveStick property=action_left value=move_left
set_property target=TouchUI/MoveStick property=action_right value=move_right
set_property target=TouchUI/MoveStick property=action_up value=move_up
set_property target=TouchUI/MoveStick property=action_down value=move_down
set_property target=TouchUI/MoveStick property=joystick_mode value=1   # confirm enum via describe_class
```
Gameplay reads it like normal input: `Input.get_vector("move_left","move_right","move_up","move_down")` — stick, keys, and gamepad all feed the same vector.

## Controller gyro / motion sensors (4.7+) — gyro aiming
Per-controller sensors, distinct from the phone's own `Input.get_gyroscope()`:
- Enable + check: `Input.set_joy_motion_sensors_enabled(device, true)`, `Input.has_joy_motion_sensors(device) -> bool`.
- Read: `Input.get_joy_gyroscope(device) -> Vector3` (angular velocity, rad/s — use for aim), `get_joy_accelerometer(device)`, `get_joy_gravity(device)`.
- Calibrate: `start_joy_motion_sensors_calibration()` → hold the pad still → `stop_joy_motion_sensors_calibration()`; query `is_joy_motion_sensors_calibrated(device)`.
- `Input.ignore_joypad_on_unfocused_application` (bool; project setting `input_devices/joypads/ignore_joypad_on_unfocused_application`, default on) drops gamepad input when the window is unfocused.

## Touch basics
- `InputEventScreenTouch` (`index`, `position`, `pressed`) and `InputEventScreenDrag` (`index`, `position`, `relative`) — multi-touch is keyed by `index`. `input_devices/pointing/emulate_mouse_from_touch` (default on) also synthesizes mouse events from touch.
- Orientation: project setting `display/window/handheld/orientation`, or `DisplayServer.screen_set_orientation(...)` at runtime.
- **Audit touch targets before shipping (1.10+):** `ui_audit touch_min=44` on the running game flags every interactive control under the 44 px platform guideline (plus overlaps/offscreen/mouse-only buttons) — measured from real rects, not eyeballed from a screenshot.

## DrawableTexture2D (Texture2D, 4.7+) — draw onto a texture at runtime
For minimaps, fog-of-war, in-game paint: `setup(width, height, format)`, `blit_rect(src: Image, src_rect: Rect2i, dst: Vector2i)`, `blit_rect_multi(...)`, `generate_mipmaps()`, `set_use_mipmaps(bool)`. Assign it to any `texture` slot — cheaper than rebuilding an `ImageTexture` on every change. Confirm exact arg types with `describe_class class=DrawableTexture2D`.

## Android packaging (4.7) — export/platform, not script API
Configure via Project → Export (inspect with `list_export_presets`) and project settings:
- **Picture-in-Picture** rendering support (Android export option).
- **GABE** (Godot Android Build Environment): build, export — and now publish — entirely on-device.
- **Embedded, movable/resizable** game window; customizable splash screens via export options.
- **Java interface implementation in GDScript** (call/extend Android Java APIs from GDScript).
- Perfetto is the default profiling backend on Android.

## Version note
- VirtualJoystick, per-controller motion sensors (gyro), DrawableTexture2D, and the Android items above are **all new in Godot 4.7** — guard with `get_godot_version` and verify each class with `describe_class`. On ≤4.6, build a touch joystick by hand from `Control` + `InputEventScreenTouch/Drag`.
- Phone hardware sensors (`Input.get_gyroscope()` / `get_accelerometer()` / `get_magnetometer()`) exist since 3.x — distinct from the per-controller `get_joy_*` sensors added in 4.7.

## Common traps
- VirtualJoystick drives **actions**, not a property you poll — wire `action_*` to real Input Map actions or it does nothing. Read movement via `Input.get_vector(...)`, same as keyboard.
- Put a `VirtualJoystick` under a `CanvasLayer`/`Control` UI so the game camera doesn't move it.
- `get_joy_gyroscope` returns zeros until `set_joy_motion_sensors_enabled(device, true)` AND the pad actually reports sensors (`has_joy_motion_sensors`) — many controllers don't.
- The on-device build / PiP / embedded-window features need 4.7 export templates; they're export/runtime concerns, not class APIs.

Confirm exact class, property, and method names with `describe_class` (e.g. `describe_class class=VirtualJoystick`, `class=DrawableTexture2D`) and `get_godot_version` before relying on them — these are new in 4.7.
