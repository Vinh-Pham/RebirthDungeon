# Rebirth Dungeon: Project Phases

**Replanned: 2026-09-11 — Godot 4.7 / typed GDScript with the selected addons.** Phases 0 and 1 were implemented and verified after the 2026-09-10 reset; later phases remain unstarted. **Completed: 2 of 17. Current focus: Phase 2.** Pre-Godot implementation, tests and platform acceptance do not carry forward.

The repository contains the persistent State Charts application shell, isolated addon qualification fixtures, verification runner and export presets. Feature destinations remain development fixtures; gameplay remains unimplemented. This roadmap incorporates the currently configured addons without treating installation as feature completion. [Game Plan](game-plan.md) defines architecture, [Directory](directory.md) defines file placement, gameplay specs define rules, and [AGENTS.md](../AGENTS.md) defines addon usage and integration boundaries. Phase numbers remain stable so existing specification links retain their meaning.

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
| 2 | Validated Resources and deterministic rule foundations | Not started |
| 3 | Continuous exploration, authored rooms and Phantom Camera | Not started |
| 4 | Five-dice combat rules and LimboAI decisions | Not started |
| 5 | Battle HUD, state flow and camera staging | Not started |
| 6 | Durable saves and interrupted-session recovery | Not started |
| 7 | Dialogue Manager town services and durable dungeon loop | Not started |
| 8 | Inventory, skills and lasting progression | Not started |
| 9 | QuestSystem progression, enchanting and rebirth | Not started |
| 10 | Role-playing missions and advanced combat | Not started |
| 11 | Procedural dungeons and content expansion | Not started |
| 12 | Presentation, accessibility and performance | Not started |
| 13 | Regression, balance and release candidate hardening | Not started |
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

**Status: Not started. Dependencies: 1.**

- [ ] Implement typed definition Resources, an explicit catalog manifest and stable namespaced content IDs.
- [ ] Validate references, supported effects, rank order, scoring, dice weights, numeric bounds and schema/content/rules versions.
- [ ] Separate read-only authored Resources from mutable hero, item, status and battle state.
- [ ] Implement independently seeded generation/combat/AI/loot RNG streams and versioned seed derivation with restore fixtures.
- [ ] Create command/revision/result types and fixtures proving invalid commands leave state and RNG unchanged.
- [ ] Define the application-to-addon boundary: copied observations and accepted-result events outward, validated intents inward. Keep authoritative state independent of charts, blackboards, quest pools and dialogue nodes; extend the contracts only when their consumers arrive.

**Exit criterion:** Valid catalogs publish atomically; invalid catalogs report precise errors; resource isolation and same-version RNG continuation pass. See [Phase 2](phase2-foundations.md).

## Phase 3: Continuous exploration, authored rooms and Phantom Camera

**Status: Not started. Dependencies: 2.**

- [ ] Build player movement with CharacterBody2D, collision and NavigationAgent2D; support direct and click/tap input.
- [ ] Author one town and connected dungeon rooms with navigation polygons, connectors and stable encounter/interaction markers.
- [ ] Wait for navigation synchronization; validate clearance, unreachable destinations and world-coordinate input.
- [ ] Implement room discovery and observations that hide undiscovered actors/content and gate navigation.
- [ ] Guard encounter requests, freeze movement at transitions and export exploration continuation without scene references.
- [ ] Integrate Camera2D → PhantomCameraHost and an exploration PhantomCamera2D with authored follow mode, bounds, zoom and unambiguous priority. Let the host own the actual camera transform.
- [ ] Rebind follow targets on mode replacement; verify coordinate picking, compact/wide framing, room-edge transitions and discovery masking. Camera movement must not expose hidden rooms or determine encounter legality.

**Exit criterion:** The authored world is traversable, collision/discovery/input gates work and each encounter triggers once. Phantom Camera follows and rebinds correctly without revealing hidden content or moving UI. See [Phase 3](phase3-movement.md).

