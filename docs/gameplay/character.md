# Rebirth Dungeon: Character Progression

Updated **October 1, 2026**. The React Native application implements saved characters, growth talents, XP/leveling, resources, equipment, and defeat recovery. AP/learned ranks follow the implemented [Skills](skills.md) slice. First/Second selections and their earned collection follow [Titles](titles.md). Talent mastery, aging and deliberate rebirth remain later features. Read with [Stats](stats.md), [Battle](battle.md), [Titles](titles.md), and the [game plan](../game-plan.md).

## 1. Identity and ownership

Character and hero mean the same player-owned progression context. Each selected character has independent campaign save slots; there is no account-wide AP, equipment or skill pool.

| Data | Current owner |
| --- | --- |
| ID, name, creation time, starting age and chosen talent | `CharacterProfile` metadata |
| Class, growth talent, current level/XP, gold, resources, inventory/equipment | Campaign `Hero` |
| World position, discoveries/claims, dungeon and pending encounter | `CampaignState` |
| Temporary combat statuses and turn order | Active `BattleSession` |
| Audio preferences | Global settings, separately persisted |

Creation accepts a 1–24 character trimmed name, Warrior/Archery/Mage talent, and starting age 10–17. The Warden is the current class. Starting age is **setup metadata today**: it neither increases over time nor changes current stat growth. Avoid storing an independently editable second growth talent in gameplay UI; existing save validation checks the selected profile's talent against the hero.

## 2. Implemented leveling

Heroes start at level 1 with zero XP. The cap is **99**, not 200. Enemy XP is awarded on a committed encounter victory, together with the encounter's other rewards. No victory XP is granted on defeat. Earlier committed levels survive later dungeon failure.

```text
XP required for next level = currentLevel × 20
```

Add granted XP, repeatedly subtract the current threshold and increment level while below 99, retaining the remainder. At level 99 set remaining XP to zero. For example, 65 XP at level 1 crosses the 20 and 40 thresholds, reaching level 3 with 5 XP toward its 60-point threshold. Menu visits and load do not award another level.

Current level growth adds 0.5 per earned level to the talent's selected attribute; base/effective attributes use the precision and caps in [Stats](stats.md). Current level-up calls `restoreHero`: it explicitly fills HP/MP/SP, clears wounds and restores fullness. Preserve this behavior separately from no-refill stat/rank/equipment changes.

The skills milestone adds **1 AP per actual earned level** and its separate **3 AP one-time introductory milestone**, not retroactive AP for imported levels. Count every level crossed in a large XP grant. AP never auto-ranks a skill: the player still needs 100 training points and the authored AP cost in town. Existing heroes have no AP field until that migration ships.

## 3. Growth talents

| Talent | Implemented starting effect | Level growth |
| --- | --- | --- |
| Warrior | STR +20 | STR +0.5 per earned level |
| Archery | DEX +10, max HP +5, max SP +5 | DEX +0.5 per earned level |
| Mage | INT +10, max MP +10 | INT +0.5 per earned level |

Talent does not change the hero's class or automatically grant every reference skill. All current Warden talents start with Firebolt, Icebolt, Lightning Bolt and Healing. Archery is a growth choice today; it does not imply that the unavailable ranged-attack catalog entries are implemented. The learned-rank migration preserves those four starters and their current stat contributions.

Creation fixes the talent for current gameplay. A future talent change/rebirth must update profile/hero consistency and saves in one coordinated transition; do not add a screen-only selector that silently changes combat growth. Skill categories organize the journal and need not map one-to-one to talents.

### Proposed talent mastery

Maintain mastery for each authored talent, independently of the current growth choice. Derive talent experience from cumulative contributions of associated learned skills at their current ranks, then select the highest authored mastery threshold. Partial training and ordinary XP are not mastery experience; there is no second AP payment.

A skill can contribute to multiple talents. Its contribution at E replaces its F total rather than being added again. Mastery bonuses derive once from the current mastery level and remain when another talent is selected. Begin with a small authored ladder; a full Untrained → Master ladder and Grandmaster challenges require balanced content. Training multipliers remain deferred and cannot bypass the 100-point gate.

## 4. Encounter and dungeon boundaries

Outside battle, the campaign hero is authoritative. Encounter entry copies that hero; accepted combat mutates only the battle copy. Committing the result writes resources, consumable use, weapon wear and victory rewards back to the hero. XP and future AP/training from this encounter are banked before entering another encounter, rather than waiting for a dungeon exit.

Defeat restores resources and returns to the refuge, clears the current dungeon and halves current gold with flooring. It preserves levels, inventory and weapon wear; it does not deliberately rebirth the hero. The existing “Reborn at the refuge” wording is recovery flavor, not evidence of level/age reset.

The skills plan retains eligible training from both completed victory and defeat. Restarting/leaving an encounter before its result commits discards that attempt's pending training and replays the saved entry state. Already committed gains survive dungeon return/failure. Do not layer a separate run-outcome rollback over these gains without an explicit redesign and migration.

Town-only progression commands require no active dungeon or pending encounter. Equipment/consumables retain their implemented exploration rules between encounters. A new battle receives updated hero state; there is no expedition-wide frozen character profile.

## 5. Proposed lifetime progression and aging

