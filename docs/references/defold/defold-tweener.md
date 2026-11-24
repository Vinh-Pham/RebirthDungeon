# Defold Tweener

[Upstream documentation](https://github.com/Insality/defold-tweener) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

Use Tweener for callback-driven scalar animation: HUD meters, popup transitions, music gain, and visual feedback. Use native `go.animate` or `gui.animate` where direct property animation is simpler.

The inspected README lists `https://github.com/Insality/defold-tweener/archive/refs/tags/6.zip`. Import `require("tweener.tweener")`. It is timer-based; do not invent an instance `update(dt)` lifecycle. Optional `[tweener] update_frequency` configuration defaults to 60 in the inspected docs.

## Documented API

`tweener.tween(easing, from, to, duration, callback, optional_dt)` starts immediately and returns a handle. Its callback receives `(value, is_final_call, time_elapsed, time_total)`. Easings may be named, functions, supported engine constants, or custom samples.

Use `tweener.cancel(handle)`, `set_pause(handle, paused)`, `is_paused(handle)`, and `is_active(handle)` for lifecycle control. `tweener.ease(...)` evaluates an interpolated value without starting a tween.

## Project contract

Retain all active handles with their owning screen/effect. Cancel before deleting referenced nodes or unloading the screen. A paused proxy and a root-owned tween can have different lifetimes; test pause behavior rather than assuming every effect stops together.

Callbacks only present a committed outcome. A callback must not apply damage, spend resources, award loot, or decide save completion. Carry originating screen/operation IDs and ignore stale callbacks. On reduced motion, set the terminal visual value and release presentation pacing explicitly; cancellation is not a gameplay-completion event.

For audio fades, multiply fade progress by the current user volume/mute settings. The persistent audio service owns track lifetime so transitions cannot create duplicate music. Keep visual shake off collision bodies and use cosmetic randomness.

Verify cancel/unload, pause/resume, reduced-motion completion, changing volume during a fade, and repeated transitions.

## Consuming project contract

Use the [UI feedback/lifecycle](../../gameplay/user-interface.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
