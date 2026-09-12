# Phase 4 verification — 2026-09-11 Pacific / 2026-09-12 UTC

Host: macOS 27.0 (26A428), arm64, Apple M2 Max. Godot **4.7.2.stable.official.ed1daf0bf**, Compatibility renderer. LimboAI **1.8.1**, Beckett **1.15.0 Full**. Catalog content **3**, schema/rules/generator/RNG **1**. No vendor changes or newly generated assets.

## Automated results

`BECKETT_ENABLE=0 BECKETT_AUTO_CONFIG=0 python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot`

[Full verifier](verification.txt): **PASS**. [Positive tests](logs/tests-pass.log): **PASS**, with 117 catalog checks, 333 RNG checks, 56 command checks, **7,883 combat checks**, manual AI integration, addon/shell/loading fixtures and **77 exploration checks**. Import and headless runtime pass. The [intentional negative fixture](logs/tests-failure.log) exits 1 with its expected marker. All five asset packs pass exclusions, **651 files each**. The verifier rejects engine/script errors even when a fixture prints PASS.

Combat coverage:

- Every one of the 7,776 hands is compared with an independent equal-pair-relation oracle; category counts are 480 / 3,600 / 1,800 / 1,200 / 240 / 300 / 150 / 6 in ascending strength order.
- Zero-weight faces and cumulative sample boundaries; invalid/duplicate/noninteger/kept/out-of-range subsets leave state and all RNG streams unchanged. Reversed input order produces the same canonical reroll.
- Reservation without payment, two rerolls without automatic commit, free versus mixed-cost paid pass, nonlethal HP costs, stale and duplicate operations.
- Integer cost ceiling/minimums, stat floors/clamping, magic mapping, defense → combination → protection → shield rounding, preview/commit parity and output caps.
- Focus independent of dice; status refresh and equal/lower-priority replacement; shield/cooldown casting-boundary skip, external debuff timing, expiration, pool capacity changes, periodic simultaneous defeat and no dead-actor recovery.
- Explicit value DTO export, binary value round-trip, fresh reconstruction, identical unfinished hand/keep/lock/reservation/operations/RNG, then identical reroll and commit continuation.
- Two BTPlayers sharing the authored tree keep separate Blackboards. Selection and locked-hand inspection produce no decisions or mutation. Repeated requests cannot resubmit an activation. No affordable action and a deliberately RUNNING tree both fall back to a paid-nothing pass after one manual update. Stale AI results cannot apply effects.
- Actual application/exploration route fights both sentinels through accepted selection/roll/commit commands, returns to recorded positions, and commits exactly 25 gold only at the exit. Battle movement/frame updates and focus loss cannot advance combat; unresolved results/menu escape is blocked.

A deferred focus request on a view replaced in the same frame initially caused a Godot error. Focus is now assigned while its button is attached; the final strict verification and fresh rendered session are clean.

## Beckett rendered session

Fresh main-scene launch on the final gameplay code, with Beckett keyboard/action input, world destination requests, semantic button clicks and runtime observations:

1. Enter Haven, approach the Undercrypt entrance, reveal Gallery and approach its sentinel.
2. Select Fortify, roll five dice, keep die 0, reroll the unkept subset twice. [Locked hand](locked-hand.png): **3 kept / 2 / 2 / 5 / 5**, 17 pips, two pairs, **38 shield**, **0 rerolls**, **4 SP reserved**. No enemy activation or payment occurred.
3. Set focus false: Beckett refuses the disabled Commit button. Restore focus and commit. [After enemy response](after-enemy.png): hero HP30/SP18, shield33, Fortify cooldown; enemy SP9. Exactly one enemy strike consumed 3 SP then regenerated 2, absorbed 5 shield and applied Weakness.
4. Two Sword activations defeat the enemy. [Victory](victory.png) and [observation](victory-observation.json): hero HP25/SP12; Gallery resolved, 10 pending gold, 0 committed gold.
5. [Return](return.png) restores x823.998/y160, removes only Gallery's sentinel and retains survivor resources/statuses. [Runtime error query](runtime-errors.txt): no error entries.

Screenshots are from the desktop embedded game window, scaled to 1280 pixels wide. They are not mobile device evidence.

## Boundaries

This is an in-memory combat implementation. Phase 5 owns the complete battle HUD, State Charts presentation and Phantom Camera staging. Phase 6 owns durable saves and external save validation; Phase 7 owns recovery/town services and the durable complete loop. The checkpoint DTO test does not claim process-restart or disk durability.

Asset-pack success does not certify executable exports, signing, installation, Android/iOS native LimboAI compatibility or device performance. Those remain later gates.
