# Phase 3 verification — 2026-09-11 Pacific / 2026-09-12 UTC

Host: macOS 27.0 (26A428), arm64, MacBook Pro / Apple M2 Max. Godot **4.7.2.stable.official.ed1daf0bf**, Compatibility renderer. Content revision **2**; schema, rules, generator and RNG versions **1**. Phantom Camera **0.11.0.3**, State Charts **0.22.5** with the existing Phase 1 compatibility patch, Beckett **1.15.0 Full**. No vendor changes in this phase.

## Automated acceptance

Command from the project root:

```sh
python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot
```

[Verification summary](verification.txt): **PASS**. [Logs](logs/tests-pass.log) retain 105 catalog checks, 333 RNG checks, 56 command checks, addon/shell/loading checks and **60 exploration checks**. The strict wrapper also validates import, headless runtime, the [intentional failure](logs/tests-failure.log) with exit 1 and its expected marker, and five resource packs (615 files each). Script/engine errors cannot pass merely by printing a success marker.

Exploration checks use actual CharacterBody2D motion and NavigationServer2D regions. They cover:

- Spawn after installation synchronization; copied, filtered observations; visible town markers.
- NPC proximity and wall obstruction; panel/focus input blocking.
- Town entrance; blocked unauthorized battle transition; unknown room visibility and routing.
- Out-of-map and revealed-but-disconnected destinations; keyboard wall collision.
- Both discovery boundaries and corridor traversal.
- Stale/duplicate encounter requests; separate fixture entry; no unresolved escape.
- Data-only continuation and after-sync reconstruction, old-player camera cleanup, exactly one encounter removed, both encounters and exit.
- Independent 960×540 and 1920×720 viewports at 30/120 physics ticks per second: movement-speed tolerance, camera-space touch conversion, blocked panel taps and initial/restored hero framing.

Each world has a private navigation map. A newer iteration plus discovered-region ownership probes protects against an early empty-map update. A game-owned PhantomCamera2D subclass uses the actual viewport for limit clamping, with regression checks for the addon’s root-window-size assumption.

## Beckett rendered checks

Beckett authored/validated scripts and scenes, launched the game, dispatched keyboard input, inspected runtime observations and captured frames. Main-scene keyboard traversal reached the dungeon and first encounter; resolving it recreated the world at the recorded location with that encounter removed. The same hero resources were retained.

The excluded `tests/fixtures/exploration_preview.tscn` harness renders the actual Main/world scenes into explicitly sized viewports. Its `resize_preview(width,height,frame_cap)` method supports repeatable framing and frame-cap checks independently of the editor’s embedded game-window aspect. The frame caps are requested caps, not benchmark claims.

- [Compact town, 960×540 / 30 FPS cap](compact-town-30fps.png).
- [Compact doorway reveal, 960×540 / 30 FPS cap](compact-dungeon-30fps.png).
- [Wide gallery and visible sentinel, 1920×720 / 120 FPS cap](wide-dungeon-120fps.png).
- [Separate encounter fixture](encounter-fixture.png).
- [Returned exploration position](return-position.png).
- [Blocking field-notes panel](field-notes.png).

Unknown sanctum art and its sentinel stay hidden until the next doorway approach. UI remains fixed on its CanvasLayer while the world camera moves. Gray letterboxing in preview captures belongs to the test harness’s containing viewport.

## Scope and provenance

The hero, sentinel and floor texture were generated through SpriteCook (36 credits total). Stable asset IDs and saved-file SHA-256 prefixes are retained in [the manifest](../../../assets/art/exploration/spritecook-assets.json). The keeper reuses a tinted hero sprite.

The battle screen is an in-memory transition/outcome fixture. It does not implement dice combat, rewards, services or durable checkpoints. Physics checks use tolerances, not cross-device exact replay. Resource packs are not executable exports: matching templates, SDK/signing, installation and Android/iOS device acceptance remain outstanding as documented in earlier phases.

See [implementation decisions](../../phase3-implementation.md) and [completion tracker](../../project-phases.md).
