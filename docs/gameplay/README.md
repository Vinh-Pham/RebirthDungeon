# Gameplay contracts

All systems below are **planned for Defold**, not implemented in this starter. The [game plan](../game-plan.md) governs scope and delivery; [architecture](../architecture.md) governs ownership and saving. Use [fixed-Speed combat](../turn-based-plan.md) throughout.

| Contract | First-loop scope | Later scope |
| --- | --- | --- |
| [Character](character.md) | Creation, EXP/AP; aging/rebirth in progression milestone | Talent mastery and additional tracks |
| [Battle](battle.md) | Starter skills, spiders, one item then main action | Expanded ranks/status content |
| [Stats](stats.md), [implementation](stats-implementation.md) | Shared resource, cost, damage and source rules | Additional authored items/effects |
| [Skills](skills.md), [implementation](skills-implementation.md) | Talent starter, Combat Mastery F, Defense F | Ranked journal, lessons, books, pages, broader catalog |
| [Town](towns.md) | Town1 services and original Ink dialogue | More locations, crafting/gathering |
| [Gates](dungeon-gates.md) | Three required encounters unlock boss; optional rooms stay optional | New room templates |
| [Inventory](inventory.md) | 30 carried slots, 60 bank slots, stacks of 99 | 6×10 footprint grid and nine equipment slots |
| [Quests](quests.md) | Defold Quest onboarding and explicit claims | Broader catalog, tracking, overflow, Aren's memory |
| [UI](user-interface.md) | Druid HUD/panels and Monarch navigation | Rich windows and journals |
| [Titles](titles.md) | Deferred | Per-hero awards and equipped modifiers |
| [Enchants](enchants.md) | Deferred | Prefix/suffix application and burning |

A subsystem's later “first slice” means its own milestone-6 introduction, not an expansion of the first Alby release. Mabinogi snapshots preserve reference mechanics; project adaptations and validation determine executable Lua content.
