# Phase 5: Godot battle UI and input

Implementation and verification: [Phase 5 implementation](phase5-implementation.md), [dated evidence](evidence/phase5/README.md). The [phase tracker](project-phases.md) owns completion status. [UI plan](gameplay/user-interface.md) owns layout and accessibility; [Phase 4](phase4-combat.md) owns rules.

## Composition and state binding

Create a reusable `Battle` scene with cosmetic hero/enemy views and a `CanvasLayer` containing `Control` panels. Compose the five stable die slots, skill/target selection, HP/MP/SP bars, reservations, effect preview, status list, reroll budget and Roll/Reroll/Use Skill/Pass buttons through Containers and a shared Theme. [Godot Containers](https://docs.godotengine.org/en/stable/tutorials/ui/gui_containers.html).

Bind copied observations from the session controller. Views submit intents with the current session/revision; they never sample dice, deduct resources, tick effects or award victories. Animations display already-resolved faces and effects. Skipping animation produces the same state.

## Input and layout

Map keyboard/gamepad actions with InputMap and connect button signals. World input uses unhandled events; modal and panel surfaces explicitly consume their gestures. Gate polling-based movement while UI owns input. Focus must survive panel opening/closing and scene changes safely. [Input events](https://docs.godotengine.org/en/stable/tutorials/inputs/inputevent.html).

Support wide and compact landscape compositions. Keep the selected/locked skill and target, five dice, kept flags, remaining rerolls, cost and commitment consequences visible. Reflow detail text inside scrollable sheets. Validate safe areas, user text scaling, touch targets and focus navigation at runtime.

## Acceptance

- [x] Only legal state-machine actions are enabled, with accessible rejection reasons.
- [x] Keep toggles preserve die identity; reroll cannot submit an empty subset.
- [x] Pre-roll and paid post-roll pass are visibly distinct.
- [x] Repeated clicks, multi-touch and stale view callbacks do not duplicate actions.
- [x] Panels, disabled controls and drag gestures cannot click through to exploration.
- [x] Wide/compact landscape, text scaling and keyboard-only navigation are exercised.
- [x] Reduced/skipped animation changes neither outcomes nor turn timing.
- [x] Simulated save-pending/failure states gate mutation and expose retry without a new roll.

Phase 6 replaces the simulated persistence boundary with real writes and fresh-process continuation tests. Android/iOS acceptance needs Godot exports and actual interaction; an editor or headless pass does not close those gates.
