# Battle presentation implementation

The battle HUD stays alive across accepted commands. It displays copied application observations and sends session/revision-stamped intents; the Phase 4 resolver and manual enemy scheduler still own every gameplay effect. Completion status is maintained in [the tracker](project-phases.md#phase-5-battle-hud-state-flow-and-camera-staging).

## Ownership

- `scenes/battle/battle.tscn` and `scripts/presentation/battle_view.gd` compose the CanvasLayer HUD with Containers and a shared Theme. Five named die buttons retain identity across selection, keeping, rerolls and accepted results.
- `scripts/application/battle_observation.gd` projects authored skills, ranks, legal targets, weights/odds, costs, reservations, availability and shared-resolver previews. Inspection includes resources, shield, status source/duration, effect arithmetic and rejection reasons.
- `scripts/presentation/battle_flow.gd` builds an actual Godot State Charts compound state with Selection, Locked, Resolved, Enemy, Outcome, Saving and SaveFailed states. Expression guards authorize only the phase projected from an accepted observation. Resolved is cosmetic; serial-guarded deferred settling cannot spend resources or schedule AI.
- `scripts/application/main.gd` publishes accepted candidates into the persistent view, and rejects obsolete weak references and session/revision tokens. A view-local latch blocks repeated gestures before the deferred command handler runs; rejection also releases that latch after focus loss.
- `scripts/application/checkpoint_test_adapter.gd` is an in-memory test boundary. Its default path publishes immediately. Development fixtures can retain a pending candidate or simulate failure. Retry publishes that exact candidate and RNG state without resolving the command again. View replacement reconstructs the same pending/failure gate. There is no disk persistence in this phase.

## Camera and presentation lifetime

`scenes/battle/stage.tscn` renders the existing hero/sentinel/floor assets in a private World2D/SubViewport. Its Camera2D has a real PhantomCameraHost; Wide priority 20 yields to Detail priority 30 for a selected target, with inactive Detail at 10. Exploration nodes and cameras are removed on battle entry and reconstructed on return.

The game-owned `battle_camera_host.gd` subclass finishes the pinned addon's own interpolation for Skip motion because version 0.11.0.3 has no public immediate-finish method. It does not independently write camera transforms. This small protected-API dependency must be reviewed when upgrading Phantom Camera. Tween Resources are local to each scene instance. Sprite tweens are killed on skip/teardown and never gate command publication, enemy scheduling or rewards.

No new raster assets were necessary. Existing licensed art and the shell font are reused; no Sprite AI generation was requested.

## Input, layout and preferences

Keyboard Tab/arrows, controller D-pad, Enter/A, and touch activate ordinary focusable buttons. Number keys 1–5 keep/release the corresponding stable die. Escape/controller B opens inspection or closes the current sheet. Modal focus is confined to its enabled buttons and returns to the previous legal opener. Page up/down buttons support controller and touch inspection; Page Up/Down keys scroll the same sheet.

One touch pointer owns a gesture. Secondary fingers never inherit it, even when the first command has already published. Dragging more than 12 logical units cancels button activation; dragging within a sheet scrolls it. The full HUD and modal surfaces consume input, and exploration is detached during battle.

The HUD reflows according to usable viewport size and text scaling. Wide layout includes a scrollable inline inspector; compact layout uses sheets. Skill/target, five dice, rerolls, costs and commitment controls remain visible. Buttons are at least 48 logical units high. The tested minimum is 960×540 landscape with 100%, 130% and 140% text; 1920×1080 uses the wide composition. Both HUD and modal margins apply safe-area insets. At the smallest viewport with largest text the cosmetic stage shrinks to preserve controls.

Text scale and reduced-motion preferences persist across battle-view replacement within Main. Disk-backed settings, fresh-process recovery, actual mobile safe-area behavior and mobile installation remain later-phase work.

## Verification

[Retained Phase 5 evidence](evidence/phase5/README.md) records the headless matrix, rendered Beckett playtest, save/retry scenario, input/focus checks and resource-pack exclusions. `tests/integration/battle_ui_fixture.gd` runs through the real Main, State Charts and Phantom Camera adapters. `tests/fixtures/battle_preview.tscn` provides an excluded rendered harness for exact viewport sizes; it is not a shipping entry point.
