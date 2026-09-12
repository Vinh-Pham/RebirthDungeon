# Phase 7 verification evidence

Date: **2026-09-12 UTC**. Host: macOS 27.0 (26A428), arm64 / Apple M2 Max. Engine: **4.7.2.stable.official.ed1daf0bf**, Compatibility renderer. Dialogue Manager 4.1.0, Phantom Camera 0.11.0.3, Beckett 1.15.0. No vendored addon changes or new artwork.

## Automated verification

- [Required wrapper](verification.log): engine pin, import, positive suite, intentional-negative fixture, headless runtime, and all five resource-pack exclusion checks pass (675 files per target). Packs are not executable exports.
- [Positive suite](tests-pass.log): existing catalog/RNG/command/combat, 148 battle UI checks, 96 save checks, addon/shell/content/exploration fixtures and town service integration.
- [Final focused service run](town-services.log): **64 checks pass**, including additional 960×540 balloon bounds, 48-pixel minimum touch targets and explicit focus links. Also covers invalid/stale/duplicate commands, purchase bounds, free recovery, pre-roll potion activation/payment, potion save failure/retry, defeat and abandonment retention, v1 migration, malformed supply counts, proximity rejection, cancellation, scene replacement and focus cleanup.
- Four separate service-resume Godot processes prove previous supplies after a failed write, one accepted purchase, accepted recovery, and abandonment interrupted after a complete write. The existing save fixture adds twelve separate process invocations for combat/RNG/continuation failures.
- No runtime/resource-leak errors in the final test logs. Final rendered Escape cancellation, resumed movement and recovery were checked after fixing cancellation ordering.

## Rendered Beckett run

Used isolated `tests/fixtures/town_preview.tscn`, with `user://phase7-rendered`; the normal player profile was not modified. The fixture seeds 25 gold, zero potions and 12 HP, then uses actual navigation, normal application/domain commands and UI choices.

1. Resume town, walk to keeper, browse the real Dialogue Manager response and confirm one potion.
2. Inject an open failure: [purchase retry](purchase-retry.png) shows the save gate; gold stays 25 and potions zero. Retry publishes 20 gold / one potion exactly once.
3. Confirm [free recovery](recovery.png), then walk to the entrance and confirm expedition entry.
4. Navigate through discoveries and fight both sentinels with normal select/roll/commit commands and manual LimboAI responses. The first reward remains pending; the resolved marker disappears on return.
5. During the second encounter, click the actual Potion button: count falls from one to zero, healing consumes a full activation and the enemy responds.
6. Exit after both victories: [Results](exit-results.png) shows 45 gold (20 previously committed + 25 expedition reward). Stop/restart, Continue, and return to Haven. The result is retained.
7. [Keeper landscape view](keeper-landscape.png) after restart shows retained gold/resources. Escape dismisses, conversation camera releases to priority 20 and navigation accepts movement again. Reopen, recover to 30/10/20, and begin another expedition. The [abandonment confirmation](abandon.png) previews the exact pending-gold loss.

Embedded editor sizing can override a requested OS window size; the landscape screenshot is not evidence of an exact 960×540 render. Compact bounds/focus are measured separately in a 960×540 SubViewport fixture. Touch-target tests are synthetic desktop checks, not device certification.

Earlier Beckett semantic-click diagnostics reported detached button paths after synchronous callbacks; dialogue callbacks now defer tree changes. Final dialogue interactions and Escape produced no runtime log errors. The retained screenshots record the relevant intermediate/final states, not a claim that every exploratory tool call was error-free.

## Mobile gaps

[Android export](android-export.log) and [iOS export](ios-export.log) were attempted through Beckett and both exited 1: matching 4.7.2 Android templates and `ios.zip` are missing. Neither artifact exists. [Runtime probes](mobile-runtime.txt) found adb but no connected Android device, and Xcode with a booted iOS simulator.

Installation/launch, signing, native-extension compatibility, actual touch, suspension and crash/power-loss behavior on devices remain unverified. The early smoke gate records these blockers; it does not certify either mobile platform.
