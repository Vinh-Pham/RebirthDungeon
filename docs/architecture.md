# Rebirth Dungeon architecture

Open the repository-root [game.project](../game.project) to build the game.
Defold collections and tooling resolve resources relative to that root.
The playable Lua code and game-facing assets live under `game/`.

| Directory | Ownership |
| --- | --- |
| `game/core/` | Session commands, world and grid state, Decore landmark index, movement scheduler, bounded Chronicle events, seeded RNG |
| `game/systems/` | Movement and AI, ATB combat and guard effects, anatomy and progression, inventory and equipment, economy, factions, environment and dialogue |
| `game/generation/` | Settlement links, terrain and town generation, dungeon rooms, checkpoint history and encounter scaling |
| `game/data/` | Character, enemy, item, skill and faction definitions, plus authored and compiled Ink dialogue |
| `game/rendering/` | Clipped grid renderer, tile atlas and rotLove shadowcasting utility |
| `game/ui/` | Active Flow screen and components, Chronicle text, Monarch screen proxies |
| `game/persistence/` | Profile storage, validation and save migration |
| `game/vendor/rot/` | Lua-only rotLove modules |
| `game/tests/` | Shared LuaJIT and DefTest suites, launched by the root `tests/` entry points |

The session owns gameplay state and commits profile changes through
`game/persistence/save.lua`. The Decore index is transient, refreshes when the
world's landmarks change and supplies live service proximity checks. Flow owns
the persistent GUI and input. Monarch tracks the title, character list, creation,
arrival and world screen lifetimes. Existing profile keys and save locations
remain compatible after the module moves.

The mutation catalog is ready for authored definitions. The current game has no
mutation effects in its encounters or profiles. The visibility module exposes
shadowcasting for callers that need it. The playable map continues to show its
full viewport.

See the [dependency inventory](defold-dependencies.md) for the exact commits and
runtime integration points. The sections below record the original first-slice
design for the legacy controller and its fixtures.

## One command, one durable result

1. Input submits a command with an operation ID and expected revision. Battle commands also identify battle, actor and expected turn.
2. Check phase, active owner, living targets, content, resources, permissions and duplicate claims against committed state.
3. Copy owned state and compute the complete candidate: costs, effects, progression, RNG continuation, quest/story state, events, claim markers and workflow checkpoint.
4. Validate and persist through the save adapter. Serialize writes and prevent competing commands during commit.
5. Only a confirmed save publishes the candidate. Then notify through Event, request Monarch navigation, and present effects.
6. On failure retain the previous committed state, restore staged library bindings and allow a safe retry. If write outcome is uncertain, inspect disk before retrying.

Use a bounded operation ledger plus durable reward/quest/chest claim IDs. Required consequences belong in the candidate; notification subscribers cannot grant rewards, advance turns or start independent writes. Presentation callbacks only release pacing. Restart reconstructs the checkpoint and may skip animations without re-executing outcomes.

## Persistence and writer policy

[DefSave](references/defold/defsave.md) is the backend for a separately versioned Defold format. Use a stable application name, at most 20 characters, one unfinished run per character, and settings in a separate file. Keep character, run, battle, quest/story, pending rewards, RNG and claims together in one gameplay envelope.

Maintain A/B slots per character with monotonic generations. Write the inactive slot, observe errors, reload and validate it before publication. Startup selects the highest valid generation and retains the prior valid slot; no separate active-slot pointer is needed. Reconcile the character index against stable profile IDs and slots after interrupted creation. Reject unsupported future formats without overwriting them; never silently default corrupt existing data.

DefSave does not guarantee transactional multi-file writes, schema validation, observable error results, locking or crash durability. Prove the selected backend's behavior and patch/adapt it if necessary. Use explicit saves at actions and transitions, periodic movement checkpoints, and supplemental shutdown saving. A tested process lock or equivalent must prevent two desktop instances writing the same directory. Browser save import is deferred until real fixtures and a conversion contract exist.

## Randomness

[Defold RNG](references/defold/defold-rng.md) provides separate world, reward and battle streams. Persist `{format_version, algorithm, seed_state, seed_sequence, raw_draw_count}` for explicitly seeded PCG32; seed fields are exactly representable 32-bit integers. Sample only through counted `number()` draws, including rejected range samples. Restore by replaying the raw draw count. No native state-export API is assumed.

Keep mapping/derivation versions, stable effect iteration order, probability-edge fixtures and known native sequences. Validate continuation and bound replay cost on every shipping platform. Store generated layouts and offers. Previews/rejections consume nothing; failed candidates never advance committed RNG. Lume and cosmetic effects must not supply authoritative randomness. Future RP or enchant streams require their own isolated descriptors.

## Quest and story transactions

[Defold Quest](references/defold/defold-quest.md) evaluates objectives against a copied candidate binding before initialization/event processing. Collect notifications and suppress outward effects until commit. On failure restore the prior binding and clear/rebuild pending notifications. Initialization and character switching must not leak singleton state. Completion and reward claims remain distinct facts with permanent claim IDs.

[defold-ink](references/defold/defold-ink.md) restores or recreates a candidate story for each durable choice. Persist continuation with domain effects. Choose and version one supported save representation; suppress external gameplay calls and observers during replay. Package compatible compiled Ink JSON as custom resources. Ink variables never become another inventory or quest store.

## Lifetime and input

Register Monarch world screens and popups as siblings under bootstrap; avoid proxy-nested screens. Druid owns GUI interaction and must receive lifecycle callbacks and return input consumption. First-slice service panels and modals stop movement and pause world updates; gate root-owned simulation separately. Clear held keys on focus loss and transitions.

One player controller writes movement. A* routes and collision geometry derive from the same occupancy, with explicit camera/grid conversion. Keyboard input cancels routes. Release A* maps, Event subscriptions, timers and Tweener handles with their owners. Use native property animation where suitable; Tweener callbacks only render saved results. Shared Lua state requires explicit reset between characters and test cases.

See [UI](gameplay/user-interface.md), [battle](turn-based-plan.md), [library integration](turn-based-rpg-battle-libraries.md), and [verification](verification.md) for consuming contracts.
