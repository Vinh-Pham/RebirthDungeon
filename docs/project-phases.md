# Rebirth Dungeon: Project Phases

**Replanned: 2026-09-11 — Godot 4.7 / typed GDScript with the selected addons.** Phases 0–6 were implemented and verified after the 2026-09-10 reset; later phases remain unstarted. **Completed: 13 of 17. Current focus: Phase 14.** Pre-Godot implementation, tests and platform acceptance do not carry forward.

The repository contains the persistent State Charts application shell, validated content catalog, independent domain state/RNG/command foundations, isolated addon qualification fixtures, verification runner and export presets. Town and dungeon exploration now include continuous movement, discovery, guarded encounter fixtures and Phantom Camera follow. Deterministic combat and the adaptive battle HUD now include guarded State Charts presentation, separate Phantom Camera staging and simulated save-failure/retry behavior. Durable two-slot saves now restore the full session, with validated recovery and exact candidate retries. Progression through Phase 9 proved quests, enchanting, aging and rebirth. Phase 10 adds multi-enemy encounters with frozen member target sets and Windmill, Counterattack, Final Hit, criticals, equipment masteries, the isolated Warden's Memory role-playing mission with committed-outcome QuestSystem advancement, and per-agent LimboAI trees; Charge stays disabled and Master Titles are deferred with an explicit record. Phase 11 adds seeded procedural dungeons: authored generator tables with connector matching and a bounded attempt budget over a proven known-valid fallback, persisted layouts with generator/content versions, binding-driven encounter hosting and exit gating, authored required/bonus drop tables on the independent loot stream, and a world adapter that rebuilds any generated chain from the saved layout. Phase 12 adds persisted player settings (audio buses, reduced motion, text/UI scale, key rebinding), repository-generated audio with attribution, a settings surface on the title screen and exploration HUD, release gating for development-only surfaces, and measured desktop performance baselines. Phase 13 hardens the release candidate: frozen engine/content/addon versions asserted by automation, balance and long-session playtest fixtures, missing-asset and save-upgrade coverage, and a frozen-stack integration matrix. This roadmap incorporates the currently configured addons without treating installation as feature completion. [Game Plan](game-plan.md) defines architecture, [Directory](directory.md) defines file placement, gameplay specs define rules, and [AGENTS.md](../AGENTS.md) defines addon usage and integration boundaries. Phase numbers remain stable so existing specification links retain their meaning.

## Status and completion policy

At reset every phase started **Not started**, including the optional service phase. Use In progress only when work begins. Mark a checkbox complete only when implemented and verified; close a phase only when its exit criterion and dependency gates pass. A deferred/excluded feature must be recorded explicitly rather than counted as implemented. Desktop, Android, iOS and headless acceptance remain separate claims.

New evidence entries must include the exact Godot build, content/rules versions, platform/device, commands or manual steps, observed results and retained artifact paths. Old prototype logs/screenshots are [historical evidence](evidence/free-exploration/README.md), not active completion records.

Record addon versions with integration evidence. The completed Phase 0 record certifies its dated baseline, not the subsequently enabled addon stack. Phase 1 must rerun baseline checks against the current configuration. An enabled plugin, configured autoload or present native library does not establish runtime, save or export compatibility.

## Addon ownership and delivery order

Configuration inspected on 2026-09-11: Beckett, Godot State Charts, Dialogue Manager, Phantom Camera and QuestSystem are enabled in `project.godot`. `DialogueManager`, `PhantomCameraManager` and `QuestSystem` autoloads are configured alongside `BeckettRuntime`. LimboAI v1.8.1 is present as a GDExtension; Phase 1 now verifies its host classes/native load and records target binary availability. Executable/device qualification remains outstanding.

