# Druid

[Upstream documentation](https://github.com/Insality/druid) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

Use Druid for character forms, buttons, lists, meters, the HUD, inventory, and dialogue choices inside Defold GUI scenes. It supplies components and interaction behavior; author layouts in `.gui` resources.

The inspected README lists Druid `1.3.1` and Defold Event `16` as dependency examples:

- `https://github.com/Insality/druid/archive/refs/tags/1.3.1.zip`
- `https://github.com/Insality/defold-event/archive/refs/tags/16.zip`

These are documented examples, not an installed or compatibility-tested project lock. Quest lists a different Event version. Choose one shared Event revision and test both consumers before pinning it.

## API and lifecycle

Import `require("druid.druid")`. Create one instance with `druid.new(self)` in each owning GUI script. Components include `self.druid:new_button(node_id, callback)` and `self.druid:new_text(node_id, text)`.

Forward `update(dt)`, `on_message(message_id, message, sender)`, and `on_input(action_id, action)` to the instance. Return the input handler's result so consumed events do not reach the world. Call `self.druid:final()` from the GUI script's `final` callback.

The library expects the built-in all-input bindings by default; merge the required bindings or explicitly configure its action mapping. The current project has only mouse `touch`. Druid automatically acquires focus for input components; coordinate focus with Monarch rather than duplicating focus acquisition without a test.

## Project contract

Controls submit domain commands. Druid stores only transient focus, form edits, selection, and animation state; HP, inventory, and quest completion come from committed snapshots. Disabled buttons improve feedback but do not replace command guards. Resize GUI layouts and HUD reservation together.

Verify text entry, scrolling, keyboard focus, popup input consumption, resize/high DPI, repeated opening/closing, and finalization. Check controls at 1280×720 and 1024×768 and ensure clicking GUI never starts world movement.

## Further documentation

- [Basic usage](https://github.com/Insality/druid/blob/master/wiki/basic_usage.md)
- [Advanced setup and input bindings](https://github.com/Insality/druid/blob/master/wiki/advanced-setup.md)

## Consuming project contract

Use the [UI contract](../../gameplay/user-interface.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
