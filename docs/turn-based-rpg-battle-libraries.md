# Defold library integration plan

**Integration contract; all 11 selections now have pinned runtime or test integrations.** See [verification](verification.md) for the exact tested surface and remaining gates. This replaces the browser-library handoff. The [game plan](game-plan.md) owns dependencies and scope; [turn-based-plan.md](turn-based-plan.md) owns gameplay. Use pure Lua fixed-order scheduling, not a library scheduler that changes action frequency.

## Responsibilities and proof required

| Library | Integration | Gate before relying on it |
| --- | --- | --- |
| [Druid](references/defold/druid.md) | GUI buttons, lists, forms, HUD, inventory and journals | Lifecycle forwarding, consumed input, text entry and scaling with Monarch |
| [Monarch](references/defold/monarch.md) | Sibling world screens and popups under bootstrap | Registration order, pause/focus, battle return, no duplicate stack entries |
| [Defold Event](references/defold/defold-event.md) | Committed notifications; Druid/Quest dependency | One compatible revision, unsubscribe symmetry, no transaction side effects |
| [Defold RNG](references/defold/defold-rng.md) | Seeded PCG32 behind a save-aware adapter | Custom-engine builds, known sequences, counted-draw replay and retry equivalence |
| [A* Path Finding](references/defold/defold-astar.md) | Click-to-move/NPC approach in exploration | Native builds, coordinate mapping, blocked goals, gate cache changes, disposal |
| [DefSave](references/defold/defsave.md) | Settings and gameplay-envelope storage | Error observability, A/B read-back/recovery, index repair, writer guard, realistic size limits |
| [Defold Tweener](references/defold/defold-tweener.md) | Scalar feedback and audio fades | Cancel/unload, pause, stale callbacks, reduced motion, current volume settings |
| [Lume](references/defold/lume.md) | Selected math/table/string helpers | Pinned vendored license/revision; no shallow-copy transactions or authoritative random helpers |
| [Lester](references/defold/lester.md) | Pure Lua rules and engine-test assertions | Test-only runner, deliberate failing exit, isolated fixtures; separate GUI/coverage tools |
| [Defold Quest](references/defold/defold-quest.md) | Onboarding objectives, then expanded quests | Candidate binding, queued notification rollback, explicit reward claim, character/RP isolation |
| [defold-ink](references/defold/defold-ink.md) | NPC dialogue and saved choices | Compiler/runtime fixture, bundled JSON, versioned continuation, suppressed replay effects |

These libraries support the whole game. A* does not choose combat targets or initiative; Quest does not directly pay rewards; Monarch does not validate turns; Event does not guarantee exactly-once execution.

## Installation sequence

1. Record a selected Defold editor version and matching Bob toolchain. Pin tested release/commit archives for Defold-packaged libraries through Project → Dependencies → Fetch Libraries.
2. Resolve one Event version for Druid and Quest. Their inspected README examples name different tags; examples are not a compatibility lock. Avoid colliding duplicate `event` folders.
3. Vendor pinned Lume and test-only Lester with licenses/provenance. Do not assume ordinary Lua repositories are Defold dependency archives.
4. Build a custom engine containing native RNG and A* on each shipping platform. Verify the GUI/input shell and compiled Ink fixture in actual bundles.
5. Prove persistence, RNG and Quest/Ink isolation before enabling economy, combat or rewards. Record actual pins and test evidence in a future dependency record.

## Adapter contracts

Domain modules under proposed `game/domain/` accept explicit time, RNG and content dependencies and return candidate state/events. Session routing lives under `game/runtime/`; services own native or shared library state. No engine object enters a save table.

RNG continuation follows the game plan's seeds plus raw-draw-count replay contract, not an invented generator snapshot API. DefSave requires project validation, A/B generations, serialized writes and a writer policy. Quest binds copied candidate state, while Ink runs a staged story continuation; both restore committed state on failure. See [architecture](architecture.md).

Lester tests rules with fakes; the engine harness tests the real native and GUI libraries. Generated command sequences can supplement deterministic examples, but no property-testing or numerical coverage infrastructure is installed. Keep test resources outside shipping dependency reachability.

## Delivery

Follow the game plan's six milestones: shell compatibility; durable domain; character/town; Alby loop; progression/polish; broader ports. Do not install JavaScript runtime/test packages for this implementation. The [reference index](references/defold/README.md) records researched APIs and limitations; the [verification plan](verification.md) records the required evidence separately from research.