## Phase 4: Five-dice combat rules and LimboAI decisions

**Status: Not started. Dependencies: 2, 3.**

- [ ] Implement separate battle state and scene integration with one hero and one enemy; define first actor and initiative ties.
- [ ] Implement skill-before-roll locking, five dice, kept flags, two batch rerolls and one whole-hand commit.
- [ ] Implement HP/MP/SP reservation/payment, pre-roll pass, paid post-roll pass and exhaustion recovery.
- [ ] Implement shared preview/effect math, status/shield/cooldown timing, enemy action, defeat precedence and pending encounter rewards.
- [ ] Author complete starter stats/rewards and run exhaustive scoring plus deterministic action/restore fixtures.
- [ ] Author one LimboAI BehaviorTree with game-owned BTAction/BTCondition tasks and per-agent blackboard state. Run BTPlayer in manual mode only when the domain scheduler requests an enemy decision; return a skill/target intent to the existing resolver.
- [ ] Bound tree execution and provide a legal fallback; use stable candidate ordering and the owned AI RNG stream. Test repeated ticks, no legal action, stale session results and two actors sharing one tree without mutable-state leakage.
- [ ] Verify no AI decisions occur while the player selects, keeps or rerolls; tasks cannot directly spend resources, resolve effects or grant rewards. Keep decisions reproducible independently of frame delta and animation speed.

