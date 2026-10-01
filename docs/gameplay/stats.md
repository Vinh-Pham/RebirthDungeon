# Rebirth Dungeon: Stats, Resources, and Status Effects

Updated **October 1, 2026** for the TypeScript engine in the Expo/React Native app. Resources, attributes, damage ranges, Balance, hit/critical resolution, wounds, fullness, equipment and statuses are implemented. Learned-rank passives, titles, enchants and additional effect types are planned extensions. Read with [Battle](battle.md), [Character](character.md), [Skills](skills.md), and [Inventory](inventory.md).

## 1. Authoritative stat model

[Stats.ts](../../src/engine/rpg/Stats.ts) owns character derivation; [Resources.ts](../../src/engine/rpg/Resources.ts) owns resource ticks and affordability; [StatusEffects.ts](../../src/engine/rpg/StatusEffects.ts) owns temporary combat effects. React displays their outputs rather than maintaining a second formula. The current conversions are game rules already present in source, inspired by Mabinogi vocabulary rather than a promise to reproduce its full system.

| Source | Current behavior | Planned extension |
| --- | --- | --- |
| Starting attributes | STR 55, INT 48, DEX 58, Will 57, Luck 47 before talent/skill grants | Content-defined starting profiles if needed |
| Growth talent | Warrior, Archery, Mage starting bonuses and selected-attribute level growth | Rank-derived talent mastery and deliberate rebirth |
| Skill grants | Stat bonuses from the Warden's four class skill IDs | Replace with explicit hero learned-rank totals under skills.md |
| Equipment | Usable weapon plus owned/equipped armor | Conditional masteries, more slots, instance enchants |
| Dungeon effects | Persistent fountain stat stacks for that dungeon | More supported environment effects |
| Combat statuses | Temporary attack/defense/speed modifiers and periodic damage/healing | Explicit new effect types; no arbitrary modifier strings |
| Titles | Absent | First/Second Title sources, removable and counted once |

Attributes retain the current fractional level-growth precision and clamp to 0–1500. Do not round away half-point growth when saving or converting the learned-skill pipeline. Unknown classes, illegal equipment references and invalid resources are rejected at the validation boundary.

## 2. Attributes and derived combat inputs

| Attribute | Current contributions |
| --- | --- |
| Strength | Physical damage range and physical Defense |
| Intelligence | Magic Attack, Magic Balance and Magic Protection |
| Dexterity | Physical Balance, Armor Pierce and injury range |
| Will | Magic Defense, critical rating and injury range |
| Luck | Critical rating; no automatic loot bonus |

The source subtracts its authored baseline offsets before conversion. Physical min/max damage includes usable weapon values once; the `attack` compatibility value tracks max physical damage. Physical Balance combines the DEX curve and weapon Balance, capped at 0.8. Magic Balance uses INT and is capped at 1. Armor Pierce affects physical Defense. Critical ratings are distinct from final chance: target protection modifies the latter in [Battle](battle.md).

Protection and Magic Protection are **ratings**, not percentage points. The current conversion is:

```text
reduction = clamp((100 / sqrt(2))
                  × log10((rating + 10 × sqrt(2)) / (10 × sqrt(2))),
                  0, 90) / 100
```

Use the existing function rather than approximating displayed percentages back into damage. Critical chance in the range-based branch clamps to 0–30% after protection's reduction. Combatants without ranges retain their legacy damage/chance rules; previews must identify the appropriate branch.

Current modifiers operate on explicitly supported fields. A speed modifier does not reorder the fixed encounter queue. There is no direct shield-HP pool, universal elemental resistance matrix, or dice weighting. [AttackResolver](../../src/engine/battle/AttackResolver.ts) owns sampling and mitigation, including the modern/legacy distinction.

## 3. Resource pools, wounds, and fullness

| Value | Bounds and meaning |
| --- | --- |
| HP | Integer current health; zero means defeated in combat |
| Max HP | Positive integer capacity |
| Wounds | Reduce the healable HP limit; normal HP recovery does not remove them |
| MP/SP | Nonnegative integer pools within current maxima |
| Fullness | 50–100, stored in tenth-point precision; affects SP recovery and cost |
| AP, XP, training | Separate progression quantities; AP is planned and never pays for combat |

