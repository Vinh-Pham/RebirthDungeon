# Rebirth Dungeon: Stats and effects

## Web character stat rules

The web game uses the current Mabinogi World Wiki Stats page, retrieved through
Exa, for its character rules. The linked Level and Talent pages provide starting
values and talent bonuses, the Protection table converts ratings to percentages,
and Bare Hands and Lucky Gather supply their specific values. [Stats](https://wiki.mabinogiworld.com/view/Stats) · [Level](https://wiki.mabinogiworld.com/view/Level#Starting_Stats) · [Talent](https://wiki.mabinogiworld.com/view/Talent) · [Protection](https://wiki.mabinogiworld.com/view/Stats/Protection) · [Bare Hands](https://wiki.mabinogiworld.com/view/Bare_Hands) · [Lucky Gather](https://wiki.mabinogiworld.com/view/Lucky_Gather)

| Wiki section | Web behavior |
| --- | --- |
| Overview, age and AP | Shared starting attributes, talent-specific growth, rank and equipment modifiers. New characters get 5 AP and levels award 1 AP. Saturday noon Pacific age-ups are applied on load, with age AP through 25 and sourced talent age bonuses through 20. |
| Life, Mana and Stamina | Current pools persist. Natural recovery is 0.12 Life, 0.05 Mana and 0.4 Stamina per active second. The underground map uses the standard mana rate. Level-up refills all pools and clears wounds. |
| Wounds, injury and Deadly | Wounds restrict ordinary healing. Physical attacks can inflict wounds after effective protection. A lethal hit from at least half Life triggers the wiki's guaranteed Deadly outcome. The chance below half Life is undocumented. |
| Strength, Dexterity, Will and Luck | Weapon-specific scaling, physical and magic Defense, Balance, Injury, Critical and Armor Pierce. Normal attacks at zero Stamina use bare-handed damage. Wood gathering uses Luck for 2× and 20× yields. |
| Intelligence, magic and alchemy | Magic Attack, Magic Balance, Magic Defense, Magic Protection, alchemic damage and advanced spell reductions are derived and visible. Spell-specific damage and mana costs require playable spells and their rank data. |
| Damage, critical and mitigation | ATB uses weapon ranges and Balance, the Critical Hit rank gate, a 30% critical chance cap and protection before Defense. The equipped skill set supplies applicable modifiers, including the Windmill critical exception. |
| Movement | Human and Giant share a baseline. Elf route and held-key movement use a 1.14× multiplier. |
| Hunger, bonuses, Pet Points and status effects | The active rules cover injury and Deadly. Hunger sources, pet perks, enchantments, titles, Arcana, equipment sets, and spell or alchemy effects require their respective content systems. Craft recipes currently have fixed outcomes and use no success rolls. |

## Planned Defold domain rules

The [game plan](../game-plan.md) and [turn-based contract](../turn-based-plan.md)
govern the Defold design. [Stats implementation](stats-implementation.md)
supplies its proposed numeric conversions.

## 1. Ownership

Pure Lua modules under proposed `game/domain/stats/` resolve progression, equipment and live status sources. Catalogs define stable IDs, units, bounds, costs and effects. GUI/world code reads projections and submits commands. Store source data and current pools, not just flattened final totals; removing a modifier recomputes from remaining sources.

Run entry freezes profile growth, learned ranks, equipment/title contributions and versions. Live status and breakage sources apply above that baseline. Earned profile growth must not replace the active run snapshot.

## 2. Resources

HP, MP and SP have current and maximum values; shield is separate absorption. Clamp current pools when a maximum decreases. Increasing a maximum, equipping a bonus, removing a penalty or loading never refills resources. Recovery comes from explicit effects, town healing, defeat recovery or a specified rebirth outcome.

Preserve fractional stamina and growth. HP payments leave at least 1 HP and bypass Defense, Protection and shields. Payments do not train incoming-damage objectives. Ordinary healing/regeneration cannot revive defeated actors.

## 3. Skill costs

Validate all required pools together, then deduct once before effects in the same candidate. No partial payment or reserved-cost phase exists. Menus/targets/previews spend nothing. Recovery produced by the action cannot fund its own cost.

For a positive authored pool cost, apply flat modifiers then `max(0, 1 + summed_percent_modifiers)`. Attack rounds the result upward to tenths, minimum 0.1; other positive skill costs round upward to whole numbers, minimum 1. Authored zero pools remain zero. Wait is the explicit emergency exception to positive main-action costs.

Combat Mastery gives Attack a base cost `2 + 0.1 × rank_index` and owner-start recovery from 0.5 to 2.5 SP by rank group. Both exact tables are in [turn-based-plan.md](../turn-based-plan.md). Show enough precision to explain affordability.

## 4. Attributes and combat stats

STR contributes to melee/gun attack and Defense; DEX to ranged attack and encounter Speed; INT to magic/gun attack and Magic Protection; WIL to Magic Defense. LUK has no hidden loot, hit or critical bonus. Use explicit conversions in the implementation contract.

Defense/Magic Defense are flat reductions. Protection/Magic Protection are direct resistance in 0–100%, not the source game's rating curve. Shield absorbs after mitigation. Skill rank selects base power, attack category/multiplier and hit allocation; include each equipped weapon contribution once. Critical behavior is authored and uses the battle RNG; no dice probabilities exist.

## 5. Sources and calculation order

1. Build progression-only primary attributes from starting profile, life growth, skills and enabled talent sources.
2. Apply equipment, equipped titles/enchants when implemented, and live status attribute modifiers.
3. Derive combat values from effective attributes and their own explicit base values. Resource maxima use explicit growth, not an extra hidden attribute conversion.
4. Apply direct derived-stat modifiers once, clamp values, then clamp current pools.

For integer stats use `clamp(floor((base + sum(flat)) × max(0, 1 + sum(percent))), min, max)`. Add percent modifiers within the stage, independent of insertion order. Use percentage points for resistance additions. Preserve four-decimal growth and two-decimal Protection; see numeric bounds in the implementation contract. Reject circular/unknown dependencies.

Identify sources individually: life growth, skill/rank, equipment instance/slot, title ID/slot, enchant clause, status instance. Do not duplicate an STR modifier as direct attack unless content explicitly grants both. Removal must not subtract an old rounded bonus from a cached total.

## 6. Buffs, debuffs and item effects

Status definitions declare target/source, effect kind, stacking group, priority, duration/boundary, removal tags and content version. Separate instant recovery, periodic damage/recovery and temporary stat modifiers. Removing a mixed potion's penalty does not undo its earlier mana recovery.

One instance per group/target. Reapplying the same ID/version refreshes duration without increasing magnitude. Higher priority replaces, lower priority is ignored without refresh, equal priority replaces. Cleanse/dispel only tagged eligible effects; equipment penalties stay while equipped. Any stacking exception needs explicit bounded rules.

Ordinary duration/cooldown counters use owner turn ends and skip the current application/casting turn. At an eligible end process periodic effects in stable group/source order, check termination, decrement/remove, recompute/clamp, then regenerate if alive. Defense and unused Counterattack expire at next owner start. Mana Shield pays upkeep at three subsequent owner starts and expires on the third. Combat Mastery recovery is start-only.

Exploration, menus and optional items do not tick ordinary battle counters. Effects freeze between encounters and clear on run exit under the initial policy. A skill usable outside battle needs its own explicit, testable cooldown boundary; do not expose a cooldown that can never expire before its rule is authored.

## 7. Battle timing and consumables

Capture action costs, attack inputs and target defenses at command resolution from the committed baseline/statuses. Newly applied modifiers affect later actions unless an authored ordered effect explicitly says otherwise. Enemies cannot interleave an in-progress transaction.

One eligible consumable is optional before the main action; apply it and persist the allowance immediately. Invalid use consumes nothing. Ordinary recovery potions work in town; timed battle potions require a run. Equipment changes require town with no active run.

Druid displays current/max pools, exact costs, source breakdowns, shield and effects with timing/removal details. No resource reservation meters are needed. Shared preview selectors never sample randomness.

## 8. Saving and verification

Persist source snapshots, live pools, statuses/timing counters, cost outcomes, RNG continuation and turn markers in the same validated character envelope. Loading cannot refresh durations, reapply restoration/growth or repeat upkeep. Version content explicitly; future Defold migrations preserve frozen source semantics.

Lester covers modifier order/removal, fractional costs, no-refill clamps, mixed/HP costs, stacking, turn boundaries, periodic defeat, previews and rejected commands. Engine fixtures cover actual save/restart. Wounds, hunger, toxicity, accuracy/evasion, variable initiative and cross-run illness remain deferred.
