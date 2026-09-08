# Rebirth Dungeon: Titles

Titles recognize a character's achievements and let the player express an identity while choosing a small set of bonuses and tradeoffs. Earning a title adds it to the character's collection; equipping it activates its authored effects.

This document describes planned gameplay inspired by [Mabinogi's Titles](https://wiki.mabinogiworld.com/view/Titles). It complements [character.md](character.md), [skills.md](skills.md), [stats.md](stats.md), [quests.md](quests.md), [inventory.md](inventory.md), and the [game plan](../game-plan.md). Reference behavior is separated from proposed Rebirth Dungeon defaults. Examples and numbers are illustrative, not implemented features or final balance.

## 1. Mabinogi reference

| Feature | Reference behavior |
| --- | --- |
| Acquisition and effects | Requirements unlock titles; effects can include stat bonuses, penalties, skill visuals, or NPC dialogue. |
| Slots | First and Second Titles coexist with a cosmetic Talent Title. |
| Discovery | Unknown entries show `???`; known but unavailable entries are gray; earned entries are white. Favorites sort first. |
| Selection | Normal titles can be changed at any time through Character Info. |
| Vanity | The Base Title supplies stats; the Vanity Title supplies the displayed cosmetic effects. |
| Master Titles | Require perfect training at Rank 1, without requiring perfect training at earlier ranks. Skill resets can prevent equipping an earned title until Rank 1 is restored. |
| Second Titles | Acquired through Second Title Coupons and may supply stats or visual effects. |
| Talent Titles | Cosmetic selections, separate from normal titles and not necessarily matching the active talent. |

Sources: [Details](https://wiki.mabinogiworld.com/view/Titles#Details), [Vanity Titles](https://wiki.mabinogiworld.com/view/Titles#Vanity_Titles), [Master Titles](https://wiki.mabinogiworld.com/view/Titles#Master_Titles), [Second Titles](https://wiki.mabinogiworld.com/view/Titles#2nd_Titles), and [Talent Titles](https://wiki.mabinogiworld.com/view/Titles#Talent_Titles).

The catalog includes general achievements, mainstream stories, jobs, mastery, events, and server-exclusive Seal Breaker awards. These inspire categories, not a requirement to reproduce the catalog, multiplayer exclusivity, or its balance. Some reference entries have unknown requirements; do not turn those gaps into assumed rules. [Title catalog](https://wiki.mabinogiworld.com/view/Titles).

## 2. Ownership and title slots

The proposed default is **one collection per hero**, matching the progression owner in character.md. Committed title unlocks survive defeat, abandonment, and rebirth. A younger age, lower current level, or different talent after rebirth does not erase an achievement. Account-wide sharing remains a decision before implementation.

| Selection | Purpose | Proposed behavior |
| --- | --- | --- |
| First Title | Main achievement title | Equip one earned First Title or leave empty; apply its effects |
| Second Title | Additional distinction | Equip one earned Second Title or leave empty; apply its effects alongside the First Title |
| Talent display | Show earned talent standing | Select an eligible talent label or hide it; no additional stats |
| Vanity override, later | Separate appearance from effects | Select an earned title compatible with the corresponding base slot; use its presentation only |

First and Second are slot types. General, Story, Master, and Event are collection categories, not extra equipment slots. A title definition has exactly one base slot type, so the same title cannot occupy both slots. Merely owning or favoriting titles grants no cumulative stat bonus.

Talent display reads eligible labels from [talent mastery](character.md#talent-mastery). Selecting a label neither changes the active talent nor reapplies mastery bonuses. Talent mastery, a cosmetic talent label, and a skill's Master Title are distinct concepts.

For Rebirth Dungeon, equip, remove, or change titles **in town between runs**, with no gold/AP cost or cooldown. This deliberately adapts Mabinogi's normal-title switching to the existing run snapshot model. A newly earned title is never equipped automatically. Empty slots are valid, including both empty.

Vanity is deferred from the first slice. When supported, each override replaces that slot's name/visual presentation only; the base selection still owns stats and gameplay conditions. Clearing the base also clears its override. Owning a vanity title does not make it an equipped gameplay title for NPC checks or other effects. Hiding title presentation never disables the base effects.

## 3. Discovery and acquisition

Track acquisition separately from selection:

| State | Journal presentation | Can equip? |
| --- | --- | --- |
| Unknown | `???`, without spoiler text | No |
| Known | Name, hint, and permitted progress details | No |
| Earned | Description, effects, and acquisition record | Yes, if any explicit equip condition is met |

Equipped is a marker on an earned title, not a fourth acquisition state. Use text/icons as well as color. Story-sensitive entries may remain entirely hidden until discovery when authored that way.

Each title defines a **hint condition** separately from its **award condition**. Meeting the hint only reveals information. A character can go directly from Unknown to Earned unless the award explicitly requires prior discovery; hints are not an implicit gate. Define AND/OR requirements explicitly and show all nonsecret unmet conditions.

Support these proposed acquisition routes:

| Route | Evidence and award boundary |
| --- | --- |
| Combat or exploration achievement | Qualifying resolved events, committed under the run outcome's retention policy |
| Story or NPC quest | The named quest reward transaction is claimed |
| Character milestone | A committed level-up, age-up, cumulative milestone, or rebirth event, as authored |
| Coupon | Consume a compatible title coupon and unlock its title together in town |
| Skill mastery, later | Complete the skill's authored Rank 1 mastery checklist |

Conditions must specify what counts. A boss title names the boss and eligible mission; a clear title requires a successful clear, not merely entering a floor. A survival challenge records qualifying damage or failures throughout the run rather than checking only final HP. An age achievement reads character.md's actual age, not elapsed turns or account age.

For a milestone such as “level up with STR at least X,” evaluate after each committed level-up, not whenever the character screen opens. Proposed stat-threshold achievements use progression-only stats from starting profile, current-life growth, skills, and talents, excluding equipment, equipped titles, and temporary effects. This avoids title bonuses unlocking other stat-threshold titles. It is a Rebirth Dungeon simplification; authors must name the threshold and stat basis.

State conditions can be reconciled on load or content migration from saved facts. Event conditions require recorded evidence: being level 20 does not prove a damage-free boss clear, and currently selecting Magic does not prove rebirth into Magic. Repeated menu visits, animations, previews, and command retries do not advance objectives.

Coupon acquisition follows [inventory.md](inventory.md): a coupon is an item until consumed, while the earned title occupies no inventory cells. Reject a coupon for an already-earned title without consuming it; reject unsupported or invalid title IDs. Pending run loot cannot be consumed before retention and storage are resolved. Event distribution, trading, and coupon expiration require later economy rules.

## 4. Equipped effects and stat calculation

Treat each equipped base title as a removable modifier source identified by its title ID and slot. First and Second Title contributions combine with other sources under [stats.md's calculation order](stats.md#5-sources-and-calculation-order):

1. Build progression-only base attributes normally.
2. Include title attribute modifiers alongside equipment modifiers before deriving combat stats.
3. Derive resource maxima and combat stats once from effective attributes.
4. Include direct title modifiers alongside direct equipment modifiers, using the existing rounding and clamps.

Flat contributions add; percent contributions use the existing summed-percent stage. Protection changes use percentage points. An STR bonus contributes through the authored STR conversion; it is not also direct Physical Attack unless a separate direct bonus is explicitly authored. Removing a title recomputes totals from remaining sources rather than subtracting from rounded totals.

Both benefits and penalties apply. For example, a First Title with `Max HP +10, Max MP -5` and a Second Title with `Max HP +5` contribute `Max HP +15, Max MP -5` before other modifiers and clamps. Swapping out the First Title leaves only `Max HP +5` from titles.

Changing a resource maximum does not restore current HP/MP/SP. Lowering a maximum clamps the current pool; re-equipping a bonus does not restore the lost amount. Title effects do not award AP, rank up skills, alter dice probabilities, grant free actions, or bypass minimum skill costs unless a later supported rule explicitly defines such behavior.

Initial effects use supported flat attributes, resource maxima, attack, and defenses. Skill-specific bonuses, NPC dialogue conditions, and visual overrides need authored effect types and validation before use. Distinguish `ownsTitle` from `hasEquippedBaseTitle` wherever future content checks a title. Unsupported critical, speed, crafting, or other effects cannot be silently imported from Mabinogi.

## 5. Master Titles and talent progression

Master Titles are a **later extension**, preserving skills.md's initial Rank 1 cap and deferral of mastery. Reaching Rank 1, earning 100 normal training points, or reaching Master talent standing does not automatically award a skill Master Title.

When enabled, define a separate mastery checklist for each eligible Rank 1 skill. Perfect training means completing every authored checklist requirement, rather than crossing the ordinary 100-point advancement gate. Earlier ranks need not have been perfectly trained. Track mastery evidence separately from rank-up training; completing mastery grants the title without another rank or AP payment. A prototype-capped skill cannot offer unreachable mastery objectives.

Master Titles use the First Title slot and compete with other First Titles. Their effects apply only when equipped; unlocking several does not stack their bonuses. In the proposed extension, ownership persists if a future skill-reset system lowers the skill rank, but equipping requires Rank 1. If eligibility is lost, clear the selection at a town boundary and show the reason; restoring Rank 1 restores eligibility without repeating mastery. Ordinary rebirth preserves skills, so it does not invalidate these titles.

Mastery checklists, skill-specific title effects, and any relationship to training consumables need their own content pass before this extension ships. Dan ranks and Grandmaster challenges remain separate later systems.

## 6. Illustrative starter catalog

These are original placeholder titles and proposed values, not Mabinogi rewards. Mission, quest, and NPC references must resolve to authored content before release.

| Title | Category / slot | Discovery | Award condition | Equipped effect |
| --- | --- | --- | --- | --- |
| the First Delver | General / First | Enter the introductory dungeon | Commit its first successful clear | Max HP +10 |
| the Guardian Breaker | Combat / First | Encounter the introductory guardian | Successfully clear its mission with that guardian defeated | Physical Attack +3, Max MP -5 |
| the Seal's Witness | Story / First | Receive G1: The Broken Seal's final quest | Claim that Generation's final quest reward | Magic Attack +3, Defense -1 |
| the Seasoned | Character / First | Reach actual age 18 | Reach actual age 20 at a committed age-up | Max SP +10 |
| Lantern Companion | General / Second | Inspect its coupon reward in a discovered town quest | Consume the earned coupon | Max HP +5 |

The first two entries may unlock from the same successful run; grant both once and let the player choose. Obtaining the Seasoned title remains recorded after rebirth into a younger body. Coupon quest details and the age feature can arrive after the basic achievement slice.

## 7. Run integration and persistence

A normal run snapshots the validated base title IDs, resolved effects, and content version with the character loadout. Title selection stays fixed throughout that run. In-run discoveries and achievement evidence are pending progression, never a mid-run stat upgrade. NPC role-playing missions use their authored NPC template; the player's titles are not inherited unless the mission explicitly includes them.

At the outcome boundary, resolve retained rewards and progression using character.md and quests.md, then evaluate relevant title conditions from the committed facts and retained evidence. A successful-clear condition always requires victory. Retention of other evidence on defeat or abandonment remains the [Phase 7](../project-phases.md) carry-over decision. Pending evidence must not survive by accident through a separately saved title counter.

Save title awards together with their triggering reward transactions before showing notifications. A quest claim that awards a title and an item commits once; a coupon unlock and its inventory decrement commit together. Duplicate grants of an already-owned title are no-ops without fallback currency or repeated rewards. When multiple awards qualify, process stable title-ID order without using their newly equipped effects to trigger more awards.

Persist the following in the existing versioned profile/run bundle:

| Data | Purpose |
| --- | --- |
| Definition IDs and pinned content/rules versions | Stable references for eligibility, effects, and migrations |
| Discovered and earned title IDs, acquisition source/outcome IDs | Collection state and duplicate prevention |
| Committed counters and event evidence | Resume progress without reconstructing unrecorded achievements |
| First/Second selections, talent display, favorites, later vanity selections | Restore the player's choices |
| Active-run title snapshot and pending discovery/award evidence | Preserve deterministic combat and outcome retention |

Definitions also need slot, category, display text, spoiler policy, hint/award predicates, optional equip conditions, and typed effect bundles. Validate referenced quests, skills, encounters, stats, and coupons. Missing or retired definitions require a migration policy: preserve the achievement record, disable unresolved effects, and explain unavailable selections rather than crashing or substituting another title. Do not silently rewrite an active run under a new title definition.

## 8. Character screen and initial scope

Expose Titles in the character screen, with First and Second slots and a separate Talent display control. The collection supports category/slot filters, search over revealed entries, favorites first, and earned/known status. Details show acquisition hints, progress, bonuses and penalties, equip restrictions, and whether the title is selected.

Preview the resulting stat changes before confirming a replacement, including current-pool clamping from reduced maxima. Mark title selection unavailable during a run with “Change titles in town.” Show pending achievements distinctly from earned titles. Favoriting, hiding visuals, and inspecting details never change effective stats.

The first slice should include two competing First Titles, one Second Title, one hinted achievement, a quest or coupon award, a penalty, a combined-slot stat preview, and saved selections. Keep Master Titles, Vanity, timed titles, job systems, event economies, and server-exclusive awards deferred. Do not reproduce Mabinogi's full title list or default Second Title stat values.

Before implementation, settle the actual catalog and balance, ownership across heroes, run-evidence retention, discovery/spoiler rules, and coupon sources. Acceptance checks should cover:

- Unknown → Known → Earned and direct Unknown → Earned, without granting on a hint alone.
- Quest/coupon awards once, including retries, full inventory reward handling, and duplicate coupons remaining intact.
- One title per base slot, wrong-slot rejection, combined effects, penalties, removal, and no bonus from unequipped titles.
- No resource refill from title swapping and no changes to active-run stats.
- Victory-only awards, retained versus discarded evidence, and distinct attribution in NPC role-playing missions.
- Collection and selection persistence across save/load and rebirth, plus missing-definition migration.
- When later enabled: mastery requires the complete Rank 1 checklist; vanity and talent presentation supply no extra stats.

## Research notes

The [Mabinogi Titles page](https://wiki.mabinogiworld.com/view/Titles) was retrieved with Firecrawl and inspected on **September 5, 2026**. Its local cache is `.firecrawl/mabinogi-titles.md` under the gitignored research directory. The reference summary describes that page; town-only selection, per-hero persistence, stat evaluation, example content, and implementation boundaries are Rebirth Dungeon proposals.
