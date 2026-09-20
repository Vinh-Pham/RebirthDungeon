# Rebirth Dungeon documentation

**Target: Defold + Lua, desktop first. Status: first playable slice implemented.** See [implementation status](implementation-status.md), [verification](verification.md) and [content provenance](content-data.md). The [game plan](game-plan.md) remains the authority for scope, architecture, libraries and milestones.

## Reading order and ownership

| Document | Owns |
| --- | --- |
| [Game plan](game-plan.md) | Baseline, dependency policy, delivery order, release acceptance |
| [Architecture](architecture.md) | Lua ownership, transactions, persistence, service boundaries |
| [Battle contract](turn-based-plan.md) | Fixed-Speed order, commands, costs, timing, enemy policy |
| [Library integration](turn-based-rpg-battle-libraries.md) | All 11 library responsibilities and integration gates |
| [Gameplay index](gameplay/README.md) | Character, world, economy, UI, and later systems |
| [UI panels](wmkit.md) | Defold panel and input contract; filename retained for existing links |
| [Combat log](combat-log.md) | First-slice events and later archives |
| [Lua checks](linting.md) | Planned static checks and content validation |
| [Verification](verification.md) | Required evidence and current validation status |
| [Reference library](references/README.md) | Defold guides, gameplay sources, historical browser research |

Resolve future conflicts in the game plan first, then update the affected contracts together. Reference-game mechanics are inspiration, not automatic requirements. Historical browser research does not establish installed dependencies, executable paths, save migrations, or test results in this project.

Milestones 1–5 build and verify the playable Alby loop and progression. Milestone 6 ports the broader ranked-skill UI, footprint inventory, extended quests/RP, titles, enchants, and battle archives. Executable modules now live under `game/`, `screens/`, `vendor/` and `tests/`; the root HUD is in `game/ui/`. Source retrieval dates remain distinct from documentation alignment dates.
