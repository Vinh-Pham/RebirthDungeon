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
