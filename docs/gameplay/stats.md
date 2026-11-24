# Rebirth Dungeon: Stats and effects

**Planned Defold domain rules.** The [game plan](../game-plan.md) and [turn-based contract](../turn-based-plan.md) govern scope and timing; [stats implementation](stats-implementation.md) supplies adopted numeric conversions. Mabinogi's [Stats snapshot](../references/mabinogi-stats.md) supplies vocabulary, not automatic rules.

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
