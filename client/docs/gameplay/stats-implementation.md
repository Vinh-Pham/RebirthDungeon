# Stats implementation — rules version 1

Implements the first playable slice of [stats.md](stats.md). The [local Stats wiki snapshot](../references/mabinogi-stats.md) was retrieved with Firecrawl on September 17, 2026. Mabinogi supplies vocabulary and source context; the following values are authored for Rebirth Dungeon.

## Resolution and ownership

`src/domain/stats/` owns resolution, cost calculation, status updates, and validation. Commands remain Immer transactions, persisted before publication. Pure status/recovery helpers also use Immer. Growth retains four decimal places; integer stats floor once per stage, and Protection retains two decimal places. Percent modifiers use integer basis points (100 = 1%). Modifiers add within each stage; they never compound by insertion order. Arbitrary dependency references are rejected: the dependency graph is fixed as primary attributes → combat stats.

Profile/talent starting values and life growth form the base. Each learned skill contributes its own named source, including cumulative wiki attribute bonuses. Equipment, title slots and active statuses remain independent removable sources. Each item contributes once per equipped slot. First/second title source slots are supported; earning/selecting titles and achievement content remain separate work.

| Derived stat                | Attribute contribution before direct modifiers |
| --------------------------- | ---------------------------------------------- |
| Melee attack                | STR × 0.10                                     |
| Ranged attack               | DEX × 0.10                                     |
| Magic attack                | INT × 0.10                                     |
| Dual gun attack             | STR × 0.05 + INT × 0.05                        |
| Defense                     | STR × 0.05                                     |
| Magic Defense               | WIL × 0.05                                     |
| Magic Protection            | INT × 0.05 percentage points                   |
| Protection and regeneration | Zero unless a source grants it                 |

Luck has no hidden bonus. Resource maxima use explicit progression values, with no additional attribute conversions. Protection is direct resistance from 0–100%, not Mabinogi's rating formula. Other numeric stats cap at 1,000,000, with a minimum of zero except Max HP (1). Status duration caps at 1,000 activations; source and modifier lists are bounded. Current pools clamp after maximum reductions; removing penalties and increasing maxima never refill them. Defeat recovery, paid town healing, and rebirth remain explicit existing restoration events.

Run entry freezes profile/growth, learned ranks, equipment contributions and title sources in a versioned source snapshot. Growth earned during the run applies after leaving. Existing weapon breakage still applies a separately named live penalty. Statuses are live sources. An individual battle command captures costs, attack inputs and target mitigation, validates them together, and pays once before effects in the same immutable transaction. HP payments bypass shields and leave at least 1 HP. Normal Attack costs round upward to tenths with a minimum of 0.1; other positive costs retain ceiling/minimum-one rounding. Zero-cost pools remain zero. Mana Recovery now requires 5 SP up front.

## Playable content

- **Blood Strike:** trainer lesson with a melee weapon; 4 HP + 3 SP, one enemy. Separate skill module, original game content.
- **Arcane Focus:** trainer lesson with a wand; 6 MP, +6 Magic Attack for three subsequent owner activations. Separate skill module, original game content.
- **Defense:** rank-derived Defense/Protection in the shared Guard stacking group; skips casting end, then expires at the next completed owner activation.
- **Strength Draught:** General shop, 18 gold; +10 STR for three activations.
- **Unstable Elixir:** General shop, 12 gold; immediate 45 MP recovery plus −15 WIL for three activations.
- **Renewal Tonic:** General shop, 20 gold; restores 5 HP at each of three eligible activation ends.
- **Antidote / Cleansing Tonic:** General shop, 12 / 25 gold; remove eligible poison / harmful effects. Invalid use consumes nothing.
- **Vigor Coat:** General shop, 95 gold; +2 Defense, +10 Max HP, +2 SP regeneration per completed activation.
- **Focus Wand:** Blacksmith, 120 gold; weapon power 10, +10 INT, −20% MP costs.
- **Giant Spider:** applies Armor Break (−4 Defense, two activations) after its attack. **Red Spiders:** apply Poison (3 damage, three activations). A negated counterattack does not apply the enemy affliction.

Greater Strength (+20 STR, higher priority) and Exhaustion (+50% SP costs) are authored definitions available to future item/enemy content and tested through the same resolver. They are not currently shop drops. Life skills remain catalog references; Wand Mastery stays unverified.

## Status timing and persistence

One instance per target/stacking group. Reapplying the same ID/version refreshes duration without increasing magnitude or replacing its saved definition. A stronger priority replaces, a weaker priority is ignored without refreshing, and equal priority replaces. Cleanse and dispel respect removal tags and cannot remove equipment penalties.

At each completed owner activation: process periodic effects in stable group/source order, decrement eligible durations, remove expired effects, recompute/clamp, then regenerate if alive. Self-applied effects skip that activation end; effects applied outside the owner's activation first tick at its upcoming activation end. No tick occurs for item use, previews, menus or exploration. Defeated actors cannot be revived by ordinary periodic recovery. Temporary statuses clear on run exit/abandonment/defeat. Final Hit retains its duration and named stat source. Defense and unused counters expire at the next owner turn start. Mana Shield pays upkeep at each of the next three owner starts and expires on the third; it does not charge per enemy.

An in-battle consumable uses the optional one-item allowance before the main action, without ending the turn. Recovery and side effects apply once, and failed use preserves the item and allowance. Timed potions require a run; ordinary recovery potions can be used in town. Status definitions, source/target identity, duration and skip counters are serialized. Schema 5 upgrades earlier stat/inventory/quest schemas, preserves frozen run sources, and discards unpaid dice selections without recovery or spending. Loading never repeats recovery, growth or status application. Zod and domain checks reject malformed or unsupported saves.

The Character panel displays current/max pools, Speed, effective values, named source breakdowns, shield, effects and timing/removal details. The HUD preserves fractional resource precision. Catalog and battle controls show all required cost pools.

Wounds, hunger, toxicity accumulation, accuracy/evasion, initiative changes, full title acquisition, cross-run illnesses and additional Mabinogi-specific conversions are deferred. Existing critical-hit mechanics are unchanged.

## Character information window

The Character modal shares the Skill Journal’s native HeroUI tabs, neutral secondary cards,
spacing, and modal shell. Stat groups stack on narrow screens; tab content scrolls within a
55dvh maximum height.
Basic Info shows identity, current resources, XP, level/AP, resolved attributes and combat stats,
and active effects. All four bars use HeroUI ProgressBar. Reserved resources remain visible.
Additional Info explains stat rules and retains source and effect breakdowns using HeroUI accordions;
the Status Effects Details button opens this tab. Part-Time Job and Potential explicitly show
unavailable states. No unsupported reference-game stats or progression systems are invented.