# game/

Flame presentation of the dungeon: `DungeonGame`, the world and its
components, effects, and the bridge that translates domain events into
animations.

Rules:

- Flame components are presentation objects; they never compute
  authoritative gameplay outcomes (no `Random()`, no HP mutation).
- Sprite positions, animation timers, particles, camera, and screen shake
  live here — not in Riverpod.
- Rebuilding or replaying presentation must not change gameplay results.

Layout (Phase 6):

- `dungeon_game.dart` — `DungeonGame`: fixed-resolution pixel camera
  (360×640 logical), subscribes to the run event bus, applies presentation
  events, and syncs structure from run snapshots.
- `dungeon_world.dart` — `DungeonWorld`: rooms, doorways, props, hero, and
  combat monsters. Structure rebuilds from `DungeonRunState`; the hero's
  position is event-driven so moves animate.
- `components/` — room floors (checkered tiles + walls + props), doorway
  tiles, the hero, and monsters (with HP bars, hit flashes, death fades).
- `bridge/` — `EventBridge` (domain `RunEvent` → `PresentationEvent`,
  pure) and the presentation event types.
- `effects/` — floating damage numbers, pixel bursts, camera shake.
- `game_constants.dart` — tile size (16px), room span (8×8 tiles), camera
  resolution, and world-coordinate math.

Rendering uses placeholder pixel shapes until Phase 11 brings sprite
atlases. Input (dice taps, door buttons) still lives in the Flutter
overlays; Phase 7 grows it toward drag/drop and combat pacing.
