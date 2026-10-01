# Rebirth Dungeon: Titles and Achievements

Updated **October 1, 2026**. Titles are **planned**; the current hero schema and UI have no title collection or equipped-title effects. Add them to the existing character progression and stat resolver, using committed turn-based outcomes. Read with [Character](character.md), [Skills](skills.md), [Stats](stats.md), [Quests](quests.md), and [Inventory](inventory.md).

## 1. Collection and selection

The proposed collection belongs to one campaign hero. Earned titles survive completed defeat, early dungeon return and future rebirth; a later lower level/age does not erase an achievement. Account sharing is separate future work. [Mabinogi inspiration](https://wiki.mabinogiworld.com/view/Titles) informs the slots and mastery concept; this document defines the game's rules.

| Selection | Planned behavior |
| --- | --- |
| First Title | One earned primary title or empty; supplies its authored effects |
| Second Title | One earned secondary title or empty; effects combine with the First |
| Talent display | Optional earned mastery label; presentation only |
| Vanity override, later | Compatible earned display name for a base slot; no extra effects |

General, Story, Combat, Master and Event are collection categories, not additional slots. A definition has exactly one base slot type. Ownership, favorites and discovered hints grant no stats. A newly earned title is never equipped automatically.

Equip/remove titles in town, outside a dungeon or pending encounter, without AP/gold cost. Empty slots are valid. Battle inputs include the selected effects at encounter entry. Read-only browsing remains available anywhere; selection commands revalidate the town context. A cosmetic talent label neither changes the growth talent nor repeats mastery bonuses.

Vanity is deferred. An override replaces presentation only; clearing its base clears the override. Hiding a title name does not disable equipped effects, and displaying a vanity name does not satisfy an equipped-base-title condition.

## 2. Discovery and acquisition

| Collection state | Presentation | Equippable? |
| --- | --- | --- |
| Unknown | Hidden or “???” according to spoiler policy | No |
| Known | Name, hint and permitted progress | No |
| Earned | Description, effects and acquisition record | Yes, subject to explicit eligibility |

Equipped is a marker on an earned title, not another acquisition state. Hint and award conditions are separate. Unknown may advance directly to Earned unless a definition explicitly requires discovery first. A hint alone cannot award the title. Show all nonsecret unmet conditions and define AND/OR requirements explicitly.

Acquisition routes include committed encounter/exploration achievements, claimed quests, character milestones, title coupons and later skill mastery. A boss award names eligible boss/encounter IDs; a dungeon clear requires the final successful exit after treasure. Early return, entering the boss room or a cosmetic victory animation is not a clear.

State achievements may catch up from reliable saved facts on load/migration. Event achievements require recorded evidence: current level does not prove a past damage-free fight, and selected Mage does not prove a rebirth into Mage. Evaluate level achievements at committed level-up boundaries. Age titles wait for actual aging support; creation age is currently static metadata.

For stat-threshold achievements, use a specified progression-only basis—base attributes, level/talent growth and learned-skill contributions—excluding equipped gear/titles and temporary buffs. An INT title must not unlock itself or another achievement solely through its equipped bonus. Avoid evaluating awards from reconstructed UI text.

A coupon is an inventory item until consumed in a town unlock operation. Consume it and record the title together. Already-owned, unknown or invalid title IDs reject without consuming the coupon; duplicates do not turn into unrequested gold/AP. Earned title records occupy no inventory space. Distribution, expiration and trading need separate rules before introduction.

## 3. Equipped effects and stat integration

Each selected title is a removable source identified by title ID and slot. Recompute from sources rather than repeatedly adding/subtracting rounded totals:

1. Resolve progression attributes and eligible skill/talent contributions.
2. Include authored title attribute modifiers before deriving their dependent combat stats.
3. Derive resource maxima, damage inputs, defenses and related values once.
4. Apply supported direct title modifiers with equipment/other direct sources and existing clamps.

Use typed flat attribute, resource-maximum, attack, defense and protection-rating effects for the first slice. Protection uses the existing **rating-to-reduction curve**, not an unexplained percentage-point bonus. Current combat already supports critical and speed stats; new title effects on those fields still need explicit types, bounds and fixtures. A speed effect is captured at encounter entry; mid-encounter changes do not reorder the fixed turn queue.

An STR modifier contributes through its normal conversion and is not also direct physical damage unless a separate effect says so. Preserve the distinction between general attack and magical range/healing inputs in Stats. Do not assume a physical-attack title strengthens every spell.

Benefits and penalties both apply. For example, First “Max HP +10, Max MP -5” plus Second “Max HP +5” yields title contributions of +15 HP and -5 MP. Removing the First leaves only +5 HP. Merely earning another title changes neither totals nor current pools.

Higher maxima never refill resources; lower maxima clamp current HP/MP/SP to their valid limits, including wounds. Title swaps cannot repeatedly recover HP. Titles do not grant turns, AP or ranks through a stat modifier. Percent effects or skill-specific adjustments require explicit supported semantics before content uses them; no generic percent-modifier stage exists today.

## 4. Combat evidence and durable awards

Keep combat achievement evidence inside the active battle until its result completes. Merge eligible counters/awards once with hero resources, consumptions, wear and rewards. Victory-only conditions require victory; participation or survival practice may have a separately authored defeat rule. Restarting an unfinished encounter discards its evidence. Permanent awards never subscribe directly to hit animations or sound events.

Already committed counters and awards survive later dungeon defeat/early return. Dungeon-wide challenge evidence can live in the saved run, but awards only on its named completion and is discarded on failure. This is different from retaining ordinary encounter progress. Title effects use the next encounter's hero state; there is no whole-run profile/title snapshot owner.

Quest/title rewards, coupon consumption and title selection each use one validated campaign candidate. Save before publishing success, retain the exact failed-write candidate and prevent duplicate awards on retry. Process simultaneous awards in stable title-ID order. Awarding a title does not equip it or trigger another award through new effects. This durable host coordination is planned, not already supplied by the current v5 autosaver.

RP scenarios later use their own NPC template. Hero titles and their progress are excluded unless a named scenario-completion reward explicitly awards a hero title. Borrowed NPC stats cannot satisfy an ordinary hero milestone.

## 5. Later Master Titles

Master Titles require a separate authored checklist at **Rank 1**, after the Skills rank progression is supported. Rank 1 alone, 100 normal training points, or Master talent standing is insufficient. Perfect mastery completes every required checklist objective; earlier ranks need not have been perfectly trained.

Track mastery evidence separately from rank-up training. Completing it grants the Master Title without another rank or AP payment. Prototype-capped F/E skills must not advertise unreachable mastery tasks. Master Titles use First and compete with other First Titles; owning several does not stack their bonuses.

Future ordinary rebirth preserves skills and therefore their eligibility. If a separate skill-reset feature later lowers a required rank, retain the achievement but clear an ineligible selection at a safe boundary with an explanation. Reaching the rank again restores eligibility without repeating mastery. Dan/Grandmaster challenges remain separate features.

## 6. Illustrative starter catalog

These are original placeholders, not implemented content or copied reference rewards. Named quests/encounters must exist before definitions can ship.

| Title | Slot/category | Hint | Award | Equipped effect |
| --- | --- | --- | --- | --- |
| the First Delver | First / General | Enter the introductory dungeon | Complete its final treasure exit | Max HP +10 |
| the Guardian Breaker | First / Combat | Encounter its guardian | Win that named guardian encounter | Physical Attack +3, Max MP -5 |
| the Seal’s Witness | First / Story | Discover G1's final quest | Claim its final reward | Magic Attack +3, Physical Defense -1 |
| Lantern Companion | Second / General | Inspect its town-quest coupon | Consume that coupon | Max HP +5 |
| the Seasoned, later | First / Character | Reach actual age 18 | Commit actual age 20 | Max SP +10 |

Guardian victory and dungeon completion are distinct boundaries; both awards may eventually be earned but do not require a second reward reconciliation at exit. The age title waits for aging and remains earned after rebirth to a younger age. Start with two competing First Titles and one Second so combined effects and choice are visible.

## 7. React Native collection and saving

Expose a title list/detail view from Character using the selected character's existing context/host. Compact portrait screens show First/Second selections, category/slot filters and earned/known entries. Details include hint, progress, exact benefits/penalties and eligibility. Stat previews use the same engine sources as confirmation, including pool clamping. Show “Change titles in town” when selection is unavailable; inspection/favorites remain free.

Use safe insets, large-text layouts, named controls and text/icons alongside color. Search must not reveal undiscovered spoiler text. Notifications follow saved awards; navigation and panel opening never award a title. Talent display is a separate cosmetic control.

Extend src/data definitions and Zod validation for stable IDs, slots/categories, spoiler policy, predicates, effect types, coupons and referenced quests/skills/encounters. Save discovered/earned IDs, committed evidence, source/claim IDs, selections and optional favorites in the campaign hero, with a schema migration. Attempt-local evidence belongs to BattleSession; run challenges belong to the dungeon state.

Missing/retired definitions need a migration policy: preserve the achievement record, disable unresolved effects and explain unavailable selection. Never substitute a different title or mutate the current encounter's content in place. Effective totals are reconstructed, not an independently saved title-stat balance.

## 8. Acceptance

Verify Unknown → Known → Earned and direct awards; hints without ownership; wrong-slot/ineligible selection; two-slot benefits and penalties; no stats from unequipped/favorite/vanity titles; no resource refill; progression-only thresholds; boss encounter versus successful dungeon exit; completed defeat rules and unfinished-attempt discard; quest/coupon claim once; saved retry without duplicate reward; and collection persistence through rebirth/migration. Add complete Rank 1 mastery checklist tests when mastery ships, then validate collection navigation on small iOS/Android screens and web with large text.
