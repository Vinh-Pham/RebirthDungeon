# Godot documentation reset audit

Date: **2026-09-10**. Scope: all Markdown under `docs/`, the project configuration and the visible scaffold. This audit replaces the previous engine's implementation assessment.

## Findings and changes

The repository contains `project.godot` configured for Godot 4.7/Mobile and an icon, but no gameplay scenes/scripts, tests, content catalog, main-scene assignment or export presets. Previous docs described a different engine, libraries, launchers and completed phases. Those claims cannot establish this project's status.

The architecture now uses typed GDScript, scene composition, custom Resource definitions, explicit runtime state, Godot 2D navigation/physics, Control-based UI and FileAccess save storage. All 17 phases are reset to Not started, with Phase 0 as the current focus. Phase notes are implementation contracts with unchecked acceptance criteria, not old completion reports.

Continuous exploration and separate non-spatial battles remain the active game direction. Old world-grid pickup, adjacent-cell targets and grid-based skill paths have been removed from active rules. Inventory remains rectangular grid storage. Godot physics is not asserted to provide bit-exact cross-device movement replay; integer battle rules and saved RNG continuation require pinned-version fixtures.

Gameplay progression is retained: five-dice skill locking, training plus AP, books/pages, talents, rebirth, inventory, enchants, quests and titles. Each gameplay document identifies its Godot owner. Full-economy proposals are separated from the first loop's temporary balance, bounded potions and free recovery.

## Remaining design decisions

| Area | Required decision / gate |
| --- | --- |
| Engine baseline | Exact editor/templates, renderer/device scope and headless test runner in Phase 0 |
| Starter combat | Complete actor stats, first actor/ties, rewards and bounded math fixtures in Phase 4 |
| Save behavior | Explicit format, interrupted-write recovery, compatibility handling and tested durability in Phase 6 |
| Full run outcomes | Per-outcome retention for inventory, XP, training, gold and quest/title evidence before Phase 8 inventory-backed runs |
| Progression pacing | Achievable training, AP costs, XP/talent growth and useful first rank-up in Phase 8 |
| Rebirth and aging | Eligibility, cost/cooldown, starting ages and offline clock reconciliation in Phase 9 |
| Advanced combat | Multi-target/reaction order and Charge redesign before each Phase 10 feature |
| Mobile delivery | Current SDK/signing prerequisites, physical-device input and fresh-process continuation in Phase 14 |
| Online/economy extensions | Separate decision before enabling any Phase 15 feature |

The first-loop outcome defaults are recorded in [Free exploration](free-exploration.md). They do not pre-decide the complete inventory/banking economy. Prototype numbers remain labeled provisional rather than treated as Mabinogi/Dicero or Godot requirements.

## Source and verification limits

Official Godot docs were fetched with Firecrawl and inspected for scenes, Resources, movement/navigation, UI/input, RNG, saving, tiles and platform exports. The stable pages identify themselves as Godot 4.7 at retrieval; exact installed editor and template versions still require Phase 0 verification. [Source index](references.md#godot-engine-sources).

Historical Mabinogi/Dicero citations retain their original dates and qualifications; they were not re-researched in this engine reset. Old prototype screenshots/logs remain [historical evidence](evidence/free-exploration/README.md). No Godot gameplay, headless suite, build, export or device acceptance was executed or claimed by this documentation rewrite.

Documentation verification checks local Markdown destinations/anchors, missing links, stale engine instructions and completed checkboxes. Future implementation must supply new evidence under [Project Phases](project-phases.md).