**Exit criterion:** The starter encounter resolves through custom domain rules and scheduler-owned LimboAI intents without spatial targeting, frame-driven turns or duplicate effects. Deterministic domain fixtures and addon integration fixtures pass, including all [Phase 4 acceptance checks](phase4-combat.md#acceptance).

## Phase 5: Battle HUD, state flow and camera staging

**Status: Not started. Dependencies: 1, 4.**

- [ ] Build CanvasLayer/Control/Container scenes, shared Theme and five stable die controls.
- [ ] Expose skill/rank/target, costs, reservations, odds, result breakdown, kept dice and reroll budget.
- [ ] Create modal/focus and pointer-ownership policy; prevent panel click-through and held world movement.
- [ ] Validate wide/compact landscape, readable scaling, focus navigation and reduced animation.
- [ ] Display save-pending/failure through a test adapter and prove duplicate/stale input cannot repeat an action.
- [ ] Bind a battle State Charts adapter to accepted domain phases: pre-roll selection, locked hand, resolved activation and next actor/outcome. Guards reflect available commands; the domain revalidates every request. Re-entry/animation callbacks cannot reroll, commit or tick AI.
- [ ] Author Phantom Camera battle framing separate from exploration, with explicit priority handoff and cleanup. Skipping a tween or replacing a scene changes presentation only; combat targets remain encounter members.

**Exit criterion:** The [Phase 5 UI matrix](phase5-combat.md#acceptance) passes with State Charts and Phantom Camera in Godot runtime, including repeated entry, skipped motion and stale input. Simulated saves are clearly separated from Phase 6 disk acceptance.

## Phase 6: Durable saves and interrupted-session recovery

**Status: Not started. Dependencies: 2, 4, 5.**

- [ ] Define a versioned explicit profile/run/battle schema with exact 64-bit transport, finite coordinates and strict validation.
- [ ] Implement FileAccess checkpoints under user:// with two slots, checksums, sequence selection and read-back verification.
- [ ] Persist entry, roll/reroll/keep changes, actions and outcomes before enabling dependent mutation.
- [ ] Keep one candidate on failure; Retry saves the same state/RNG and does not execute the command again.
- [ ] Restore exploration layout/position/discovery and the exact active hand/reservations/statuses after a fresh process.
- [ ] Test truncated/corrupt slots, unsupported versions, interrupted writes, duplicate transactions and focus/suspension behavior.
- [ ] Reconstruct charts and camera targets from validated mode/battle state after load. Recreate AI blackboards from saved decision inputs; persist any accepted intent needed for continuation so resume neither redraws AI RNG nor submits an activation twice. Do not serialize live addon nodes or rely on chart history as the session save.

**Exit criterion:** Fresh-process continuation and injected save failures pass; corrupt/unsupported saves remain recoverable without silent reset. Persistence guarantees are measured, not inferred from FileAccess.

## Phase 7: Dialogue Manager town services and durable dungeon loop

**Status: Not started. Dependencies: 3–6.**

- [ ] Author Dialogue Manager 4 `.dialogue` resources and cues for one town NPC, a potion vendor, explicit free recovery and dungeon entry. Use a game-owned balloon and explicit mode context under persistent Main.
- [ ] Route dialogue conditions through observations and service mutations through validated application commands. Revalidate proximity/session on confirmation; repeated lines or clicks must not duplicate purchases/recovery. No direct economy writes in dialogue text.
- [ ] Integrate dialogue input/focus ownership and Phantom Camera conversation priorities; restore movement, focus and exploration framing on normal end, cancellation and scene replacement. Cancel stale awaits/subscriptions without granting anything.
- [ ] Use one temporary gold balance and bounded potions with saved, atomic purchase and pre-roll potion actions.
- [ ] Checkpoint battle entry/return; remove resolved encounters once; unlock exit only after required encounters.
- [ ] Implement success, defeat and explicit exploration abandonment under the first-loop retention table.
- [ ] Validate full exit/reward commit, lost pending rewards, retained unconsumed supplies, recovery and retry after a write failure.
- [ ] Run the complete loop on desktop and perform early Android/iOS export/runtime smoke checks; log target-specific gaps.
- [ ] Exercise fresh-process resume after accepted dialogue service commands and injected save failure; define safe conversation dismissal/restart without replaying mutations. QuestSystem remains unused for gameplay until Phase 9; a conversation is not an implicit quest.

**Exit criterion:** A user can converse, prepare, enter, fight, resume, exit or fail, recover and begin again with correct durable supplies/rewards and restored camera/input ownership. Dialogue replay cannot repeat a transaction. [Free exploration](free-exploration.md) owns the temporary economy.

## Phase 8: Inventory, skills and lasting progression

**Status: Not started. Dependencies: 7.**

- [ ] Author a complete per-outcome retention table for items, gold, XP, training, quest/title evidence and reservations before enabling inventory-backed runs.
- [ ] Replace temporary supplies with inventory instances, rectangular placement, stacks, non-nesting bags, equipment and saved overflow.
- [ ] Implement carried/banked gold and gold-bag capacity; define transition from temporary balances without losing saved value.
- [ ] Implement NPC/book/page skill acquisition, rank training to 100, explicit AP rank-up and prototype rank caps.
- [ ] Implement character XP/current and cumulative levels, talent mastery, stat-source recomputation and no-refill rules.
- [ ] Implement First/Second title collection and selection, run snapshots and outcome-based evidence; introduce corresponding feature panels.
- [ ] Test duplicate reward/rank/title grants, inventory atomicity, pending retention and fresh-process continuation.
- [ ] Extend Dialogue Manager service commands for NPC lessons and progression views; learning grants Rank F, while rank-up remains a separate validated town action. Persist deduplicated milestone evidence for later quest eligibility without implementing QuestSystem rewards yet.

**Exit criterion:** A retained run reward can improve the next run through equipment or trained/AP-funded skills; all ownership, loss and overflow rules are explicit and saved.

## Phase 9: QuestSystem progression, enchanting and rebirth

**Status: Not started. Dependencies: 8.**

- [ ] Create game-owned Quest subclasses and a QuestSystem adapter mapping stable domain quest IDs to integer Quest.id values. Keep per-session instances separate from authored Resources; represent Locked and Ready-to-complete explicitly alongside available/active/completed pools.
- [ ] Author the first quest slice: one short Chapter/Generation chain, an NPC sidequest, an automatically delivered rank-milestone Skill Quest and an NPC-offered skill-unlock quest. Validate prerequisites, ordered objectives and reachable acquisition paths.
- [ ] Feed deduplicated committed evidence into QuestSystem; keep the run's eligible-stage snapshot and pending evidence separate until its outcome commits under Phase 8 policy. Add journal tabs, tracking and distinct objective-ready/return-to-NPC/reward-claimed feedback.
- [ ] Integrate Dialogue Manager quest offers and explicit hand-in/claim commands. Atomically revalidate objectives/items, consume costs, grant rewards/overflow, record the claim ID and unlock successors through the save gate; only then synchronize QuestSystem pools and notifications. Plugin completion signals never grant rewards.
- [ ] Persist explicit quest lifecycle/stage/evidence/claim data in the combined save and reconstruct pools without replaying start/complete rewards. Test changed inventory invalidating readiness, repeated dialogue claims, interrupted automatic delivery and switching sessions without pool leakage.
- [ ] Add skill quests, item hand-ins and quest-awarded titles without bypassing skill acquisition/rank rules.
- [ ] Implement prefix/suffix enchant application and separately confirmed burning with output-space validation and a dedicated saved RNG stream.
- [ ] Author rebirth eligibility, age choices, cost/cooldown and aging-clock policy; implement retained mastery versus reset life growth.
- [ ] Add the required town services and reconcile aging only at safe town/result boundaries.
- [ ] Add equipment- and talent-rebirth-triggered Skill Quests when their consumers work; recover milestone delivery idempotently and preserve committed quests/claims across rebirth. Keep repeatable/daily quests deferred.
- [ ] Exercise a complete level/train/rank-up/rebirth cycle, quest claims and failed-save retries without duplicated rewards.

**Exit criterion:** The authored QuestSystem/Dialogue Manager slice and the level/train/rank-up/rebirth loop are playable and persistent. Claims, successor delivery, enchant results and rebirth survive save retries without duplication; pending evidence never commits early and rebirth preserves documented mastery and quest history.

## Phase 10: Role-playing missions and advanced combat

**Status: Not started. Dependencies: 9.**

- [ ] Create isolated authored NPC mission sessions with explicit return/failure policy and no borrowed-item export.
- [ ] Add multi-enemy ordering and encounter-member target sets before enabling area skills.
- [ ] Author and implement Counterattack, Final Hit, Windmill, criticals and equipment masteries in separately tested increments.
- [ ] Redesign Charge for non-spatial battles or keep it disabled; no grid/range mechanic is silently reintroduced.
- [ ] Persist reaction inputs, multi-target sets, critical outcomes and mission context; test exactly-once training across passives.
- [ ] Add Master Titles or further rank tiers only with reachable authored objectives and a defined economy.
- [ ] Route RP mission entry/return through Dialogue Manager and State Charts with a separate NPC session; only its committed scenario outcome may advance QuestSystem. Test success, failure and suspension without borrowed gear/training leaking into the hero.
- [ ] Extend LimboAI trees only for authored multi-enemy rules; preserve manual scheduling, target ordering, per-agent blackboards and AI RNG continuation. Camera group framing is cosmetic, not an area-target resolver.

**Exit criterion:** Each enabled extension has explicit rules, content, UI, save/restore and regression coverage; unsupported skills remain unavailable.

## Phase 11: Procedural dungeons and content expansion

**Status: Not started. Dependencies: 7; 8–10 for dependent rewards/features.**

- [ ] Implement seeded room selection using stable IDs, connector matching and a bounded attempt budget.
- [ ] Validate overlap, navigation clearance, room reachability, required encounters and exit access; provide a known valid fallback.
- [ ] Persist the generated layout and generator/content versions rather than trusting regeneration across engine changes.
- [ ] Add encounter/loot variety and progression pacing with authored tables; keep RNG streams independent.
- [ ] Exercise many seeds and worst-case layouts; add floors/towns/gathering/cooking only with complete consuming rules.
- [ ] Validate generated encounter bindings to LimboAI trees, Phantom Camera room limits and eligible QuestSystem evidence against saved stable room/encounter IDs. Keep hidden rooms out of camera transitions and quest observations; moving NPC AI requires a separate authored feature contract.

**Exit criterion:** Generated runs remain traversable and completable, reproduce layout fixtures under pinned versions and restore their saved layout correctly.

## Phase 12: Presentation, accessibility and performance

**Status: Not started. Dependencies: 7; relevant feature phases.**

- [ ] Replace placeholder art with original licensed assets, animation, sound and music; record asset attribution.
- [ ] Polish transitions and feedback without animation-driven rules; provide reduced motion and independent audio controls.
- [ ] Implement text/UI scale, color-independent status cues, input remapping and verified keyboard/touch focus flows.
- [ ] Profile target scenes on representative devices and optimize measured memory/frame-time/loading issues.
- [ ] Hide development controls and review safe areas, compact layouts, long text and export asset filters.
- [ ] Polish Phantom Camera follow/transitions and Dialogue Manager balloon layout together; test reduced motion, long dialogue/quest text, focus restoration and pause/cancel paths. Profile chart callbacks and behavior-tree ticks before optimizing.

**Exit criterion:** Supported layouts remain readable and responsive through the full loop, with measured performance targets and no development-only UI exposed.

## Phase 13: Regression, balance and release candidate hardening

**Status: Not started. Dependencies: 8, 9, 11, 12; 10 if enabled.**

- [ ] Run content validation, exhaustive scoring, rule fixtures, save fault injection and complete progression regression suites.
- [ ] Playtest battle length, resource exhaustion, reward pacing, training/AP access and rebirth motivation.
- [ ] Test missing assets, load failures, repeated transitions, long sessions and supported save upgrade paths.
- [ ] Exercise the complete target feature matrix and document known limitations with reproducible evidence.
- [ ] Freeze candidate content/rules versions and ensure test/import failures produce failing automation exit codes.
- [ ] Freeze the selected addon versions and run an integration matrix covering chart re-entry, manual AI scheduling, camera handoffs, dialogue mutation retries, quest claim/restore and autoload session cleanup. Reverify upgrades rather than assuming upstream API or save compatibility.

**Exit criterion:** The release candidate has a reproducible passing regression record, accepted balance and a reviewed list of remaining limitations.

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
| Rebirth eligibility/cost/cooldown, aging clock and enchant economy | Phase 9 exit |
| Quest ID mapping, ready/claimed lifecycle, evidence retention and pool reconstruction | Phase 9 exit using Phase 8 retention policy |
| Reaction/area rules and non-spatial Charge disposition | Before each Phase 10 feature |
| Platform performance budgets and supported device coverage | Phases 12–14 |
| Connected services, purchases and gacha inclusion | Separate Phase 15 product decision |

## Verification record

2026-09-11: Phase 1 host acceptance completed. Persistent guarded State Charts shell and isolated addon fixtures pass on Godot `4.7.2.stable.official.ed1daf0bf`; Beckett input/focus/loading/resize playtests pass. Final resource packs exclude demos, editor-only camera assets and C# examples while preserving runtime dependencies and license notices. A documented local State Charts compatibility patch removes a reproduced pinned-engine shutdown leak. Matching templates and executable/device acceptance remain outstanding. [Retained evidence](evidence/phase-1/README.md).

2026-09-11: Documentation-only replanning against `project.godot`, local addon version files and [AGENTS.md](../AGENTS.md). Enabled plugin/autoload configuration was inspected; no new runtime, export or feature acceptance is claimed. All new checklist items remain unchecked. Phase 1 owns fresh qualification of the configured stack.

2026-09-10: Phase 0 verified with the pinned Godot editor: import, runtime launch through Godot MCP, headless fixture pass and intentional failure, and resource-pack exclusions for all five presets. Full exports fail on absent templates; SDK/signing prerequisites are recorded per target. [Retained commands, results and screenshot](evidence/phase-0/README.md). This does not claim executable export or mobile acceptance.
