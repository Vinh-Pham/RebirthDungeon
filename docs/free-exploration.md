# Free exploration and separate dice battles

Accepted 2026-09-10. This contract supersedes grid traversal, spatial battle targeting, movement checkpoints, and the one-World-per-run requirement in earlier phase documents. Historical verification remains historical.

## Ownership and time

The application owns an exploration session and at most one battle World. Exploration uses deterministic fixed-point coordinates and explicit 60 Hz steps; frames only interpolate. Battle remains command-driven. The application serializes all mutation on the render thread. Screens own presentation, never sessions. Pure game code imports no Gdx or I/O.

## Navigation and world

Convex center-clearance polygons, stable portal IDs, deterministic A* and funnel paths replace cell movement, occupancy, and FOV. Discovered rooms and their doorway approaches are navigable; hidden actors are omitted from observations. Rooms are assembled through authored connectors with seeded choices, bounded attempts, overlap and reachability checks. NPCs and enemies are stationary in this slice.

## Battle

Visible enemy clicks or unobstructed detection start a separate one-enemy battle. Battle entry is saved before input. Existing dice, costs, effects, statuses and initiative remain; target membership replaces range. Movement and animations never advance battle turns. Victory removes the encounter and returns to the saved location; required encounters unlock the dungeon exit.

## Slice economy

One temporary gold balance and bounded potion supplies precede the full inventory/banking design. Town has dialogue, a potion vendor, free recovery and dungeon access. Purchases and potion use are atomic. Dungeon rewards remain pending until exit; defeat discards pending rewards but preserves unconsumed brought supplies. Recovery clears combat statuses/cooldowns and restores resources. This intentionally supersedes town fees, bags and carried/banked gold for the slice only. Inventory grid design is unaffected.

## Persistence

Only the new version is supported. No legacy conversion. Alternating checksummed bundles include mode, exploration continuation, RNG, hero state, active battle, supplies, pending rewards and operation sequence. Required writes block dependent work on failure; retry rewrites the same result. Periodic movement saves may lose only progress since the last checkpoint on abrupt termination.

## Delivery and verification

Navigation/generation → battle separation → durable transitions/screens → town services → obsolete grid removal. Verify JVM geometry, replays, effects, save continuation and transaction failures; then desktop compilation/runtime, Android packaging/touch, and iOS AOT/runtime. Existing Phase 5 mobile acceptance gaps and Jackson/RoboVM loading blocker remain open until separately verified.

## Verification record (2026-09-10)

[Retained build excerpts and per-suite test counts](evidence/free-exploration/verification.txt).

- `./gradlew :core:check`: **72 tests, zero failures/errors/skips**. Includes combat regressions, convex geometry/clearance, 20-seed real traversal through narrow connectors, discovery, fixed-tick continuation and session transactions. Final run: `/tmp/rebirth-core-final.log`.
- `./gradlew :core:check :lwjgl3:jar :android:checkDebugDuplicateClasses :android:assembleDebug --console=plain --info`: passed, including shared and desktop Kotlin compilation. No runtime dependencies added. Build log: `/tmp/rebirth-final-check.log`.
- Desktop native packaged launcher, 960×540 game viewport: mouse navigation around the town obstacle, shop purchase, entrance, doorway discovery, encounter detection, pre-roll potion, skill selection, keep/reroll and victory return exercised. Fresh process retained faces **1,4,1,1,1**, kept third/fourth dice, one reroll, SP reservation and status duration. [Town](evidence/free-exploration/town.png), [purchase](evidence/free-exploration/shop-purchase.png), [before restart](evidence/free-exploration/battle-before-restart.png), [after restart](evidence/free-exploration/battle-after-restart.png), [victory return](evidence/free-exploration/victory-return.png).
- JVM integration tests complete all required encounters and exit, verify rewards once, defeat/recovery, consumed supplies, damaged-slot recovery, and failed writes during purchase, battle entry and victory. Those full-loop outcomes are automated evidence, not a claim of complete manual desktop acceptance.
- Android `Medium_Phone` emulator: debug APK installed and launcher started; LoadingScreen logged assets ready. Real touch, compact landscape, suspension and screen recreation acceptance remain open.
- `./gradlew :ios:launchIPhoneSimulator --info`: full RoboVM AOT/link/sign succeeded. Automatic opening failed because `Simulator.app` is absent on this Xcode host. Manual `simctl install`/`launch --console` on iPhone SE (3rd generation), iOS 18.2, reproduced `java/lang/BootstrapMethodError` while loading content. [Simulator evidence](evidence/free-exploration/ios-loading-blocker.png). iOS gameplay gate remains blocked; compilation is not runtime acceptance.

The slice uses simple polygon floor rendering and existing placeholder sprites. Patrols, dynamic obstacles, spatial skills, multi-enemy combat, fleeing, full inventory/banking and progression remain deferred as approved. Legacy grid saves are intentionally unsupported. Physical-device and release acceptance remain outstanding.
