# Rebirth Dungeon: Character Progression

A character grows through **leveling**, **talent development**, and **aging**. Leveling earns stats and AP, talents shape a character's specialization, and aging changes the character over time. Skills provide lasting progression across successive lives through rebirth.

This document describes planned gameplay inspired by **Mabinogi, the Korean MMORPG**. It complements [skills.md](skills.md), the [game plan](game-plan.md), and the [project phases](project-phases.md). Mabinogi reference mechanics are identified separately from proposed Rebirth Dungeon rules. Values and defaults below are design proposals, not implemented features or final balance decisions.

## 1. Mabinogi reference

| System | Reference behavior |
| --- | --- |
| Current level | Gained through character EXP during the current life; capped at 200. Level-ups grant AP and stats. |
| Cumulative level | Tracks levels accumulated across lives and survives rebirth; the wiki lists no cumulative cap. |
| Exploration level | A separate EXP track, capped at 50, with its own cumulative total. |
| Active talent | Chosen at creation or rebirth; provides specialization benefits such as training and stat bonuses. |
| Talent mastery | Develops from the ranks of associated skills, without a separate AP payment. Master is level 15; Grandmaster requires additional tests. |
| Age | Starting/rebirth ages are 10–17. Characters age on a weekly schedule, and age influences character growth and appearance. |
| Rebirth | Can reset current level and age while retaining progression such as skill ranks and unspent AP. |

