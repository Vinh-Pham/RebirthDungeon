# Immutable campaign state

Implemented October 2, 2026 with Immer 11.1.18. This applies to journey checkpoints and RPG candidate operations. Battle simulation, Miniplex entities, RNG generators, session instances, animation queues, audio and storage adapters retain their existing lifecycles.

## Ownership and updates

`Hero` and `CampaignState` describe mutable schema/export data. `HeroSnapshot`, `CampaignSnapshot` and `DungeonSnapshot` describe deeply read-only observations. `JourneySession.getSnapshot()` exposes the committed campaign root directly, freezes the whole view, and shares unchanged branches between revisions. Calling it does not reconcile quests, grant progression or draw randomness.

The engine's `immutableState.ts` owns an Immer instance with automatic freezing enabled in every environment. No global Immer configuration, patches, Map/Set plugins or class drafting is used. Only owned plain JSON data enters a producer. Parsed external saves become independent data before freezing; callers' save objects and audio inputs remain editable.

Each leaf journey command runs one synchronous campaign producer. Reusable `*Draft` RPG operations compose within it: Rest skill use stages one recovery tick before durable publication; runtime START_REST/STOP_REST posture is staged beside service metadata, copied into candidates and excluded from saved JSON; lessons combine acquisition, fees and milestone AP; books combine acquisition and consumption; quest claims combine deliveries, skills, items and rewards; enchants combine costs, results, receipts and their persisted RNG. Public RPG candidate functions return frozen heroes. Mutable fixtures or consumers that need editable data must explicitly clone those outputs.

`TRAVEL_TO` remains a sequence of `MOVE` commands. Each step ticks resources and publishes its own checkpoint/event; travel stops at the first encounter. There is no producer spanning an entire path.

Resource/stat queries use `readPlain` where repeated draft traversal would otherwise create unnecessary proxies. This reads the latest draft, including earlier writes in that transaction. Its result is a temporary read projection, not a published snapshot or an object to mutate. Map projection reads only geometry-related inputs; movement and changes to inventory do not rebuild unchanged map geometry.

## Rejection, commit and notification

Recipes stage RNG in a local stream together with messages, open-service state, respawn requests and outgoing events. Validation or rule rejection discards all staged writes and draws, leaving the existing view, ECS and metadata unchanged. Quest/title reconciliation occurs inside initialization or accepted transitions, never during observation.

After a recipe succeeds, the session publishes its frozen state and RNG checkpoint, synchronizes independent ECS components, builds the view and then delivers notifications. Listener failures are aggregated after delivery and reported as a committed-action notification error. They do not undo or authorize replaying the action. Reentrant commands are rejected during delivery.

`applyHero` copies inventory, training, weapon/enchant values and temporary effect entries into simulation-owned components. Draft proxies and frozen campaign components must never escape into mutable entities. Encounter evidence and results remain isolated until the existing host operation commits them.

## Durable candidates and saves

A candidate has an independent session/engine but starts from the source's immutable campaign root and cached map. Its producer changes only the necessary branches. The complete candidate still passes campaign validation before saving. `JourneyHost` retains the exact candidate after a failed write and retries that write without running the producer, charging costs or drawing randomness again.

The host and autosaver retain frozen checkpoint references instead of deep-cloning every notification. Repository encoding still validates and serializes a complete save. `toSave()` intentionally returns a detached, editable JSON copy for export and callers that need mutation. Loading still parses/validates independent data. Wire saves now use version 13 to grant default Rank F Rest once without refilling resources or changing earned progression. Version 12 added optional secondary-hand bow ammunition. Version 11 added the item hotbar; those migrations and platform storage contracts remain intact. Equipment/ammunition changes use the same owned campaign transition, and battle consumption stays isolated until durable settlement.

## Verification and performance

`src/tests/world/ImmutableCampaign.test.ts` covers frozen observations, unchanged references, old-view preservation, input ownership, editable exports, late page-capacity and dungeon-validation rollback, independent candidates/ECS, listener errors/reentry, per-step travel, battle restarts, composed quest/book operations, finalized enchant receipts and retained autosave retries. Existing gameplay, migration and durable transaction suites remain applicable.

Run the headless diagnostic with Node 24+ and installed development dependencies:

```sh
node --expose-gc scripts/profile-campaign.mjs
# The optional argument profiles an alternate checkout with dependencies installed:
node --expose-gc scripts/profile-campaign.mjs /path/to/baseline
```

The diagnostic reports median/p95 latency, retained heap after explicit GC and canonical campaign fingerprints. It warms movement for 200 steps and retains the following 1,000 views. Candidate measurements warm 50 operations and measure 100 independent candidates. Timings include candidate construction and validation but exclude disk writes and rendering.

A local Node 24.21.0 run compared baseline commit `52915fa` with this implementation, using identical content/seeds. Values are diagnostics, not device guarantees:

| Operation                                    | Baseline median / p95 (ms) | Immer median / p95 (ms) |
| -------------------------------------------- | -------------------------- | ----------------------- |
| Starter movement                             | 0.034 / 0.047              | 0.062 / 0.111           |
| Generated dungeon with 200 weapons: movement | 0.244 / 0.297              | 0.075 / 0.126           |
| Same dungeon: inventory candidate            | 11.557 / 12.736            | 5.701 / 6.406           |
| Starter inventory candidate                  | 0.134 / 0.231              | 0.226 / 0.343           |
| Instructor lesson candidate                  | 0.193 / 0.268              | 0.244 / 0.332           |
| Starter battle settlement candidate          | 0.127 / 0.169              | 0.309 / 0.428           |

Retaining 1,000 movement views used approximately **2.19 → 0.52 MiB** for the starter and **69.15 → 0.52 MiB** for the populated dungeon. All six canonical campaign fingerprints matched the baseline, including progression, encounter results and saved RNG. Immutable sharing helps large checkpoints; proxy/freeze work adds overhead to small transactions. Complete save validation/serialization remains a cost at durable boundaries. Keep freezing enabled and profile on target devices before treating desktop results as a release performance budget.

iOS and Android Hermes bundles and the web static export compile successfully. A compact 390×844 web smoke check verified character creation, movement, supply collection, inventory inspection, equipping and autosave restoration. Native device interaction and Hermes performance have not been measured.

## Documentation sources

Official Immer sources were retrieved with Firecrawl; raw research stays in ignored `.firecrawl/` files:

- [Repository and release](https://github.com/immerjs/immer/releases/tag/v11.1.18)
- [Producing state and structural sharing](https://immerjs.github.io/immer/produce/)
- [Freezing shared data](https://immerjs.github.io/immer/freezing/)
- [Tree and draft limitations](https://immerjs.github.io/immer/pitfalls/)
- [Readonly TypeScript types](https://immerjs.github.io/immer/typescript/)
- [Performance and reading drafts](https://immerjs.github.io/immer/performance/)
