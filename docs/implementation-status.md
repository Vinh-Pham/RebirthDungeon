# Defold implementation status

Updated 2026-09-20. The first playable slice of [game-plan.md](game-plan.md) is implemented. This status describes source and verified behavior separately; the detailed gameplay documents also contain later expansion requirements.

## Implemented

- Message-driven UI projections, neutral/scaled HUD, visible keyboard focus, guarded battle/reward actions, character source details and parent-aware Escape. GUI modules do not import game logic.
- Title, up to 20 character slots, creation, resume, town, dungeon, battle, rewards, treasure and rebirth screens. Druid owns GUI controls; sibling Monarch proxies own screen lifetimes. The persistent root owns session, HUD and audio.
- Versioned, validated profile candidates with stable operation and claim identities. DefSave writes alternating A/B slots; the session checks a read-back before publishing. A native OS lock prevents concurrent writers. Save failures offer retry of the same candidate or reload. Newer or unrecoverable profiles are preserved; a recovered profile can repair its damaged companion slot.
- Human, Elf and Giant restrictions; four starter talents; equipment, resource pools, 199 EXP thresholds, level 200 cap, AP, fractional growth, Los Angeles weekly aging and rebirth cooldowns. No duplicated rebirth equipment gifts.
- Town1's healer, grocer, bank, blacksmith, general shop and Alby gate, with an authored square, stream/bridge, roads, houses and outskirts. Thirty carried slots plus equipped items, 60 bank slots, stacks, buying/selling, exact-quantity item/gold transfers, healing, equipping and repairs. Inventory has a paged Druid list, message-based rule previews, item details/disabled reasons, keyboard selection and confirmed discard outside battle/rewards. Whole bank moves preserve instance IDs and durability.
- Normalized keyboard movement, native A* click routes, shortest reachable NPC approaches with automatic service opening, map destinations, physics service triggers, kinematic player collision and static walls derived from shared occupancy. Panels, suspension and focus loss stop controls; world position checkpoints persist.
- Eight connected rooms: entrance, three required encounters, boss, two optional rooms and a treasure chamber beyond the boss. The required-room gate, supplies, enemy groups, boss adds and treasure are persisted.
- Starter skill journal with category tabs, F-rank details, exact costs, requirements, source notes and guarded battle use. Stable bounded training objectives and frozen run rank maps; rules-version-1 aggregate training migrates without resetting progress. Full F–1 advancement/acquisition remains deferred.
- Fixed-Speed turns with saved tie order, turn-start recovery, fractional Attack cost, one optional item, starter skills, Defense, poison/armor break, cooldowns, limited enemy policy, weapon wear, training and bounded ordered events. Battle log, damage previews and committed visual feedback are presentation only.
- Structured combat log with a 100-event active/latest encounter, whole-operation trimming, actual/calculated damage, retained terminal batches, expandable bounded details, stable reading anchors and read-only menu access. Newer log formats are preserved; legacy active histories migrate as partial. The measured 20 × 1,000-event archive candidate exceeds the current save budget and remains deferred.
- Exact-quantity purchase and restoration previews with authoritative disabled reasons. Six authored NPC Ink stories, version-one continuation compatibility, explicit restart, and atomic tagged healing/bread choices. Candidate-bound Quest onboarding and versioned Ink dialogue replay. Experience, reward selection, overflow rejection, key-funded chest openings and goddess return are transactions. The boss grants one run-specific key, each of five chests opens once per key, and the statue returns to the town gate.
- CC0 Kenney placeholder sprites; original placeholder audio; volume settings, reduced motion and HUD text scaling. All 11 planned libraries are integrated at exact revisions.

## Source map

| Path | Responsibility |
| --- | --- |
| `main/` | Persistent bootstrap, audio and Monarch registration |
| `game/runtime/session.lua` | Sole committed-state owner and save-before-publish boundary |
| `game/domain/` | Pure rule modules, command routing and validation |
| `game/content/` | Versioned authored/source-adapted content |
| `game/services/` | Save, RNG, pathfinding, Quest and Ink adapters |
| `game/presentation/` | Pure compact/full combat-log formatting and bounded selectors |
| `game/ui/` | Druid presentation and input controller |
| `game/world/`, `screens/` | World movement/collision and proxy resources |
| `native/session_lock/` | Desktop process writer guard |
| `tests/` | Lester, native fixtures, fresh-process restart checks and GUI journey |
| `tools/` | Pinned builds and optional Ink authoring |

The first implementation keeps related rules in cohesive modules rather than creating every proposed future subdirectory. Panels are drawn in the persistent GUI. All blocking panel, confirmation, service and dialogue lifetimes use sibling Monarch collection-factory popups that pause the underlying proxy; bootstrap simulation is gated separately. Panel changes clear transient controls without nesting town screens.

## Deferred by the plan

Milestone 6: full F–1 advancement UI, broader verified skill trees and acquisition, footprint inventory, extended quests/RP, titles, enchants and per-battle archives. Critical Hit/counter/Mana Shield and other non-starter rules are not advertised as available content. Talent and Pets panels state their current limits.

Multiplayer, cloud synchronization, web delivery, old browser-save import, additional locations and final art are outside this release. The save format does not import browser data. The explicit ASCII name policy and bounded Los Angeles timezone adapter are documented in the README and content provenance.

See [verification](verification.md) for measured checks, desktop targets and remaining manual/distribution work. A source feature is not evidence of cross-platform acceptance.
