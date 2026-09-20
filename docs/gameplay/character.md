# Rebirth Dungeon: Character progression

**Planned Defold rules**, aligned with [game-plan.md](../game-plan.md). Each hero owns identity, possessions, skills, AP, life growth and progression. A life may contain many dungeon runs. Account-wide sharing and separate exploration levels are deferred.

## Creation and identity

Support up to **20 characters**, each with at most one unfinished run. Trim names, accept 2–24 characters and enforce case-insensitive uniqueness. Define Unicode normalization/length policy explicitly; Lua byte length is insufficient. Persist a stable profile ID independently of the display name.

Choose Human, Elf or Giant; age **10–17**; talent **Archery, Dual Gun, Magic or Close Combat**. Giants cannot choose Archery. Equipment/race restrictions are checked separately from talent choice. Begin at level 1, 0 EXP toward level 2, cumulative level 1 and **100 gold**. Initial AP/base stats/growth/EXP thresholds require validated content tables before implementation, not inferred old source files.

Creation gives the talent starter weapon/skill, Combat Mastery F and Defense F. Starter talent mapping is Close Combat → sword/Smash, Archery → bow/Power Shot, Dual Gun → dual guns/Double Shot, Magic → wand/Icebolt; keep stable IDs and validate executable F-rank definitions. See [skills](skills.md).

## Leveling and AP

Use the saved [Level reference](../references/mabinogi-level.md)'s current Character Growth tables over contradictory older race/age prose. Transcribe the adopted shared base values, talent bonuses and EXP thresholds into versioned Lua content, with provenance and fixtures. Do not claim those catalogs exist yet.

For each committed EXP grant, repeatedly subtract the next-level threshold while below **level 200**, add one level, **1 AP** and the applicable growth bundle, and increment cumulative level. Retain remaining EXP; at the cap discard excess EXP and show Max Level. Other reward components still apply. Preserve growth to four decimal places; display rounding never changes stored growth.

`cumulative_level = 1 + earned level-ups across all lives`. Resetting to level 1 does not add another cumulative level or AP. This is a project adaptation. Growth uses the life/talent context recorded for the earned level; aging later does not recalculate old growth. Every grant commits once with its reward ID.

## Talents and talent mastery

Active talent supplies the adopted starting/level/age growth bonuses and a starter skill. Other talents' skills remain available when learned and equipment/race requirements pass. Categories in the skill journal are separate from talents.

### Talent mastery

Later derive each talent's experience from authored contributions of current learned ranks, then resolve a 0–15 mastery ladder. Contributions are totals, not grants each time a panel opens. No second AP payment applies. Retained skills preserve mastery across rebirth; active-talent changes do not erase other mastery. Author thresholds and bonuses before enabling this system. Grandmaster, training multipliers, Adventure/Crafting talents and exploration EXP remain deferred.

## Aging

Age at **Saturday noon in America/Los_Angeles**, including offline catch-up. This is a shared weekly boundary, not seven days from creation/rebirth. Grant **5 AP per processed age-up**; active-talent age-growth bonuses apply through destination age 20. Use the adopted growth tables for any base age growth, rather than inventing an age-25 cutoff or ending AP there.

Record processed boundaries and actual age. Creation at an older age awards no missed AP. Rebirth does not reset the global weekly schedule or make already processed boundaries eligible again. Reconcile pending boundaries in chronological order at safe town/result boundaries, before rebirth; active-run stats remain frozen. Show actual age and next scheduled boundary.

Inject time into rules. Lua local OS conversion is not an IANA timezone engine: implement a tested adapter independent of the computer timezone, with DST, offline weeks and backward-clock fixtures. Clock rollback cannot remove age or re-award a boundary; local timestamps do not provide anti-cheat guarantees.

## Rebirth

Rebirth is milestone-5 work. Require town, no active run, processed pending aging and elapsed cooldown since creation/last rebirth. Require confirmed abandonment before rebirth if a run is active.

| Cumulative level | Cooldown |
| --- | ---: |
| Below 5,000 | 1 day |
| 5,000–7,999 | 2 days |
| 8,000–9,999 | 4 days |
| 10,000+ | 6 days |

Preview a compatible talent and age 10–17 no older than current age. Keep identity/race locked. Reset current level to 1, EXP to 0 and temporary life growth; rebuild the selected starting profile. Preserve cumulative progression, AP, learned skills/ranks/training, possessions, bank, quest/claim records and later title/archive records. Unlock a new talent's starter skill if missing without duplicating starter items or resetting higher ranks. Any resource restoration is an explicit rebirth outcome, not a side effect of raising maxima.

Save the complete new life, cooldown anchor and outcome ID together. Duplicate requests cannot reset twice or grant AP. Rebirth is not a run escape or reward reroll.

## Runs, persistence and UI

Run entry freezes progression/ranks/loadout. Victory EXP, eligible skill training and claimed loot persist at their actual command boundaries and survive defeat/abandonment; they are not all delayed until final dungeon success. Profile growth applies to subsequent baselines. Only successful treasure return is a dungeon clear. Pending offers remain separate from owned items.

Use the session's copied candidate and validated DefSave envelope. Druid character controls display identity, current/max resources, level/EXP/cumulative level/AP, age, talent, effective stats and named sources. Monarch handles selection/creation/rebirth screens. No notification or animation awards progression.

Lester fixtures cover EXP crossings/cap, fractional growth, missing starter skills, no item duplication, rebirth bands, age/DST catch-up and retry; engine tests cover profile index recovery, selection/resume and singleton cleanup. Mabinogi [Character](../references/mabinogi-character.md), [Talent](../references/mabinogi-talent.md), [Rebirth](../references/mabinogi-rebirth.md) and race snapshots are source context, not installed gameplay.
