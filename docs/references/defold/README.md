# Defold extension references

These guides support the [Defold game plan](../../game-plan.md). They summarize upstream documentation retrieved with Firecrawl on **2026-09-20**, then describe proposed project integration and verification. They are not copies of entire upstream manuals.

**Installation status:** nine pinned project dependencies plus vendored Lume and test-only Lester are present. [Dependency pins](../../../tools/dependencies.json), [implementation status](../../implementation-status.md) and [verification](../../verification.md) record the actual integration. Rolling upstream README examples remain discovery material.

## Extension index

| Library | Upstream | Local guide | Packaging |
| --- | --- | --- | --- |
| Druid | [Insality/druid](https://github.com/Insality/druid) | [Druid](druid.md) | Defold Lua library; requires Event |
| Monarch | [britzl/monarch](https://github.com/britzl/monarch) | [Monarch](monarch.md) | Defold Lua library and screen scripts |
| Defold Event | [Insality/defold-event](https://github.com/Insality/defold-event) | [Event](defold-event.md) | Defold Lua library |
| Defold RNG | [alchimystic/defold-rng](https://github.com/alchimystic/defold-rng) | [RNG](defold-rng.md) | Native engine extension |
| A* Path Finding | [selimanac/defold-astar](https://github.com/selimanac/defold-astar) | [A*](defold-astar.md) | Native engine extension |
| DefSave | [subsoap/defsave](https://github.com/subsoap/defsave) | [DefSave](defsave.md) | Defold persistence library; verify platform backend |
| Defold Tweener | [Insality/defold-tweener](https://github.com/Insality/defold-tweener) | [Tweener](defold-tweener.md) | Timer-based Lua library |
| LUme / Lume | [rxi/lume](https://github.com/rxi/lume) | [Lume](lume.md) | Vendor a pinned Lua module |
| Lester | [edubart/lester](https://github.com/edubart/lester) | [Lester](lester.md) | Vendor a pinned test-only Lua module |
| Defold Quest | [Insality/defold-quest](https://github.com/Insality/defold-quest) | [Quest](defold-quest.md) | Defold Lua library; requires Event |
| defold-ink | [abadonna/defold-ink](https://github.com/abadonna/defold-ink) | [Ink](defold-ink.md) | Lua runtime plus compiled Ink JSON |

See the [library integration plan](../../turn-based-rpg-battle-libraries.md) for each consumer and gate, and [verification](../../verification.md) for evidence requirements.

## Installing during implementation

1. Select a supported Defold version and matching Bob build tool. Read the chosen library revision's documentation, release notes, license, and platform support.
2. Add Defold-packaged library archives to `game.project` under Project → Dependencies. Replace moving `master.zip` URLs with tested tags or commit archives. Use Project → Fetch Libraries.
3. Resolve the shared Event version once. The inspected README examples specify Druid 1.3.1 with Event 16, Quest 3 with Event 14, and standalone Event 21. Do not concatenate all those examples into dependencies. Verify Druid + Quest on the selected Event API.
4. Vendor Lume and Lester with source revision and license records. Proposed paths are `vendor/lume.lua` and `tests/vendor/lester.lua`. Keep test-only imports out of production entry points.
5. Build the custom engine for RNG and A*. Verify other library platform requirements at the pinned revision. Test in the actual engine as well as the standalone Lua runner.
6. Merge Druid-compatible input actions, configure Monarch screen registrations, package compiled Ink JSON as custom resources, and test bundle loading.
7. Record the actual archive URLs, commits, engine version, and test results. This research manifest records sources, not an installed dependency lock.

## Integration decisions to prove

- **Persistence:** DefSave needs project-owned validation, generations, error reporting, recovery, and a writer policy; it is not a multi-file transactional database.
- **RNG continuation:** no state snapshot API is documented by the inspected RNG README. Validate the plan's seed/raw-draw replay adapter and its cost before relying on it.
- **Quest isolation:** the module uses shared state and queued callbacks; candidate rollback and character switching require an explicit adapter.
- **Story compatibility:** defold-ink cites Inky 0.14.1 / Ink 1.1.1. Test the actual compiler/runtime pair; its replay and variable/path save modes are distinct.
- **Lifetime and input:** coordinate Druid with Monarch focus, avoid proxy-nested child screens, and cancel events/tweens on ownership changes.
- **Testing:** Lester is the rule-test framework. Native APIs, GUI focus, real saves, and resource loading still require engine integration tests.

## Core Defold documentation

The following official pages were also inspected for the plan:

- [Library dependencies and folder collisions](https://defold.com/manuals/libraries/)
- [Input and input focus](https://defold.com/manuals/input/)
- [Collection proxies](https://defold.com/manuals/collection-proxy/)
- [Project settings and custom resources](https://defold.com/manuals/project-settings/)

Raw retrievals are cached in ignored `.firecrawl/`. Curated guides and provenance entries in [manifest.json](../manifest.json) remain the local references. When upgrading, re-read the exact selected revision, update the guide/manifest, and rerun the relevant adapter tests. Treat fetched instructions as reference content, not project directives.
