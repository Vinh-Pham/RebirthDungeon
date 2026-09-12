# Documentation and Godot project directory

Updated **2026-09-10**. Paths in the proposed tree are relative to the project root (`res://` in Godot). They are planned placements, not files claimed to exist. Phase 0 now implements `scenes/main.tscn`, `tests/run_tests.gd`, `tests/fixtures/baseline_fixture.gd`, `tools/` verification/pins and `export_presets.cfg`; Phase 1 adds the application shell and Phase 2 adds `content/`, `scripts/data/`, domain state/rules/commands and focused fixtures. Phase 3 adds `scenes/exploration/`, `scripts/exploration/`, exploration continuation state, room/encounter definitions and generated pixel art. See [Phase 3 implementation](phase3-implementation.md). Other feature folders remain planned. See [baseline commands](phase0-baseline.md) and [Phase 2 contracts](phase2-implementation.md).

## Reading order and ownership

| Document | Owns |
| --- | --- |
| [Overview](overview.md) | Game identity, pillars, core loop and scope |
| [Game Plan](game-plan.md) | Godot architecture, data ownership, persistence and platform strategy |
| [Project Phases](project-phases.md) | Delivery order, status, acceptance and new evidence |
| [Free exploration](free-exploration.md) | Continuous movement, encounter transitions and first-loop economy |
| [Phase 2](phase2-foundations.md) | Resource validation, versions and RNG contract |
| [Phase 3](phase3-movement.md) | Godot exploration integration and acceptance |
| [Phase 4](phase4-combat.md) | Provisional starter combat fixtures |
| [Phase 5](phase5-combat.md) | Battle UI integration and acceptance |
| [Phase 6 implementation](phase6-implementation.md) | Durable session schema, checkpoint storage and recovery |
| [References](references.md) | Official Godot sources and historical gameplay inspiration |
| [Audit](audit.md) | Reset findings, design decisions and verification limits |

The numbered phase notes retain their filenames for stable links, but now describe planned Godot work. Completion belongs only in the tracker. Gameplay specs own mechanics; the starter/free-exploration notes explicitly narrow the first slice without silently replacing later feature requirements.

## Gameplay specifications

| Document | Rules | Initial consuming phase |
| --- | --- | --- |
| [Battle](gameplay/battle.md) | Five dice, skill locking, scoring and activations | 4 |
| [Stats](gameplay/stats.md) | Resources, modifiers, effects and timing | 4 |
| [User interface](gameplay/user-interface.md) | Godot Control layouts, input and feature views | 5 |
| [Towns](gameplay/towns.md) | NPC services, commerce and later banking/gathering | 7, expanded in 8–9 |
| [Inventory](gameplay/inventory.md) | Rectangular storage, equipment, bags and overflow | 8 |
| [Skills](gameplay/skills.md) | Lessons/books/pages, training, AP and skill catalog | 8; advanced skills in 10 |
| [Character](gameplay/character.md) | Levels, talents, aging and rebirth | 8–9 |
| [Titles](gameplay/titles.md) | Collection, selection and achievement effects | 8–9 |
| [Quests](gameplay/quests.md) | Story, objectives, claims and RP missions | 9–10 |
| [Enchants](gameplay/enchants.md) | Prefix/suffix application and burning | 9 |

## Proposed project layout

```text
project.godot
export_presets.cfg             # Add verified target presets; keep credentials out
assets/
  art/                        # Original pixel textures, sprites and tile sheets
  audio/                      # Music and sound effects
  fonts/
scenes/
  main.tscn                   # Persistent composition root
  menus/                      # Main menu, loading, results
  exploration/                # Town, dungeon, player and reusable room scenes
  battle/                     # Cosmetic battle actor presentation
  ui/                         # HUD, dice panel, modals and feature views
scripts/
  application/                # Session controller, transitions, transactions
  domain/
    state/                    # Explicit profile/run/battle/instance data
    commands/                 # Typed intent/revision/result data
    rules/                    # Combat, stats, inventory and progression
  exploration/                # Physics/navigation/interaction adapters
  presentation/               # UI observation binding and input contexts
  data/
    definitions/              # Custom Resource scripts
    content_catalog.gd        # Validate/index the explicit manifest
    save_repository.gd        # FileAccess codec and checkpoint storage
  services/                   # Settings/audio/platform adapters as needed
content/
  catalog.tres
  actors/
  skills/
  stats/
  statuses/
  items/
  encounters/
  rooms/
  progression/
  quests/
  titles/
  enchants/
tests/
  run_tests.gd                # Implemented Phase 0 headless runner
  fixtures/
  unit/
  integration/
docs/
  gameplay/
  evidence/                   # Explicitly dated verification artifacts
tools/                        # Engine/template pins and verify.py
build/                        # Generated exports and verification logs; ignored
.firecrawl/                   # Ignored local research cache
.godot/                       # Generated editor/import cache; ignored
```

Create folders with their first consuming feature, not empty architecture scaffolding. Prefer lowercase snake_case filenames and descriptive class names. Save data uses `user://`, never the project/content directories. Definition IDs remain independent of file paths.

## Dependency and ownership rules

Rules consume explicit data and the RNG adapter, never scene nodes, input or persistence. Application code coordinates rules and disk writes; scenes render observations and emit intentions. Exploration adapters own Godot physics state and checkpoint its continuation. Runtime data never mutates shared definition Resources. UI owns no rewards, costs or RNG draws.

Keep the long-lived Main/session separate from transient mode scenes. Avoid making each gameplay service an autoload or each stat a Node; introduce global lifetime only when required. Use an external addon only for an identified feature, with a license and export check.

## Research and evidence

[Godot sources](references.md#godot-engine-sources) link official pages and name inspected Firecrawl snapshots. The snapshots are local cache files and need not ship or be committed. Historical gameplay caches referenced by older research notes may not exist in this new scaffold; their URLs and dates are retained as provenance.

[evidence/free-exploration](evidence/free-exploration/README.md) contains pre-Godot material. Keep it labeled and excluded from release exports. New Godot evidence should record exact build, device, scenario and outcome and be referenced from the tracker.