```text
healableHP = max(0, maxHP - wounds)
```

Physical damage can add wounds using the resolved injury fraction and actual damage, then clamp current HP to the new healable limit. Magical damage has no physical injury in the current path. Potions/Healing restore current HP only up to the unwounded limit; they do not revive or heal wounds. The healer/full-recovery flow removes wounds explicitly.

Changing capacity is not recovery. Planned passive/equipment/title/enchant maxima must preserve current HP/MP/SP when increased and clamp them when reduced. Removing a penalty does not refill lost capacity. Preserve explicit exceptions: **current level-up, healer/full recovery, and defeat recovery do restore resources**. Those actions use `restoreHero`; a stat recalculation alone must not copy that behavior.

## 4. Costs and exhaustion

Skills author MP and base SP costs. Selection and previews spend nothing; confirmation validates the complete target/resource plan before randomness and then pays once. No current/reserved split is needed because combat resolves synchronously after confirmation.

```text
threshold = maxStamina × fullness / 100
SP cost = ceil(baseCost × (currentStamina > threshold ? 1.2 : 1))
```

Use this helper in both UI and resolution. A zero authored cost stays zero. Current Defend and Rest have no MP/SP cost. Healing another ally costs no SP; self-Healing uses its base 6 SP with the above adjustment. Do not impose the former universal positive-cost rule on those existing actions.

Basic Attack normally pays 2 base SP. Insufficient SP activates its existing bare-hand fallback rather than blocking the action: remove weapon-derived stats for that action and exclude weapon wear, while retaining the existing stamina deduction. Learned skills with an unaffordable positive SP cost are rejected. Low SP does not otherwise secretly reduce a successfully validated skill's power.

HP costs, resource upkeep and generic percentage/flat cost modifiers are future effect types. If nonlethal HP payments are added, validate every required pool together and require at least 1 HP afterward; payment is not enemy damage and cannot be mitigated by defense or counted as injury training. Do not author such costs until the resolver supports them.

## 5. Sources and calculation order

Retain the actual pipeline rather than imposing a generic summed-percent formula that is not implemented:

1. Build starting/talent/level attributes and the current skill stat grants.
2. Add attribute bonuses from usable equipment; clamp effective attributes.
3. Derive physical/magical ranges, defenses, protection ratings, Balance, critical and injury inputs from those attributes and equipment.
4. Apply supported dungeon stat modifiers to the derived inputs.
5. Apply temporary encounter status modifiers to detached effective combat inputs at action resolution.

Current resource maxima are authored starting/talent capacities; attribute growth does not automatically increase every pool. Temporary `attack` modifiers update the physical min/max range and compatibility `attack` field; they do not become Magic Attack. Temporary defense/speed modifications are also supported. Equipment bonuses, dungeon effects and encounter statuses must not be reapplied through both a source total and a second status.

The skills extension adds explicit learned-rank and eligible-action contributions in this dependency order. Permanent rank grants are **cumulative totals at the current rank**, not accumulated again on every level-up/load. Melee/sword bonuses require action tags, usable equipment and the appropriate attack type. A spell cast while holding a sword does not gain sword damage/Balance.

Future titles and enchants enter as identified removable sources: item instance/slot/clause or title ID/slot. Recompute from sources when removing/replacing them; never subtract a cached rounded value from final totals. Protection effects add rating units unless a new percentage-resistance effect is separately introduced. Percent modifiers and expanded stat fields need typed schemas, dependency ordering, caps and rounding fixtures before any catalog entry uses them.

## 6. Status definitions and timing

Current status definitions specify ID, duration, `turnStart`/`turnEnd`, `refresh`/`stack`/`ignore`, and either periodic damage, periodic healing, or a signed attack/defense/speed modifier. Runtime instances store source ID, remaining turns and stacks. Matching is by **status ID**, not a generic cross-skill stacking group.