Sources: [Level](https://wiki.mabinogiworld.com/view/Level), [Talent](https://wiki.mabinogiworld.com/view/Category:Talent), [Character age](https://wiki.mabinogiworld.com/view/Character#Age), [Age schedule](https://wiki.mabinogiworld.com/view/Stats#Age), and [Rebirth](https://wiki.mabinogiworld.com/view/Rebirth).

The wiki's details are not fully consistent across pages. The Level page's overview attributes growth to age and race, while its Character Growth section emphasizes active talent and lists 1 AP per level-up and 5 AP per age-up. The Talent page describes additional aging bonuses only until age 20; the Stats page describes age-growth cutoffs around 25. The Character page also explains a legacy “years past 25” display whose number is not simply actual age minus 25. Treat these as source qualifications rather than combining them into an asserted exact Mabinogi formula. [Character Growth](https://wiki.mabinogiworld.com/view/Level#Character_Growth), [Talent bonuses](https://wiki.mabinogiworld.com/view/Category:Talent#Basic_Information), [Stats age rules](https://wiki.mabinogiworld.com/view/Stats#Age), [Character age display](https://wiki.mabinogiworld.com/view/Character#Age).

## 2. Character identity and progression tracks

Use **character** and **hero** for the same playable progression owner. The proposed default follows skills.md: each hero has its own levels, AP, skills, talent mastery, and age. Account-wide sharing remains a decision before implementation.

| Track | Meaning | How it advances |
| --- | --- | --- |
| Character XP and current level | Growth during the current life | Committed encounter, quest, and dungeon rewards |
| Cumulative level | Lifetime record of earned levels | Each actual character level-up |
| AP | Spendable Ability Points | Level-ups, eligible age-ups, and authored rewards |
| Skill rank and training | Proficiency in one learned skill | Practice to at least 100 points, then spend AP |
| Active talent | Selected specialization for this life | Player choice at creation or rebirth |
| Talent mastery | Achievement within each specialization | Ranks of the talent's associated skills |
| Age | Years lived in the current body | Scheduled age-ups; reset by rebirth |

A **life** may contain many dungeon runs. Starting a run, completing one, or being defeated does not itself create a new life or trigger rebirth. Character XP, skill training points, and talent experience are different quantities and must have distinct labels in the UI.

## 3. Character leveling

### Earning and spending XP

Characters begin at **current level 1** with 0 XP toward level 2. Authored rewards grant XP for eligible encounters, quests, dungeon objectives, and exploration discoveries. The first implementation uses one character XP track; Mabinogi's separate exploration level is deferred.

An authored progression curve defines the XP required for each next level. On a committed XP grant:

1. Add the reward to XP toward the next level.
2. While XP meets the next threshold and the character is below the cap, subtract that threshold and increase the level by one.
3. Grant that level's AP and stat growth once, and increase cumulative level by one.
4. Keep remaining XP toward the next threshold.

Use **200 as the proposed current-level cap**, following the reference. A smaller prototype cap must be visible and content-defined. At the cap, further XP grants award no levels or AP; discard XP overflow and show Max Level. Non-XP rewards remain eligible. XP requirements and reward amounts need their own balance pass rather than copying Mabinogi's full curve. [Mabinogi level limits](https://wiki.mabinogiworld.com/view/Level#Details).

For example, if level 1 → 2 costs 100 XP and level 2 → 3 costs 150 XP, a 280 XP reward at level 1 grants two levels and leaves 30 XP toward level 4. These thresholds are illustrative.

### AP and stat growth

The proposed baseline is **1 AP per earned character level**, matching the value listed in Mabinogi's Character Growth section. Initial AP and additional quest rewards are separate authored grants; character creation and loading a save are not level-ups. [Mabinogi Character Growth](https://wiki.mabinogiworld.com/view/Level#Character_Growth).

Each level-up also adds a defined stat-growth bundle for the character's current age and active talent. Author a base growth table by age and a separate talent bonus table. Begin with stats supported by Rebirth Dungeon's combat rules; Mabinogi's complete race and attribute system is not automatically part of this design.

Growth uses the age and talent at the time of the committed level-up. Aging later does not recalculate all earlier levels using the new age. Store the accumulated growth for the current life, and derive permanent skill and talent bonuses separately. Fractional growth, if used, needs a fixed precision and an explicit display-rounding rule.

Gaining AP never advances a skill automatically. The player must still meet that skill's **100 training points plus AP** requirement and choose Rank Up, as defined in [skills.md](skills.md).

### Cumulative level

Define Rebirth Dungeon's cumulative level as:

```text
cumulativeLevel = 1 + total earned character level-ups across all lives
```

It begins at 1, increases only on an actual level-up, and never falls on rebirth. A character who reaches level 20, rebirths to 1, and then reaches level 10 has cumulative level `1 + 19 + 9 = 29`.

Resetting to level 1 grants neither AP nor a cumulative increment. This is an intentional simplification: Mabinogi's Rebirth page explicitly counts a reset to level 1 as an additional cumulative level. [Mabinogi rebirth options](https://wiki.mabinogiworld.com/view/Rebirth#Options).

Cumulative level can support lifetime milestones and content eligibility. It does not directly multiply combat stats; any bonus must be an explicit progression reward.

## 4. Character talents

### Active specialization

A talent expresses the character's current focus without locking them into a class. Choose one at character creation and, once rebirth is implemented, choose again when beginning a new life. Skills outside the active talent remain learnable, trainable, and usable when their normal prerequisites are met.

Suggested initial talents are:

| Talent | Associated skills | Proposed emphasis |
| --- | --- | --- |
| Close Combat | Guard and future melee techniques | Physical offense and durability |
| Magic | Ember Bolt, Flame Burst, and future spells | Spell effectiveness and magical growth |
| Adventure, later | Future survival and exploration skills | Dungeon utility |
| Crafting, later | Future production skills | Item creation and resource use |

These are Rebirth Dungeon groupings; final names, bonuses, and skill membership are authored content. A skill may contribute to more than one talent. A skill **category** organizes the journal; a **talent** defines specialization benefits and mastery progression, so the two need not map one-to-one.

The proposed active talent grants a base stat bonus, a level-up growth bonus, and an age-up growth bonus where defined. Selecting it does not automatically teach every associated skill. Acquisition still uses NPCs, books, or assembled books.

Mabinogi's selected talents can accelerate skill training. Keep training multipliers deferred as specified in skills.md: the initial Rebirth Dungeon talent system provides growth and mastery benefits while using normal training counts. Any later multiplier must preserve the 100-point advancement gate. [Mabinogi talent benefits](https://wiki.mabinogiworld.com/view/Category:Talent#Basic_Information).

### Talent mastery

Maintain mastery for **every talent**, including those that are not active. Derive talent experience from the current ranks of associated learned skills:

```text
talentExperience = sum(authoredContribution(skillId, currentSkillRank, talentId))
talentLevel = highest authored threshold reached by talentExperience
```

Contributions are total values for a skill's current rank, not grants added repeatedly whenever the journal opens. Learning a contributing skill or ranking it up can increase mastery; ordinary character XP and partial skill training do not. If a skill contributes to multiple talents, update each affected talent.

There is **no second AP cost** for gaining a talent level. AP was spent on the contributing skill ranks. Illustratively, if Guard contributes 20 talent XP at F and 50 at E, advancing it increases Close Combat mastery by 30, not 50 plus its previous contribution.

Use a proposed ladder from **Untrained (0)** through **Fledgling (1)** to **Master (15)**, with authored thresholds and intermediate titles. Grandmaster is a later achievement requiring dedicated challenges, not simply more talent XP. This follows Mabinogi's distinction between skill-based mastery and Grandmaster tests without importing its thresholds. [Mabinogi talent levels](https://wiki.mabinogiworld.com/view/Category:Talent#Talent_Levels).

Mastery bonuses remain effective when another talent is selected and survive rebirth because the underlying skills remain. Derive each talent's total bonus from its current mastery level, without adding lower levels again unless the content explicitly defines cumulative rewards. One-time milestone rewards, if introduced, need separate claimed-state tracking.

## 5. Aging

### Age and time

Proposed creation and rebirth ages are **10–17**. Age measures the current body rather than account age, character XP, turns taken, or the number of dungeon runs. Older starting ages select their authored starting profile; choosing one does not claim the AP rewards for skipped age-ups.

Mabinogi uses a shared weekly Saturday age-up schedule. Rebirth Dungeon's proposed offline-friendly adaptation is **one year per seven elapsed real-world days since creation or rebirth**, including time offline. This is a rolling interval, not Mabinogi's server reset time. [Mabinogi age schedule](https://wiki.mabinogiworld.com/view/Stats#Age).

Age is reconciled in the hub or at a run's results boundary. Opening menus repeatedly does not trigger age-ups, and an age-up during a dungeon does not silently change the active run's character snapshot. Reconcile each elapsed interval once in chronological order, including intervals missed while offline.

Display actual age directly, such as **Age 26**, instead of copying the wiki's legacy “years past 25” notation. Age continues increasing beyond the growth cutoff; the proposed system has no death from old age. Optional age-based appearance changes must leave grid occupancy, targeting, and input areas unchanged.

### Age rewards and growth limits

Use the following explicit **provisional Rebirth Dungeon schedule** to avoid inheriting the wiki's ambiguous cutoffs:

| Age reached at an age-up | AP reward | Base age-growth bundle | Active talent age-growth bonus |
| --- | --- | --- | --- |
| 11–20 | 5 AP | Authored by destination age | Authored by destination age and talent |
| 21–25 | 5 AP | Authored by destination age | None |
| 26 and above | None | None | None |

The 5 AP amount is informed by the Level page; the age-20 talent and age-25 general cutoffs are inspired by the Talent and Stats pages. The table above is our proposal, not a verified unified Mabinogi reward table. [Character Growth](https://wiki.mabinogiworld.com/view/Level#Character_Growth), [Talent aging bonuses](https://wiki.mabinogiworld.com/view/Category:Talent#Basic_Information), [Stats aging rules](https://wiki.mabinogiworld.com/view/Stats#Age).

Age 20 → 21 still grants the base growth bundle and AP, but no talent aging bonus. Age 25 → 26 grants neither. These cutoffs affect age-up rewards only: the character can continue earning XP, level-up AP, and defined level-up growth at older ages.

An age-up grants no character XP, cumulative level, or skill training. Any age title or milestone is a separate, once-only award. Rebirth removes the current life's accumulated age-growth stats while preserving AP already awarded.

## 6. Rebirth connects the systems

Rebirth is included here to explain why current level, cumulative level, and age are separate. It remains a proposed feature: skills.md left its exact behavior open, and cooldowns, eligibility, and costs still need a decision before implementation.

At an eligible hub boundary, preview the following proposed transition before the player commits:

| Character state | Proposed rebirth behavior |
| --- | --- |
| Current level and XP | Reset to level 1 and 0 XP |
| Cumulative level | Preserve; the reset itself adds nothing |
| Age | Choose an allowed starting age; begin a new aging interval |
| Active talent | Choose a talent for the new life |
| Level- and age-growth stats | Remove the old life's accumulated growth and apply the new starting profile |
| Learned skills, ranks, and training | Preserve |
| Unspent AP | Preserve; rebirth neither refunds spent AP nor grants level-up AP |
| All talent mastery and mastery bonuses | Preserve |
| Committed inventory, page collections, quests, and claimed rewards | Preserve |

This retains Mabinogi's central pattern of repeatable leveling supported by lasting skills. Mabinogi's own retained/reset state is documented on [Rebirth](https://wiki.mabinogiworld.com/view/Rebirth#What_Stays).

Resolve pending run rewards and eligible aging intervals before rebirth. Save the new life and reset fields together; retrying the transition cannot duplicate AP or reset twice. Rebirth must not become a route around an unfinished run's defeat or abandonment rules.

Example: a level-20 character with cumulative level 20, Guard E, and 8 unspent AP rebirths into Magic. They begin at level 1 with Guard E and 8 AP. Their Close Combat mastery remains. Earning nine more levels raises cumulative level to 29 and adds 9 AP under the proposed baseline, while level-growth stats follow the new life's age and Magic talent.

## 7. Run integration and saving

Follow the game plan's boundary between permanent profile progression and the active dungeon simulation. For the initial design, run-earned XP and skill training are pending rewards. Commit the eligible amounts at the outcome boundary, then apply level-ups and mastery changes. Victory, defeat, and abandonment retention remains the Phase 7 decision; this document does not assume every pending reward survives.

For a run outcome, first apply retained XP using the age and talent captured at run start, then apply retained skill training, then reconcile elapsed age intervals. This is an explicit simplification for growth earned during long runs. Skill rank-ups and rebirth happen afterward in the hub. The next run uses the updated profile.

Persist current level, remaining XP, cumulative level, AP, active talent, current-life growth totals, skill progression, life identity, starting age, processed aging intervals, and claimed reward IDs in the existing versioned profile/run bundle. Talent mastery can be rebuilt from skill ranks and the pinned content version. Content changes require deliberate migration rather than silently recalculating a shipped character under new thresholds.

XP grants, level-up AP, age rewards, and rebirth must be committed once before their presentation plays. Replays use recorded progression outcomes; deterministic dungeon rules must not read the wall clock. A backward clock change cannot remove age or re-award intervals. Forward clock changes and clock trust for future online rewards require an explicit policy; local timestamps alone do not prove elapsed real time.

## 8. Character screen and initial scope

The character screen should show current level and XP to the next level, cumulative level, AP, actual age, the next age-up time and reward, active talent, and mastery for all discovered talents. Explain stat totals by source: starting profile, current-life growth, skills, talents, equipment, and temporary effects.

Talent details should show associated skills, their mastery contributions, the next threshold, and active versus permanent benefits. Link to the skill journal so a player can see how training and AP investment improve mastery. Rebirth needs a before/after preview of reset and preserved progression, plus its eligibility requirements.

The first character slice should demonstrate XP crossing multiple levels, AP feeding skill advancement, two talents with distinct growth, mastery from skill ranks, and aging across a reward cutoff. Exercise aging with a controllable test clock rather than waiting real weeks. Add rebirth once its eligibility and economy are defined.

Before implementation, settle the XP curve, level cap, AP economy, age-based growth tables, talent membership and thresholds, account-versus-hero ownership, defeat/abandonment carry-over, aging clock policy, and rebirth restrictions. Training multipliers, separate exploration levels, Grandmaster challenges, premium talents, and paid age changes remain outside the initial scope.

Acceptance checks should cover exact XP thresholds and overflow; one AP grant per earned level; cumulative preservation through rebirth; mastery without a second AP charge; inactive talent mastery; no skill-training shortcut; offline age catch-up and the 20/25 cutoffs; unchanged active-run stats; and save/retry without duplicate rewards or lost retained progression.

## Research notes

Sources were retrieved with Firecrawl and inspected on **September 5, 2026**. Local caches are under the gitignored `.firecrawl/` directory. Source discrepancies are recorded in section 1; example numbers and Rebirth Dungeon adaptations are identified throughout.

| Reference | Local cache |
| --- | --- |
| [Character: Age](https://wiki.mabinogiworld.com/view/Character#Age) | `.firecrawl/mabinogi-character.md` |
| [Level and Character Growth](https://wiki.mabinogiworld.com/view/Level) | `.firecrawl/mabinogi-level.md` |
| [Talent](https://wiki.mabinogiworld.com/view/Category:Talent) | `.firecrawl/mabinogi-talent.md` |
| [Stats: Age and Ability Points](https://wiki.mabinogiworld.com/view/Stats#Age) | `.firecrawl/mabinogi-ability-points.md` (retrieved for skills.md and reused) |
| [Rebirth](https://wiki.mabinogiworld.com/view/Rebirth) | `.firecrawl/mabinogi-rebirth.md` |