| Addon | Version | First consuming phase | Later integration gates |
| --- | --- | --- | --- |
| Godot State Charts | 0.22.5 + [local compatibility patch](evidence/phase-1/README.md#narrow-state-charts-compatibility-patch) | 1: application mode chart and transition guards | 5: battle presentation flow; 6: restore from authoritative session state |
| LimboAI | 1.8.1 | 4: manually scheduled one-enemy decision tree | 6: deterministic decision continuation; 10–11: authored enemy variety; 14: native device builds |
| Phantom Camera | 0.11.0.3 | 3: exploration follow and room bounds | 5: separate battle framing; 7: dialogue framing; 12: motion/accessibility polish |
| Dialogue Manager 4 | 4.1.0 | 7: NPC conversation and town service requests | 8: lessons/services; 9: quest offers and claims; 10: RP mission entry/return |
| QuestSystem 2 | 2.0.2 | 9: quest lifecycle adapter, objectives and journal | 10: isolated RP outcomes; 11: generated-run evidence |
| Beckett | 1.15.0 | 0: editor/runtime inspection and verification support | All consuming phases: rendered playtests and export exclusion checks |

Phase 1 qualifies all configured addons with small disposable test fixtures; production integrations are built only in the phases above. Keep the first loop's NPCs/enemies stationary. A behavior-tree demo does not add patrols, spatial battle targeting or real-time enemy turns to scope.

The custom domain owns dice, stats, costs, progression, accepted operation IDs and combined saves. State Charts coordinates modes and reflects accepted battle phases; LimboAI proposes intents; Phantom Camera owns framing; Dialogue Manager presents choices and requests commands; QuestSystem mirrors committed quest lifecycle. None may grant rewards or advance turns from presentation callbacks. Keep adapters and authored content outside vendored `addons/`; avoid a second custom implementation of a responsibility assigned to an addon. A pure domain state enum is still required and is not a competing scene state machine.

Build only lightweight mode/command contracts in Phase 1, domain types in Phase 2, and in-memory exploration/battle fixtures in Phases 3–5. Phase 6 supplies durable transactions before Phase 7 exposes the complete playable loop. Likewise, Phase 8 defines quest-evidence retention policy but does not implement quests ahead of Phase 9. Earlier fixtures must not be presented as save or progression acceptance.

## Roadmap

| Phase | Deliverable | Status |
| --- | --- | --- |
| 0 | Godot baseline and verification tools | Complete |
| 1 | Addon qualification and State Charts application shell | Complete |
| 2 | Validated Resources and deterministic rule foundations | Complete |
| 3 | Continuous exploration, authored rooms and Phantom Camera | Complete |
| 4 | Five-dice combat rules and LimboAI decisions | Complete |
| 5 | Battle HUD, state flow and camera staging | Complete |
| 6 | Durable saves and interrupted-session recovery | Complete |
| 7 | Dialogue Manager town services and durable dungeon loop | Complete |
| 8 | Inventory, skills and lasting progression | Complete |
| 9 | QuestSystem progression, enchanting and rebirth | Complete for host acceptance |
| 10 | Role-playing missions and advanced combat | Complete for host acceptance |
| 11 | Procedural dungeons and content expansion | Complete for host acceptance |
| 12 | Presentation, accessibility and performance | Complete for host acceptance |
| 13 | Regression, balance and release candidate hardening | Complete for host acceptance |
| 14 | Android and iOS delivery acceptance | Not started |
| 15 | Optional connected services and monetization assessment | Not started |
| 16 | Release and maintenance readiness | Not started |

Phases 0–7 establish a durable playable loop. Phases 8–9 prove persistent mastery and rebirth. Later phases extend, polish and ship the accepted scope. Native-library/export prerequisite checks begin in Phase 1, mobile gameplay smoke checks in Phase 7, and final mobile acceptance belongs to Phase 14. Missing target prerequisites must be recorded early rather than discovered at release.

## Phase 0: Godot baseline and verification tools

**Status: Complete. Dependencies: None.**

- [x] Pin the exact Godot 4.7 editor build and matching export templates; record the host and renderer choice.
- [x] Review the existing Mobile renderer, stretch/aspect, Windows driver and unused 3D physics settings against the 2D targets.
- [x] Create a minimal main scene, assign it in project settings, and establish script/scene naming and folder conventions.
- [x] Create a headless test runner with nonzero failure exit codes and one meaningful fixture; establish import and runtime smoke commands.
- [x] Create desktop, Android and iOS export presets as feasible, record missing SDK/signing prerequisites, and exclude docs/research/tests from shipping assets.

**Exit criterion:** The pinned editor imports and launches the main scene, the test runner proves pass/failure reporting, and each export target has an explicit prerequisite record. Configuration alone is insufficient.

Verified on macOS with Godot 4.7.2 (`ed1daf0bf`). Matching template versions are pinned but installation, SDK/signing setup and executable/mobile acceptance remain explicitly outstanding prerequisites. See [baseline decisions and commands](phase0-baseline.md) and [evidence](evidence/phase-0/README.md).

## Phase 1: Addon qualification and State Charts application shell

**Status: Complete. Dependencies: 0.**

- [x] Record the engine/addon versions, licenses, enabled plugins and autoload UID resolution; verify LimboAI classes and the actual host native library load with the pinned editor.
- [x] Rerun `tools/verify.py` against the enabled stack; inspect script errors, resource-pack contents and development/demo exclusions. Record native debug/release availability and missing export prerequisites per target without claiming device acceptance.
- [x] Smoke-test State Charts entry/transition, LimboAI task execution, Phantom Camera host selection, a compiled Dialogue Manager 4 cue and isolated QuestSystem pool operations. Keep fixtures free of production rewards and clear autoload test state afterward.
- [x] Create Main with mode/UI hosts and an application-owned session shell. Use a Godot State Charts mode chart for menu, loading, town, dungeon, battle and results, with explicit initial states and guarded transitions.
- [x] Load required art, fonts and Theme resources with actionable loading failures; use nearest filtering for pixel art.
- [x] Wire session/revision guards and local signals; ensure freed scenes cannot mutate the current session. Keep adapter lifetime/reset hooks explicit for configured autoloads; no duplicate managers or competing LimboHSM application chart.
- [x] Configure InputMap, keyboard/mouse/touch intent routing, focus-loss handling and the initial landscape layout.
- [x] Exercise repeated mode changes and resizing; show empty feature destinations only as development fixtures.

**Exit criterion:** The enabled stack imports and passes host smoke/baseline checks with a per-target prerequisite record. State Charts navigation, input ownership and resource lifetimes work without stale callbacks, duplicate entry effects or session loss; loading failures block entry visibly. Smoke fixtures do not certify the later feature integrations.

Verified on 2026-09-11 with the pinned macOS editor: strict import/runtime/fixture checks, all five resource-pack exclusions, fresh-copy import/autoload checks and Beckett rendered input/navigation audits. Includes a narrow State Charts recursive-array compatibility patch, tested without suppressing errors. All executable export attempts remain blocked by absent matching templates; this closes host qualification only. [Evidence, addon lifecycle decisions and per-target prerequisites](evidence/phase-1/README.md).

## Phase 2: Validated Resources and deterministic rule foundations

**Status: Complete. Dependencies: 1.**

- [x] Implement typed definition Resources, an explicit catalog manifest and stable namespaced content IDs.
- [x] Validate references, supported effects, rank order, scoring, dice weights, numeric bounds and schema/content/rules versions.
- [x] Separate read-only authored Resources from mutable hero, item, status and battle state.
- [x] Implement independently seeded generation/combat/AI/loot RNG streams and versioned seed derivation with restore fixtures.
- [x] Create command/revision/result types and fixtures proving invalid commands leave state and RNG unchanged.
- [x] Define the application-to-addon boundary: copied observations and accepted-result events outward, validated intents inward. Keep authoritative state independent of charts, blackboards, quest pools and dialogue nodes; extend the contracts only when their consumers arrive.

**Exit criterion:** Valid catalogs publish atomically; invalid catalogs report precise errors; resource isolation and same-version RNG continuation pass. See [Phase 2](phase2-foundations.md).

Verified 2026-09-11 with the pinned macOS editor: 494 domain checks plus content-loading, shell/addon/layout integration; positive/intentional-negative runs; all five resource packs; a fresh-copy import/run; and Beckett rendered valid/invalid content paths. No new art was required. This closes in-memory foundations, not battle gameplay or disk/mobile acceptance. [Implementation contracts](phase2-implementation.md) and [retained evidence](evidence/phase-2/README.md).

## Phase 3: Continuous exploration, authored rooms and Phantom Camera

**Status: Complete. Dependencies: 2.**

- [x] Build player movement with CharacterBody2D, collision and NavigationAgent2D; support direct and click/tap input.
- [x] Author one town and connected dungeon rooms with navigation polygons, connectors and stable encounter/interaction markers.
- [x] Wait for navigation synchronization; validate clearance, unreachable destinations and world-coordinate input.
- [x] Implement room discovery and observations that hide undiscovered actors/content and gate navigation.
- [x] Guard encounter requests, freeze movement at transitions and export exploration continuation without scene references.
- [x] Integrate Camera2D → PhantomCameraHost and an exploration PhantomCamera2D with authored follow mode, bounds, zoom and unambiguous priority. Let the host own the actual camera transform.
- [x] Rebind follow targets on mode replacement; verify coordinate picking, compact/wide framing, room-edge transitions and discovery masking. Camera movement must not expose hidden rooms or determine encounter legality.

**Exit criterion:** The authored world is traversable, collision/discovery/input gates work and each encounter triggers once. Phantom Camera follows and rebinds correctly without revealing hidden content or moving UI. See [Phase 3](phase3-movement.md).


Verified on 2026-09-11 (2026-09-12 UTC) with Godot 4.7.2 (`ed1daf0bf`), content revision 2 and Phantom Camera 0.11.0.3. Sixty exploration integration checks pass, alongside all earlier fixtures, strict import/runtime checks, the intentional negative test and all five resource packs. Beckett rendered checks cover keyboard traversal, encounter entry/return, compact/wide framing, input panels and discovery masking. A game-owned camera subclass corrects viewport-specific limit clamping without vendor edits. No combat, disk durability or mobile executable/device acceptance is claimed. [Implementation](phase3-implementation.md) · [Evidence](evidence/phase3/README.md).

## Phase 4: Five-dice combat rules and LimboAI decisions

**Status: Complete. Dependencies: 2, 3.**

- [x] Implement separate battle state and scene integration with one hero and one enemy; define first actor and initiative ties.
- [x] Implement skill-before-roll locking, five dice, kept flags, two batch rerolls and one whole-hand commit.
- [x] Implement HP/MP/SP reservation/payment, pre-roll pass, paid post-roll pass and exhaustion recovery.
- [x] Implement shared preview/effect math, status/shield/cooldown timing, enemy action, defeat precedence and pending encounter rewards.
- [x] Author complete starter stats/rewards and run exhaustive scoring plus deterministic action/restore fixtures.
- [x] Author one LimboAI BehaviorTree with game-owned BTAction/BTCondition tasks and per-agent blackboard state. Run BTPlayer in manual mode only when the domain scheduler requests an enemy decision; return a skill/target intent to the existing resolver.
- [x] Bound tree execution and provide a legal fallback; use stable candidate ordering and the owned AI RNG stream. Test repeated ticks, no legal action, stale session results and two actors sharing one tree without mutable-state leakage.
- [x] Verify no AI decisions occur while the player selects, keeps or rerolls; tasks cannot directly spend resources, resolve effects or grant rewards. Keep decisions reproducible independently of frame delta and animation speed.

**Exit criterion:** The starter encounter resolves through custom domain rules and scheduler-owned LimboAI intents without spatial targeting, frame-driven turns or duplicate effects. Deterministic domain fixtures and addon integration fixtures pass, including all [Phase 4 acceptance checks](phase4-combat.md#acceptance).


**Verification:** [Phase 4 implementation](phase4-implementation.md) and [fresh evidence](evidence/phase4/README.md): 7,883 combat checks (including all 7,776 hands), manual LimboAI isolation/fallback, 77 exploration checks, clean rendered combat/return and all five resource packs. Disk durability and full battle presentation remain Phases 6 and 5 respectively.

## Phase 5: Battle HUD, state flow and camera staging

**Status: Complete. Dependencies: 1, 4.**

- [x] Build CanvasLayer/Control/Container scenes, shared Theme and five stable die controls.
- [x] Expose skill/rank/target, costs, reservations, odds, result breakdown, kept dice and reroll budget.
- [x] Create modal/focus and pointer-ownership policy; prevent panel click-through and held world movement.
- [x] Validate wide/compact landscape, readable scaling, focus navigation and reduced animation.
- [x] Display save-pending/failure through a test adapter and prove duplicate/stale input cannot repeat an action.
- [x] Bind a battle State Charts adapter to accepted domain phases: pre-roll selection, locked hand, resolved activation and next actor/outcome. Guards reflect available commands; the domain revalidates every request. Re-entry/animation callbacks cannot reroll, commit or tick AI.
- [x] Author Phantom Camera battle framing separate from exploration, with explicit priority handoff and cleanup. Skipping a tween or replacing a scene changes presentation only; combat targets remain encounter members.

**Exit criterion:** The [Phase 5 UI matrix](phase5-combat.md#acceptance) passes with State Charts and Phantom Camera in Godot runtime, including repeated entry, skipped motion and stale input. Simulated saves are clearly separated from Phase 6 disk acceptance.

**Verification:** [Phase 5 implementation](phase5-implementation.md) and [dated evidence](evidence/phase5/README.md): 148 battle UI checks, all existing combat/AI/exploration fixtures, 960×540 and 1920×1080 at 100–140% text, simulated safe areas, keyboard/controller/touch input, exact candidate retry, scene/camera lifecycle, rendered victory/return and all five resource packs. Real disk durability, saved preferences and mobile device acceptance remain outstanding.

## Phase 6: Durable saves and interrupted-session recovery

**Status: Complete. Dependencies: 2, 4, 5.**

- [x] Define a versioned explicit profile/run/battle schema with exact 64-bit transport, finite coordinates and strict validation.
- [x] Implement FileAccess checkpoints under user:// with two slots, checksums, sequence selection and read-back verification.
- [x] Persist entry, roll/reroll/keep changes, actions and outcomes before enabling dependent mutation.
- [x] Keep one candidate on failure; Retry saves the same state/RNG and does not execute the command again.
- [x] Restore exploration layout/position/discovery and the exact active hand/reservations/statuses after a fresh process.
- [x] Test truncated/corrupt slots, unsupported versions, interrupted writes, duplicate transactions and focus/suspension behavior.
- [x] Reconstruct charts and camera targets from validated mode/battle state after load. Recreate AI blackboards from saved decision inputs; persist any accepted intent needed for continuation so resume neither redraws AI RNG nor submits an activation twice. Do not serialize live addon nodes or rely on chart history as the session save.

**Exit criterion:** Fresh-process continuation and injected save failures pass; corrupt/unsupported saves remain recoverable without silent reset. Persistence guarantees are measured, not inferred from FileAccess.

**Verification:** [Phase 6 implementation](phase6-implementation.md) and [dated evidence](evidence/phase6/README.md): 96 persistence checks, twelve separate Godot process invocations for continuation/interruption scenarios, all existing domain/UI/exploration fixtures, rendered Continue/retry/corrupt/incompatible/fallback paths, and all five resource-pack checks. Host file behavior is verified; mobile device and power-loss guarantees remain separate acceptance work.

## Phase 7: Dialogue Manager town services and durable dungeon loop

**Status: Complete. Dependencies: 3–6.**

- [x] Author Dialogue Manager 4 `.dialogue` resources and cues for one town NPC, a potion vendor, explicit free recovery and dungeon entry. Use a game-owned balloon and explicit mode context under persistent Main.
- [x] Route dialogue conditions through observations and service mutations through validated application commands. Revalidate proximity/session on confirmation; repeated lines or clicks must not duplicate purchases/recovery. No direct economy writes in dialogue text.
- [x] Integrate dialogue input/focus ownership and Phantom Camera conversation priorities; restore movement, focus and exploration framing on normal end, cancellation and scene replacement. Cancel stale awaits/subscriptions without granting anything.
- [x] Use one temporary gold balance and bounded potions with saved, atomic purchase and pre-roll potion actions.
- [x] Checkpoint battle entry/return; remove resolved encounters once; unlock exit only after required encounters.
- [x] Implement success, defeat and explicit exploration abandonment under the first-loop retention table.
- [x] Validate full exit/reward commit, lost pending rewards, retained unconsumed supplies, recovery and retry after a write failure.
- [x] Run the complete loop on desktop and perform early Android/iOS export/runtime smoke checks; log target-specific gaps.
- [x] Exercise fresh-process resume after accepted dialogue service commands and injected save failure; define safe conversation dismissal/restart without replaying mutations. QuestSystem remains unused for gameplay until Phase 9; a conversation is not an implicit quest.

**Exit criterion:** A user can converse, prepare, enter, fight, resume, exit or fail, recover and begin again with correct durable supplies/rewards and restored camera/input ownership. Dialogue replay cannot repeat a transaction. [Free exploration](free-exploration.md) owns the temporary economy.

**Verification:** [Phase 7 implementation](phase7-implementation.md) and [dated evidence](evidence/phase7/README.md): 64 focused service/layout checks, four fresh-process service scenarios, all existing combat/UI/persistence/exploration fixtures, rendered purchase/retry/recovery/entry/two-encounter exit/resume/abandonment, and five resource-pack checks. Android/iOS exports were attempted; missing matching templates prevent executable/runtime acceptance. Those target-specific gaps remain explicit.

## Phase 8: Inventory, skills and lasting progression

**Status: Complete for host acceptance (2026-09-12). Dependencies: 7.**

- [x] Author a complete per-outcome retention table for items, gold, XP, training, quest/title evidence and reservations before enabling inventory-backed runs.
- [x] Replace temporary supplies with inventory instances, rectangular placement, stacks, non-nesting bags, equipment and saved overflow.
- [x] Implement carried/banked gold and gold-bag capacity; define transition from temporary balances without losing saved value.
- [x] Implement NPC/book/page skill acquisition, rank training to 100, explicit AP rank-up and prototype rank caps.
- [x] Implement character XP/current and cumulative levels, talent mastery, stat-source recomputation and no-refill rules.
- [x] Implement First/Second title collection and selection, run snapshots and outcome-based evidence; introduce corresponding feature panels.
- [x] Test duplicate reward/rank/title grants, inventory atomicity, pending retention and fresh-process continuation.
- [x] Extend Dialogue Manager service commands for NPC lessons and progression views; learning grants Rank F, while rank-up remains a separate validated town action. Persist deduplicated milestone evidence for later quest eligibility without implementing QuestSystem rewards yet.

**Exit criterion:** A retained run reward can improve the next run through equipment or trained/AP-funded skills; all ownership, loss and overflow rules are explicit and saved.

**Verification:** [Implementation](phase8-implementation.md), [outcome/migration contract](phase8-retention.md) and [retained evidence](evidence/phase8/README.md). All regressions, 99 progression checks, 13 application checks, three fresh-process scenarios, positive/intentional-failure/runtime checks and five resource packs pass. Beckett verified keeper banking/purchase, two encounters, XP/AP commit, explicit F → E rank-up, restart and title effects without healing. Executable/mobile-device acceptance remains a platform gap.

## Phase 9: QuestSystem progression, enchanting and rebirth

**Status: Complete for host acceptance (2026-09-15). Dependencies: 8.**

- [x] Create game-owned Quest subclasses and a QuestSystem adapter mapping stable domain quest IDs to integer Quest.id values. Keep per-session instances separate from authored Resources; represent Locked and Ready-to-complete explicitly alongside available/active/completed pools.
- [x] Author the first quest slice: one short Chapter/Generation chain, an NPC sidequest, an automatically delivered rank-milestone Skill Quest and an NPC-offered skill-unlock quest. Validate prerequisites, ordered objectives and reachable acquisition paths.
- [x] Feed deduplicated committed evidence into QuestSystem; keep the run's eligible-stage snapshot and pending evidence separate until its outcome commits under Phase 8 policy. Add journal tabs, tracking and distinct objective-ready/return-to-NPC/reward-claimed feedback.
- [x] Integrate Dialogue Manager quest offers and explicit hand-in/claim commands. Atomically revalidate objectives/items, consume costs, grant rewards/overflow, record the claim ID and unlock successors through the save gate; only then synchronize QuestSystem pools and notifications. Plugin completion signals never grant rewards.
- [x] Persist explicit quest lifecycle/stage/evidence/claim data in the combined save and reconstruct pools without replaying start/complete rewards. Test changed inventory invalidating readiness, repeated dialogue claims, interrupted automatic delivery and switching sessions without pool leakage.
- [x] Add skill quests, item hand-ins and quest-awarded titles without bypassing skill acquisition/rank rules.
- [x] Implement prefix/suffix enchant application and separately confirmed burning with output-space validation and a dedicated saved RNG stream.
- [x] Author rebirth eligibility, age choices, cost/cooldown and aging-clock policy; implement retained mastery versus reset life growth.
- [x] Add the required town services and reconcile aging only at safe town/result boundaries.
- [x] Add equipment- and talent-rebirth-triggered Skill Quests when their consumers work; recover milestone delivery idempotently and preserve committed quests/claims across rebirth. Keep repeatable/daily quests deferred.
- [x] Exercise a complete level/train/rank-up/rebirth cycle, quest claims and failed-save retries without duplicated rewards.

**Exit criterion:** The authored QuestSystem/Dialogue Manager slice and the level/train/rank-up/rebirth loop are playable and persistent. Claims, successor delivery, enchant results and rebirth survive save retries without duplication; pending evidence never commits early and rebirth preserves documented mastery and quest history.

**Verification:** [Implementation and closed decisions](phase9-implementation.md) and [dated evidence](evidence/phase9/README.md): all regressions plus new quest/enchant/rebirth domain fixtures, QuestSystem pool-mirror integration, dialogue offer/hand-in through the real balloon, four fresh-process quest scenarios, legacy Phase 8 checkpoint migration and legacy four-stream RNG derivation. Beckett rendered playtesting of the new panels and executable/mobile acceptance remain outstanding, as in Phase 8.

## Phase 10: Role-playing missions and advanced combat

**Status: Complete for host acceptance (2026-09-15). Dependencies: 9.**

- [x] Create isolated authored NPC mission sessions with explicit return/failure policy and no borrowed-item export.
- [x] Add multi-enemy ordering and encounter-member target sets before enabling area skills.
- [x] Author and implement Counterattack, Final Hit, Windmill, criticals and equipment masteries in separately tested increments.
- [x] Keep Charge disabled (recorded disposition; no grid/range mechanic reintroduced).
- [x] Persist reaction inputs, multi-target sets, critical outcomes and mission context; test exactly-once training across passives.
- [x] Apply the Master Titles gate and record the outcome: deferred — authored prototype ranks cap at E, so no reachable Rank-1 objective or defined economy exists; revisit in Phase 11+ with authored content.
- [x] Route RP mission entry/return through Dialogue Manager and State Charts with a separate NPC session; only its committed scenario outcome may advance QuestSystem. Test success, failure and suspension without borrowed gear/training leaking into the hero.
- [x] Extend LimboAI trees only for authored multi-enemy rules; preserve manual scheduling, target ordering, per-agent blackboards and AI RNG continuation. Camera group framing is cosmetic, not an area-target resolver.

**Exit criterion:** Each enabled extension has explicit rules, content, UI, save/restore and regression coverage; unsupported skills remain unavailable. — Met. Charge is disabled and Master Titles are recorded as deferred rather than enabled without their gates.

**Verification:** [Phase 10 implementation](phase10-implementation.md) and [dated evidence](evidence/phase10/README.md): all suites pass with the new 118-check Phase 10 fixture (multi-enemy target sets, reactions, criticals, masteries, Final Hit, mission isolation and exactly-once commit, save/restore, legacy migration, and the enemy-training save-poisoning regression found via a player report), full `verify.py` gate (import, positive/negative fixtures, runtime smoke, five asset packs), and a Beckett rendered playtest entering the Warden's Memory mission battle on a migrated legacy save. Executable export and device acceptance remain Phase 14 work.

## Phase 11: Procedural dungeons and content expansion

**Status: Complete for host acceptance (2026-09-15). Dependencies: 7; 8–10 for dependent rewards/features.**

- [x] Implement seeded room selection using stable IDs, connector matching and a bounded attempt budget.
- [x] Validate overlap, navigation clearance, room reachability, required encounters and exit access; provide a known valid fallback.
- [x] Persist the generated layout and generator/content versions rather than trusting regeneration across engine changes.
- [x] Add encounter/loot variety and progression pacing with authored tables; keep RNG streams independent.
- [x] Exercise many seeds and worst-case layouts; add floors/towns/gathering/cooking only with complete consuming rules. — Floors, additional towns, gathering and cooking are recorded as excluded: no complete consuming rules are authored yet, so none ship.
- [x] Validate generated encounter bindings to LimboAI trees, Phantom Camera room limits and eligible QuestSystem evidence against saved stable room/encounter IDs. Keep hidden rooms out of camera transitions and quest observations; moving NPC AI requires a separate authored feature contract.

**Exit criterion:** Generated runs remain traversable and completable, reproduce layout fixtures under pinned versions and restore their saved layout correctly. — Met: see [Phase 11 implementation](phase11-implementation.md) and [evidence](evidence/phase11/README.md).

## Phase 12: Presentation, accessibility and performance

**Status: Complete for host acceptance (2026-09-15). Dependencies: 7; relevant feature phases.**

- [x] Replace placeholder art with original licensed assets, animation, sound and music; record asset attribution. — Art remains the original SpriteCook set with attribution already recorded; Phase 12 adds the first animation pass (reduced-motion-aware hero bob and marker pulses) and the full first audio pass (nine repository-generated WAVs: UI, combat, recovery, stings and two seamless music pads), attributed in `assets/audio/ATTRIBUTION.md`.
- [x] Polish transitions and feedback without animation-driven rules; provide reduced motion and independent audio controls. — Reduced motion gates camera damping, marker pulses, the hero bob and the battle stage path; Master/Music/SFX volumes are independent, persisted and applied through `AudioServer`. Audio is a presentation consumer of accepted events only.
- [x] Implement text/UI scale, color-independent status cues, input remapping and verified keyboard/touch focus flows. — Text scale (continuous 1.0–1.4, panel options 100/115/130%) persists and rescales the shell theme, HUD, battle view and dialogue; statuses and resources remain text-first (numeric labels + inspection sheet); key rebinding adds up to four keys per action while preserving joystick bindings, with reset; settings-panel and battle focus flows re-verified in the rendered pass.
- [x] Profile target scenes on representative devices and optimize measured memory/frame-time/loading issues. — Desktop runtime profiling recorded in [evidence](evidence/phase12/README.md): 60 FPS locked in town, generated-dungeon traversal and battle; ≤52 draw calls; ≤81 MB static memory; zero orphan growth. No optimization required at measured budgets; representative-device profiling stays in Phase 14.
- [x] Hide development controls and review safe areas, compact layouts, long text and export asset filters. — The telemetry status row and the town's direct dungeon fixture are debug-build only and the release navigation gates were removed (Start Game is the release path, covered by the updated shell fixture); compact/long-text rendering re-verified at 140% text; the nine WAV assets ship in all five export packs (verify log).
- [x] Polish Phantom Camera follow/transitions and Dialogue Manager balloon layout together; test reduced motion, long dialogue/quest text, focus restoration and pause/cancel paths. — Reduced motion removes only cosmetic easing (camera damping/pulses) with no rule effect; the balloon and panels scroll long text; settings/dialog/panel open-close restores world focus and input ownership through the established freeze/unfreeze path, re-verified rendered.

**Exit criterion:** Supported layouts remain readable and responsive through the full loop, with measured performance targets and no development-only UI exposed. — Met: see [Phase 12 implementation](phase12-implementation.md) and [evidence](evidence/phase12/README.md). Screen-reader support and physical-device safe areas remain explicitly open (Phase 14 + explicit design).

## Phase 13: Regression, balance and release candidate hardening

**Status: Complete for host acceptance (2026-09-15). Dependencies: 8, 9, 10, 11, 12.**

- [x] Run content validation, exhaustive scoring, rule fixtures, save fault injection and complete progression regression suites.
- [x] Playtest battle length, resource exhaustion, reward pacing, training/AP access and rebirth motivation. — 10-expedition scripted playtest: required guardians 13/13, full clears 21–25 activations, pending gold 25–33 per clear, deaths only at the optional dual toll (authored difficulty, recorded). Rebirth cap (700 cumulative XP) confirmed a long-horizon goal.
- [x] Test missing assets, load failures, repeated transitions, long sessions and supported save upgrade paths. — Missing-asset diagnostic with blocked entry and clean retry; 12 repeated guarded cycles publishing exactly once; 30-battle long session with stable object counts; v1/v2 save upgrade chain decodes and re-saves on the current format.
- [x] Exercise the complete target feature matrix and document known limitations with reproducible evidence. — Feature matrix and reviewed limitations recorded in [Phase 13 implementation](phase13-implementation.md) and [evidence](evidence/phase13/README.md).
- [x] Freeze candidate content/rules versions and ensure test/import failures produce failing automation exit codes. — Engine pin, schema/rules/generator/rng = 1, content = 3, and the six addon versions are asserted by tests/unit/release_fixture.gd; verify.py fails on any nonzero exit, SCRIPT ERROR, or missing PASS marker (proven by the intentional-negative step).
- [x] Freeze the selected addon versions and run an integration matrix covering chart re-entry, manual AI scheduling, camera handoffs, dialogue mutation retries, quest claim/restore and autoload session cleanup. Reverify upgrades rather than assuming upstream API or save compatibility. — tests/integration/matrix_fixture.gd (35 checks) covers all six interactions on the real application against the frozen version files.

**Exit criterion:** The release candidate has a reproducible passing regression record, accepted balance and a reviewed list of remaining limitations. — Met: see [Phase 13 implementation](phase13-implementation.md) and [evidence](evidence/phase13/README.md).

## Phase 14: Android and iOS delivery acceptance

**Status: Not started. Dependencies: 6, 7, 12, 13.**

- [ ] Install matching templates and documented SDKs; verify export presets, IDs, orientations and signing requirements.
- [ ] Export/install Android builds and exercise touch, Back, suspension, relaunch, storage failures and the full loop.
- [ ] Export the iOS Xcode project on macOS, build/sign/install and exercise touch, safe areas, interruption and continuation.
- [ ] Compare pinned battle/save fixtures on desktop and both mobile targets; record actual compatibility scope.
- [ ] Validate representative physical devices, release configuration, package assets, performance and signing; retain evidence per target.
- [ ] Verify LimboAI native debug/release libraries, architecture selection and iOS framework/signing requirements in actual packages. Verify Dialogue Manager imports, addon autoload UID resolution, Phantom Camera rendering and QuestSystem restoration in fresh exported processes, including release builds.

**Exit criterion:** Android and iOS each pass actual gameplay and restart acceptance; export/compilation alone cannot close the phase.

## Phase 15: Optional connected services and monetization assessment

**Status: Not started. Dependencies: Offline core accepted; separate product authorization.**

- [ ] Decide explicitly whether authentication, cloud sync, gacha or purchases belong in the product; keep offline play independent.
- [ ] For approved services, define account/profile ownership, conflict resolution, idempotency and offline failure behavior.
- [ ] For approved purchases or paid random rewards, define entitlement/receipt validation, economy, disclosures and store requirements.
- [ ] Evaluate Godot platform plugins only for approved features and re-run export/lifecycle/save acceptance.
- [ ] Record each feature as accepted and tested or explicitly excluded from release.

**Exit criterion:** Approved scope is verified, or a documented decision excludes these features. No implementation is authorized merely by this roadmap entry.

## Phase 16: Release and maintenance readiness

**Status: Not started. Dependencies: 13, 14; disposition of 15; all included feature gates.**

- [ ] Finalize release scope, engine/templates/content versions, export configuration and asset licenses.
- [ ] Record shipped addon versions/licenses and native binaries; exclude addon demos, State Charts examples, research and development fixtures while retaining required runtime resources. Document an engine/addon upgrade and save-compatibility verification procedure.
- [ ] Complete store/package metadata, signed candidate verification and explicit publishing authorization.
- [ ] Retain clean-install/upgrade/save-recovery evidence and a supported-platform matrix.
- [ ] Document backup/support procedures, known limitations and future migration/versioning policy.
- [ ] Update docs to verified behavior and mark completion only with current Godot evidence.

**Exit criterion:** A reproducible signed candidate and support plan are ready; external publication is a separate authorized action.

## Decisions to close at the consuming phase

| Decision | Required before |
| --- | --- |
| Exact editor/templates, renderer coverage and test tooling | Phase 0 exit |
| Enabled-stack host compatibility, autoload lifecycle, native binary availability and development export exclusions | Phase 1 exit; per-target device proof in Phase 14 |
| Mode chart ownership and domain-to-addon event/intent boundary | Phases 1–2 exit |
| LimboAI decision budget, legal fallback and saved AI draw order | Phase 4 exit; continuation proof in Phase 6 |
| Starter pools, initiative ties, rewards and action bounds | Phase 4 exit |
| Save schema, crash recovery and incompatible-version UX | Phase 6 exit |
| Dialogue cancellation/resume and service mutation retry policy | Phase 7 exit |
| Full item/gold/XP/training/quest/title retention and temporary-economy transition | Phase 8 implementation of inventory-backed runs |
| XP/AP/training pace, talent growth and initial title catalog | Phase 8 exit |
| Rebirth eligibility/cost/cooldown, aging clock and enchant economy | Closed 2026-09-15 in [Phase 9 implementation](phase9-implementation.md): cap + 50 gold + 2-week cooldown, ages 10–17, 52-week year at 1 AP, enchant chances ≤90% with powder/MP economy |
| Quest ID mapping, ready/claimed lifecycle, evidence retention and pool reconstruction | Closed 2026-09-15 in [Phase 9 implementation](phase9-implementation.md): authored numeric mapping, growth v2 lifecycle, exit-commit evidence, post-publication pool mirror |
| Reaction/area rules and non-spatial Charge disposition | Closed 2026-09-15 in [Phase 10 implementation](phase10-implementation.md): Counterattack one-charge negation/retaliation inside the attacker's transaction, Windmill `hostile_all` with selection-frozen member sets, Critical Hit as a learned passive gating per-target draws; Charge stays disabled (recorded), Master Titles deferred pending reachable objectives and a defined economy |
| Platform performance budgets and supported device coverage | Phases 12–14 |
| Connected services, purchases and gacha inclusion | Separate Phase 15 product decision |

## Verification record

2026-09-15: Phase 13 host acceptance completed. Regression, balance and release-candidate hardening verified on Godot `4.7.2.stable.official.ed1daf0bf`: the frozen candidate manifest (engine pin, schema/rules/generator/rng = 1, content = 3, six addon versions) is asserted by the new 14-check release fixture; balance playtesting (10 scripted expeditions, 21 battles, 164 activations through the real resolver) measured battle length, the 5-potion/5-gold economy, reward accounting, XP/level thresholds and the rebirth horizon; hardening coverage added missing-asset diagnostics, 12 repeated guarded transition cycles, a 30-battle long session, and the v1/v2-to-current save upgrade chain; the frozen-stack integration matrix (35 checks) covers chart re-entry, AI scheduling determinism, camera handoffs, dialogue mutation retries, quest claim/restore and autoload teardown. Full runner: `TEST_RESULT: PASS` with zero script errors across 28 fixture suites; `tools/verify.py` gate passes including the intentional-negative step and all five asset-pack exclusions. Rendered Beckett regression confirmed the settings surface, the persisted generated-dungeon loop and the Phase 12 accessibility settings. Known limitations reviewed and recorded: optional toll guardians sit on the only exit path (authored difficulty), screen-reader support requires explicit design, device acceptance is Phase 14. [Implementation](phase13-implementation.md) · [Evidence](evidence/phase13/README.md).

2026-09-15: Phase 12 host acceptance completed. Presentation, accessibility and performance verified on Godot `4.7.2.stable.official.ed1daf0bf`: persisted player settings under `user://settings.cfg` (independent Master/Music/SFX volumes, reduced motion, continuous 1.0–1.4 text scale with authored 100/115/130% options, and keyboard rebinding that preserves joystick bindings) with per-field fallback for corrupt values; a full first audio pass of nine repository-generated WAVs (attributed in `assets/audio/ATTRIBUTION.md`, regenerated by `tools/generate_audio.gd`, seamless music loops by construction) routed through new Music/SFX buses and an `AudioService` child of Main as a pure presentation consumer of accepted events; a settings surface on the title screen and exploration HUD with live application, freeze/unfreeze and focus restoration; reduced motion gating camera damping, marker pulses, the hero bob and the battle stage; release gating that hides the telemetry status row and the town dungeon fixture while making Start Game the real release path. New 23-check settings fixture passes alongside every prior suite; the full runner reports `TEST_RESULT: PASS` with zero script errors and the `tools/verify.py` gate passes including all five resource-pack exclusions (the WAV assets ship in every pack). Measured desktop runtime baselines (Beckett performance monitors): 60 FPS locked in town, generated-dungeon traversal and battle; ≤52 draw calls; ≤81 MB static memory; zero orphan growth. Rendered playtests verified the settings panel flows, reduced motion, 140% battle text, audio routing and persistence across restarts. Executable export, device acceptance and representative-device profiling remain Phase 14 work; screen-reader support requires its own explicit design. [Implementation](phase12-implementation.md) · [Evidence](evidence/phase12/README.md).

2026-09-15: Phase 11 host acceptance completed. Seeded procedural dungeons verified on Godot `4.7.2.stable.official.ed1daf0bf`: authored generator tables (`content/dungeon/undercrypt.tres`) with connector matching, weighted room pools, hosting whitelists, minimum-depth optional guardians, a bounded attempt budget and a publication-proven known-valid fallback; structural validation shared by the generator, the save codec and fixtures; layouts persisted with run seed, binding records and authored labels and restored without regeneration, including a structural migration for pre-Phase-11 checkpoints; authored required/bonus drop tables consuming the independent loot stream with pinned draw order; a bindings-driven exit gate in the resolver and HUD; a data-driven world adapter with layout-derived camera limits. `tests/unit/dungeon_fixture.gd` (54 checks over determinism, a 120-seed sweep, hostile-seed fallback, validator negatives, resolver RNG isolation, drop order, codec round trips and migration) plus the binding-driven exploration sweep pass; the full runner reports `TEST_RESULT: PASS` with zero script errors, and the `tools/verify.py` gate passes including all five resource-pack exclusions. Beckett rendered playtests: a pre-Phase-11 checkpoint resumes through the migration, the entrance dialogue generates a fresh five-room expedition (`threshold → oratory → crypt → hall → sanctum`), and a mid-run checkpoint restores the identical generated layout in a fresh process. Executable export and device acceptance remain outstanding. Floors, additional towns, gathering and cooking are recorded as excluded pending complete consuming rules. [Implementation](phase11-implementation.md) · [Evidence](evidence/phase11/README.md).

2026-09-15: Phase 10 host acceptance completed. Multi-enemy encounters with stable ordering and selection-frozen member target sets, Windmill, Counterattack reactions with negation/retaliation inside the attacker's transaction, Final Hit stored magnitudes, criticals gated by the learned passive with per-target combat draws, equipment masteries with exactly-once passive training, disabled Charge, and the isolated Warden's Memory role-playing mission (Dialogue Manager entry, champion battle, committed-outcome QuestSystem advancement, failure/retry policy) verified on Godot `4.7.2.stable.official.ed1daf0bf` with domain, integration, fresh-process and save-migration fixtures; the full `verify.py` gate passes including all five asset-pack exclusions, and a Beckett rendered playtest entered the mission battle on a migrated legacy checkpoint. Master Titles are recorded as deferred with an explicit gate evaluation. Executable/device acceptance remains outstanding. [Implementation](phase10-implementation.md) · [Evidence](evidence/phase10/README.md).

2026-09-15: Phase 9 host acceptance completed. QuestSystem 2.0.2 quest lifecycle, Dialogue Manager offers/hand-ins, enchanting with the dedicated RNG stream, aging and rebirth verified with domain, integration and fresh-process fixtures on Godot `4.7.2.stable.official.ed1daf0bf`; Phase 8 checkpoints migrate structurally to growth v2 without loss. Beckett rendered playtests of the new journal/enchant/rebirth UI and executable/device acceptance remain outstanding. [Retained evidence](evidence/phase9/README.md).

2026-09-11: Phase 1 host acceptance completed. Persistent guarded State Charts shell and isolated addon fixtures pass on Godot `4.7.2.stable.official.ed1daf0bf`; Beckett input/focus/loading/resize playtests pass. Final resource packs exclude demos, editor-only camera assets and C# examples while preserving runtime dependencies and license notices. A documented local State Charts compatibility patch removes a reproduced pinned-engine shutdown leak. Matching templates and executable/device acceptance remain outstanding. [Retained evidence](evidence/phase-1/README.md).

2026-09-11: Documentation-only replanning against `project.godot`, local addon version files and [AGENTS.md](../AGENTS.md). Enabled plugin/autoload configuration was inspected; no new runtime, export or feature acceptance is claimed. All new checklist items remain unchecked. Phase 1 owns fresh qualification of the configured stack.

2026-09-10: Phase 0 verified with the pinned Godot editor: import, runtime launch through Godot MCP, headless fixture pass and intentional failure, and resource-pack exclusions for all five presets. Full exports fail on absent templates; SDK/signing prerequisites are recorded per target. [Retained commands, results and screenshot](evidence/phase-0/README.md). This does not claim executable export or mobile acceptance.

2026-09-11: Phase 2 validated Resources, domain ownership, RNG and command boundary verified. [Evidence](evidence/phase-2/README.md).

2026-09-12: Penpot title-screen presentation integrated with existing guarded loading and saved-session continuation. [Title-screen evidence](evidence/title-screen/README.md). No phase completion status changed.