| Reapplication | Current behavior |
| --- | --- |
| Refresh | Reset remaining duration; no increased stacks |
| Stack | Increase to at most 10 stacks and reset duration |
| Ignore | Leave existing instance unchanged |

On the affected actor's matching turn boundary, resolve its periodic effect, decrement the counter and remove it at zero. A newly applied self `turnEnd` buff ticks at the end of its casting turn. For two useful future owner actions, author duration 3. An effect applied to another actor ticks at that actor's next matching boundary, not the caster's boundary. Turn-start deaths skip the defeated actor; encounter defeat/victory resolves before another action.

Periodic damage/healing uses existing status order and power × stacks. Status damage does not use attack/critical/injury calculations or Defend reduction; periodic healing respects wounds and does not revive. A status that kills its target can stop further status processing under the current resolver. Menus, movement animations, tooltips and time offline do not tick combat statuses.

Temporary encounter statuses disappear when BattleSession ends or an unfinished encounter restarts. Dungeon fountain effects are separate stat stacks in `DungeonRun.effects`, persist between encounters, do not decrement at owner turns, and clear when leaving/losing the dungeon. Neither should be described as a permanent stat grant.

Cooldowns and Counterattack's start-of-next-turn reaction window are separate planned counters under [Skills](skills.md), not ordinary status durations. Scoped attack buffs, priority groups, cleanse/dispel, shields, mixed potion side effects and persistent illnesses require explicit additions; existing `focus`, `weakness`, and `burn` definitions do not prove every such effect is playable.

## 7. Recovery and consumables

A resource tick occurs after a completed battle action and on accepted exploration movement/rest. It does not occur from selecting a panel, reading Inventory, shop browsing, or passive wall-clock time.

For living actors with the resource model, normal ticks recover up to 1 HP and 1 MP within limits. Stamina recovers toward `floor(maxSP × fullness / 100)`, normally by 1 and at the Rest/Defend base rate of 10; the current function also applies its above-fullness-threshold adjustment. Player fullness drops by 0.1 per tick with a 50 floor. Rest does not clear wounds. `TRAVEL_TO` may execute multiple valid steps, so each step has its normal tick and encounter checks.

Consumables define the restored pool, amount, optional stamina bonus and fullness recovery. `consumableRecovery` prepares a detached capped recovery plan. Battle-usable potions consume an Item turn; food flagged unavailable in battle is still usable in exploration. Using an item at a full pool may restore zero and still consume it under current rules, so do not label it an effective-healing training outcome. A future no-benefit rejection would be a deliberate gameplay change.

Town HEAL/full recovery and level-ups use the explicit restore action. Changing gear, rank or title never substitutes for it. Additional food effects, poisoning, buffs/debuffs or revival need schema/resolver work before they can be exposed.

## 8. Persistence, presentation, and validation

Hero saves hold pools, wounds, fullness, growth talent, equipment and weapon durability. Effective stats are reconstructed; active encounter statuses are not stored in version 5 saves. A pending encounter restarts with its entry state/seed. Dungeon fountain stacks remain in the saved dungeon. Future learned ranks/titles/enchants extend the versioned hero sources and must preserve existing resource values on migration.

UI shows current/max pools, unwounded HP limit, wound/fullness feedback, effective action costs, active statuses and remaining owner ticks. Previews use the same preparation functions without RNG; resource regeneration/critical/healing cannot be promised as exact until resolved. Keep source explanations concise and distinguish planned effects from active ones.

Verify fractional talent growth, caps and protection conversion; equipment/dungeon/status contributions once; physical versus magic scaling; cost thresholds and ally/self Healing; exhausted attacks; injury/wound clamping; recovery limits and explicit restore exceptions; status stack/timing/deaths; fixed initiative despite speed changes; no menu-time recovery; and save migration/restart. Add typed effect/maxima/cost tests when those extensions ship, then run lint/typecheck and relevant RPG/battle suites.

Historical inspiration: [Mabinogi Stats](https://wiki.mabinogiworld.com/view/Stats). The earlier September 2026 research is context, not a fresh audit or an alternative executable formula.
