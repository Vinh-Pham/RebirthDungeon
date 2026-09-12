# Phase 3: Godot exploration and encounter triggers

Specification reset **2026-09-10**. Completion is tracked in [Project phases](project-phases.md); see [implementation and verification](phase3-implementation.md). [Free exploration](free-exploration.md) owns behavior; this document specifies engine integration.

## Scene composition

Create a player scene with `CharacterBody2D`, collision shape, sprite/animation, `NavigationAgent2D` and camera as appropriate. Room scenes contain `Node2D` art, wall collision, `NavigationRegion2D` polygons, connector markers and `Area2D` interaction/encounter triggers. Tile art may use `TileMapLayer`; movement remains continuous.

Direct movement and click/tap routes feed the same collision body. Set velocity in `_physics_process()` and call `move_and_slide()`; do not multiply velocity by delta a second time. Query the agent's next path point once per active physics update, stop on completion, and wait for navigation-map synchronization after room installation before querying. [2D movement](https://docs.godotengine.org/en/stable/tutorials/2d/2d_movement.html), [Navigation agents](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_using_navigationagents.html).

## Interaction and discovery

Use InputMap actions and a world input adapter. UI-owned gestures, blocking panels and held-key polling cannot move the hero. Resolve clicks in world coordinates through the current camera. A selected NPC or enemy means approach its interaction point, then revalidate distance, visibility, obstruction and session revision.

Reveal rooms at authored discovery boundaries. Gate navigation destinations and visible actor observations accordingly. Town is fully visible. Stable room/connector/encounter IDs survive scene recreation; Node instance IDs do not.

An encounter trigger requests a guarded transition, stops exploration and captures its continuation. The battle integration arrives in Phases 4–6; a Phase 3 trigger test does not certify combat or durability. Victory later removes only the resolved encounter and returns to the saved position. Multiple overlap signals must never enqueue duplicate entries.

## Acceptance

- [x] Authored town and dungeon load; player can traverse rooms with keyboard and click/tap intent.
- [x] Collision and navigation agree through the narrowest supported connector.
- [x] Unreachable and out-of-map targets stop safely; no wall crossing or teleporting.
- [x] Discovery hides unknown rooms/actors and forbids paths through unrevealed space.
- [x] NPC interaction revalidates proximity; encounter overlap emits one request.
- [x] Panels, focus loss and transitions stop held movement and cancel gestures.
- [x] Position/discovery continuation exports without scene references and restores after navigation synchronization.
- [x] Runtime checks cover varied frame rates and resizing; no cross-device bit-exact movement claim.

Exact deterministic fixtures apply to semantic outcomes and battle rules, not Godot floating-point physics trajectories.
