# Turn-based slice verification — 2026-09-19

The first playable Kotlin slice is implemented. This record distinguishes verified behavior from remaining native gates; it does not claim full platform acceptance. See [tracker](../../turn-based-plan.md) and [architecture](../../kotlin-architecture.md).

## Automated checks

On macOS with the repository Gradle 9.5.1/JDK 25 configuration:

- `./gradlew :core:check :lwjgl3:compileKotlin --console=plain --info` — passed, **72 tests, zero failures/errors**, including simulation boundary and formatting checks.
- `./gradlew :core:check :lwjgl3:jar :android:checkDebugDuplicateClasses :android:assembleDebug --console=plain --info` — passed. This run covered final production changes with 69 tests; the subsequent run above adds three passing failure/deferred-opening tests. No production changes separate these checks.
- `./gradlew :ios:launchIPhoneSimulator --console=plain --info` — full RoboVM AOT/link/sign passed. This build preceded the final Wait-event/log-label/F12 refinements; it is scoped evidence for the migrated battle implementation, not an acceptance build of those later presentation refinements.
- `git diff --check` — passed after documentation updates.

[Per-suite totals and build excerpts](verification.txt) retain results. Tests exercise fixed initiative/ties, all mastery cost/recovery bands, shared previews, command rejection, cooldown/status timing, potion allowance, exhaustion/Wait, enemy policy, event and RNG continuation, 20 seeded save/restore sequences, entry/start/item/action/AI/terminal/return failure retry, partial writes/read-back failure, unsupported-save preservation and compatible damaged-slot fallback. Full-expedition integration covers rewards, return position, purchases, defeat and town recovery. Tests do not launch Gdx/OpenGL/native SDKs.

## Desktop interaction

Launched the packaged LWJGL3 application with an isolated `REBIRTH_CHECKPOINT_DIR=/tmp/rebirth-turn-native-final`. A stable copy of the jar under `/tmp` avoided replacing the running archive during builds. Normal player saves were not changed.

Verified native mouse interaction: title → town → buy two health potions → explore → encounter; inspect fixed order and fractional SP; Attack confirmation and damage; health potion without ending the turn; second-item lockout; quit/relaunch and resume that exact turn/allowance; Defend; Spark confirmation and execution; saved scrollable combat log; victory return to exploration with pending gold and preserved resources; entry to the next encounter.

| Evidence | Observation |
| --- | --- |
| [Battle](battle.png) | Initial hero/enemy state, captured order and actions |
| [Item used](item-used.png) | Potion restores HP and consumes the allowance without advancing the turn |
| [Item restored](item-restored.png) | Process restart preserves round/turn, resources and used allowance |
| [Combat log](combat-log.png) | Ordered saved history remains browsable after restart |
| [Compact battle](compact-battle.png) | Resized 683×425 content viewport retains action controls; combat illustration is obscured by HUD |

Attack against the starter enemy deals 11; Spark preview/resolution deals 23 for 5 MP. Native victory returned at 64/90 HP with 10 pending gold. Full expedition and recovery acceptance is automated; native exhaustion/Wait, full expedition exit, touch and suspension are still open. Screenshots precede final log wording/target-label cleanup. The compact confirmation was usable after resizing, but the illustration overlap remains a presentation limitation requiring refinement before compact/mobile acceptance.

## Android

Debug duplicate-class verification and APK assembly passed. `adb devices -l` reported no connected device. No Android gameplay, touch, suspension, recreation, physical-device or release result is claimed.

## iOS

Xcode **27.0 (27A5194q)**; iPhone SE (3rd generation), **iOS 18.2**, simulator `A82CC7EB-DEEE-4393-A3D8-1992B1B003A5`.

The Gradle task completed AOT/link/sign. Automatic `open -a Simulator` failed under Xcode 27's Simulator/DeviceHub change. Explicit installation and launch used:

```sh
xcrun simctl install A82CC7EB-DEEE-4393-A3D8-1992B1B003A5 ios/build/robovm.tmp/IOSLauncher.app
xcrun simctl launch --console A82CC7EB-DEEE-4393-A3D8-1992B1B003A5 cloud.vinh.rebirthdungeon
```

The application loaded 10 assets and displayed **Platform runtime dependency unavailable: java/lang/BootstrapMethodError**. [Simulator screenshot](ios-loading-blocker.png) records the existing Jackson/RoboVM loading blocker. AOT is verified; loading into gameplay is not. Next action is to diagnose the native dependency/runtime linkage, then repeat the build and landscape gameplay/lifecycle checks with final sources. Physical-device and release verification remain open, preserving historical Phase 5 gates.

## Scope and remaining work

New saves only: content schema/content/rules 3/4/3, session 4, battle 3, combat record 2, envelope 2. Unsupported saves remain untouched. No dependencies were added.

Starter balance remains provisional. Progression/rank learning, broader weapons and enemies, advanced skills, RP missions, banking/full inventory and per-character combat archives remain explicitly deferred in tracker section 10. This record does not adopt imported browser coverage, migration or verification claims.

## Classic command-menu follow-up

Reworked the battle presentation into blue framed windows, a vertical Attack/Skills/Items/Defend list, nested bottom-aligned skill/item/target panels, and a dedicated hero HP/MP/SP panel. The exploration toolbar no longer occupies battle space. Up/Down selects commands, Enter confirms, Escape backs out one level, and Tab still reaches utility controls. Battlefield placement uses the remaining visible area, including when a submenu opens.

`./gradlew :core:check :lwjgl3:jar --console=plain --info` passed after the final changes: 72 tests, zero failures/errors. `git diff --check` passed. Native desktop interaction verified keyboard selection, scrolling to lower skills, target/cost preview, Back to the skill list, Spark execution and next-turn return. Resizing to a 683×425 content viewport now preserves both characters above the commands. See [full layout](classic-menu.png) and [compact layout](classic-menu-compact.png). This supersedes the earlier desktop illustration-overlap finding at that size; Android/iOS touch and lifecycle gates remain open. No combat rules or save formats changed in this presentation follow-up.