These fields and clocks are **not implemented**. Add them only after skill progression and stable migration/durability are available.

Cumulative level can use `1 + total earned level-ups across all lives`. It increments only for actual levels earned; resetting to level 1 is not an earned level. Before deliberate rebirth exists, legacy cumulative level can initialize from current level, with no extra AP or retrospective rewards. Lifetime level does not automatically multiply combat stats.

Proposed aging keeps the previous offline-friendly concept: one year per seven elapsed real-world days since creation/rebirth, reconciled in town with no active dungeon/encounter. Store the life ID, starting age, interval anchor, highest processed interval and accrued life growth. Supply the clock to pure rules; battle never reads wall time. Never re-award an interval on load/backward clock changes. Forward-clock trust and anti-manipulation remain product decisions.

| Destination age | Later proposed age-up reward |
| --- | --- |
| 11–20 | 5 AP plus authored base and talent age growth |
| 21–25 | 5 AP plus authored base age growth |
| 26+ | Age increases with no AP or stat growth |

These are optional future balance defaults, **not AP sources for the initial skills slice**. Choosing an older starting age grants no skipped age-up rewards. Display actual age directly. Any visual aging leaves collision, targeting and touch areas unchanged.

Current level growth is derived from the selected talent and level. Adding age-dependent earned growth would require a new accumulated-life-growth model and migration; simply plugging current age into `calculateCharacterStats` would retroactively change every earlier level. Process missed age intervals once in chronological order, save the candidate before notification, and test with an injected clock.

## 6. Proposed deliberate rebirth

A life spans many dungeons. Rebirth is a separate town action with a preview, explicit eligibility, fee/cooldown and durable saved result. Those economy rules remain unresolved, so no usable Rebirth control should appear yet.

| State | Proposed transition |
| --- | --- |
| Current level/XP | Reset to 1/0 |
| Life-growth stats | Remove old life growth; apply the new starting profile |
| Starting age/talent | Choose allowed values and start a new life interval |
| Cumulative level | Preserve; reset itself adds no level |
| Skills/ranks/training and unspent AP | Preserve; no AP refund or reset grant |
| Talent mastery, earned titles, committed quests | Preserve |
| Inventory, collection pages, installed enchant values | Preserve; reevaluate eligibility/conditions |

Rebirth cannot bypass a pending encounter, discard an unresolved saved candidate, or grant rewards again. Preview resource and equipment effects under the new life, and explicitly author whether this ceremonial action restores resources; no general stat recalculation may refill them by accident. If future equipment becomes illegal, use a validated transfer to carried storage or saved overflow rather than deletion.

Existing profiles fix talent and age metadata, so the implementation must define how a new life updates that metadata and hero growth together. Never reset gameplay and leave a conflicting profile talent that makes the next load fail. Rebirth-triggered quests record the qualifying life event; simply creating or selecting a Mage does not prove rebirth into Mage.

## 7. UI and implementation

Reuse the selected character's `CharacterGameContext`, existing Character/Stats/Inventory views and [CharacterStatsDetails](../../src/ui/shared/CharacterStatsDetails.tsx). Show implemented level/XP, talent, age metadata, resource/wound/fullness state, gold, equipment and stat sources. Label future cumulative level, AP, mastery, next age reward or rebirth only when their data/rules exist. The mobile screen should not claim a live aging countdown from a static setup age.

Keep rules in [Character.ts](../../src/engine/rpg/Character.ts) and [Stats.ts](../../src/engine/rpg/Stats.ts), progression ownership in [JourneySession](../../src/game/JourneySession.ts), identity in [CharacterProfile](../../src/persistence/CharacterProfile.ts), and versioning in [SaveSchema](../../src/persistence/SaveSchema.ts). Future pure mastery/aging/rebirth modules can live in `src/engine/rpg/`; route files remain thin.

Extend the campaign hero for gameplay fields, with a save-version migration preserving current levels/resources/items and starter skill totals. Use the host-owned candidate/save operation proposed by skills.md for AP, life resets and coupled profile changes; failed writes retry the same candidate. UI, audio and lifecycle callbacks cannot grant progression independently.

## 8. Delivery and acceptance

First keep level 99, exact `level × 20` thresholds, fractional talent growth and explicit level-up restoration stable. Add the skills AP/rank pipeline, then authored mastery. Aging/rebirth follow only when their clock/economy/profile update rules are defined. Separate exploration XP tracks, race systems, premium talents, paid age changes and Grandmaster remain deferred.

Verify multi-level XP/remainders and cap behavior; one AP grant per new level; no retroactive AP on migration; starter bonuses once; current talent/profile consistency; victory-only XP; defeat preserving levels/gear; encounter restart without pending training; and character isolation. For later aging/rebirth, verify interval catch-up, backward clock handling, reward cutoffs, no retroactive growth rewrite, reset/preserve behavior, equipment capacity, coupled saves and retry without double rewards. Run lint/typecheck and focused RPG/persistence tests, then mobile character switching/suspend checks.

Historical inspiration: [Mabinogi Level](https://wiki.mabinogiworld.com/view/Level), [Talents](https://wiki.mabinogiworld.com/view/Category:Talent), and [Rebirth](https://wiki.mabinogiworld.com/view/Rebirth). Their original September 2026 research does not replace this project's cap, growth or checkpoint rules.
