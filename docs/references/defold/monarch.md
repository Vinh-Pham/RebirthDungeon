# Monarch

[Upstream documentation](https://github.com/britzl/monarch) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

Use Monarch for Title, CharacterSelect, Town1, Alby, Battle, TreasureRoom, and popup navigation. It manages screen visibility, stack, transitions, and focus, not gameplay rules or saved combat phases.

The upstream dependency example is `https://github.com/britzl/monarch/archive/master.zip`. Replace the moving branch with a verified release/commit archive when installing.

Create one root game object per screen with its collection proxy and Monarch's `screen_proxy.script`, or a collection factory and `screen_factory.script`. Assign a unique screen ID and the component URL. Configure popup flags, preload behavior, and input focus explicitly.

## API and lifecycle

Import `require("monarch.monarch")`. Navigate with `monarch.show(screen_id)`, use the documented `clear` option to avoid duplicate stack entries, and `monarch.back()` to return. Screen registration happens during `init`; defer the first show until registration is complete, for example through a bootstrap message.

For proxy screens, `Timestep below Popup` can pause the underlying world. A paused world does not automatically pause services in the bootstrap collection. Factory-created screens share their owning world, so use explicit simulation gating when required.

Upstream documents that nested screens only work with a factory-created parent: children under a proxy screen cannot receive input. Register world screens and modal popups as siblings in the bootstrap for this project. Keep the persistent HUD outside transient world collections and test its focus ordering.

## Project contract

Only the session service requests gameplay navigation after saving the appropriate checkpoint. Block commands during transitions and clear movement when focus changes. Use focus notifications and explicit cleanup to cancel transient effects/subscriptions. Do not persist the live Monarch stack as the only gameplay checkpoint.

Verify title/resume, battle return position, repeated transitions, popup-on-popup behavior, one active input owner, no duplicate screens/audio, and startup registration order. Reconstruct the intended screen from saved domain state after a restart.

## Consuming project contract

Use the [panel/input contract](../../wmkit.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
