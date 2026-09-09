# Rebirth Dungeon: Stats, Resources, and Status Effects

Stats describe a character's resources, attributes, attack power, and defenses. They come from character growth, learned skills, talents, and equipment, and can be changed temporarily by potions, skills, enemies, and other effects. **Activating a skill consumes stamina, mana, HP, or an explicitly authored combination of these resources.**

This is a planned design inspired by [Mabinogi's Stats documentation](https://wiki.mabinogiworld.com/view/Stats). It complements [character.md](character.md), [skills.md](skills.md), and [battle.md](battle.md). The stat sources and resource costs requested above are requirements. Formulas, stacking, durations, and other defaults below are Rebirth Dungeon proposals, not implemented systems or an exact copy of Mabinogi's rules.

The [Phase 4 starter contract](../phase4-combat.md) authors the initial skill values, recovery/exhaustion policy, encounter scope and integration boundary for these rules.

## 1. Mabinogi reference

Mabinogi distinguishes base stats earned through progression from modifiers provided by equipment and effects. It also separates current resource pools from attributes and derived combat statistics.

| Reference concept | Mabinogi behavior | Rebirth Dungeon direction |
| --- | --- | --- |
| Base stats | Skills, age, level, and other progression sources contribute stats; skill gains persist through rebirth while age/level growth is reset. | Track permanent progression and current-life growth separately. |
| Stat modifiers | Equipment, skill effects, consumables, and conditions can increase or reduce stats. | Keep each modifier attached to its source and remove it when that source ends. |
| HP / MP / SP | Life sustains the character; magical actions commonly use mana and physical actions commonly use stamina. | Use HP, mana, and stamina as explicit skill-cost pools. |
| STR / INT / DEX / Will / Luck | Attributes influence damage, defenses, or specialized systems. | Use these names with authored mappings appropriate to dice combat. |
| Defense / Protection | Defense reduces damage by a flat amount; Protection reduces it by a percentage, with magical counterparts. | Supply the flat defense and resistance terms in battle.md. |
| Balance | Influences how damage is distributed between low and high outcomes. | Dice faces and skill-specific weights already supply damage variation; defer a second Balance mechanic. |
| Status effects | Skills and other effects apply temporary conditions. | Model buffs, debuffs, recovery, and damage over time with explicit turn timing. |

Sources: [Base Stats](https://wiki.mabinogiworld.com/view/Stats#Base_Stats), [Stat Modifiers](https://wiki.mabinogiworld.com/view/Stats#Stat_Modifiers), [Mana](https://wiki.mabinogiworld.com/view/Stats#Mana), [Stamina](https://wiki.mabinogiworld.com/view/Stats#Stamina), [Defense/Protection](https://wiki.mabinogiworld.com/view/Stats#Defense.2FProtection), [Balance](https://wiki.mabinogiworld.com/view/Stats#Balance), and [Status Effects](https://wiki.mabinogiworld.com/view/Stats#Status_Effects).

Mabinogi's potion poisoning is a concrete example of consumables causing stat penalties. Its page describes increased recovery effectiveness alongside reductions to attributes, depending on the potion type, and labels itself incomplete. We adopt the possibility of item side effects; exact toxicity thresholds, real-time recovery, and negative hidden stats are not imported. [Potion Poisoning](https://wiki.mabinogiworld.com/view/Potion_Poisoning).

## 2. Resource pools

| Pool | Current value | Maximum value | Purpose |
| --- | --- | --- | --- |
| Health | HP | Max HP | Damage and survival; certain skills pay an HP cost |
| Mana | MP | Max MP | Magical and other mana-consuming skills |
| Stamina | SP | Max SP | Physical, defensive, and other stamina-consuming skills |

Keep **current**, **maximum**, and **reserved** amounts distinct. For example, `SP 12/30, 5 reserved` means 12 current stamina, a maximum of 30, and only 7 available for another expenditure. Reserving is not a second resource deduction.

Proposed bounds are `0 ≤ current ≤ maximum`, with Max HP at least 1 and Max MP/Max SP at least 0. HP reaching zero means defeat under battle.md. Stamina or mana reaching zero prevents unaffordable skills; it does not directly cause defeat or secretly weaken an otherwise affordable action.

**AP is not a combat pool.** It remains the progression currency used to advance a trained skill. Character XP, training points, and talent experience also remain separate from HP, MP, and SP.

### Maximum changes and recovery

A modifier to Max HP changes capacity, not current HP. Raising a maximum does not heal or refill the pool. Lowering a maximum clamps current value to the new maximum; later removing that penalty does not restore the clamped amount. For example, `80/100 HP` becomes `60/60` under a maximum reduction, then `60/100` when the penalty expires. This avoids gaining healing by repeatedly equipping an item or refreshing a buff.

Potions and restorative skills explicitly restore current resources, capped by their effective maxima. Recovery never revives a defeated actor unless a later revival effect explicitly permits it. Shield is a separate temporary damage buffer, not HP and not a pool that can pay skill costs.

Mabinogi uses real-time regeneration. Rebirth Dungeon instead supports authored regeneration at the affected actor's activation-end boundary; rates are balance data, with zero as the default when no recovery rule is defined. Menus, animations, rolls, and rerolls grant no regeneration. Town rest can explicitly restore pools when that feature is authored; leveling, aging, and equipment changes do not implicitly refill them. [Mabinogi resource regeneration](https://wiki.mabinogiworld.com/view/Stats#Mana).

## 3. Skill costs

Every player-activated skill, including a basic sword attack, has a positive cost in at least one of SP, MP, or HP. Physical skills normally use stamina, magical skills normally use mana, and special skills may use HP or several pools. This rule also applies to activated healing and buff skills. Passive learned-stat bonuses are not activations; any future triggered resource consumption needs its own explicit trigger and cost rule.

Each rank defines a cost vector such as `{SP: 5, MP: 0, HP: 0}`. Values are illustrative; individual skill documents will supply the actual costs. Rank may increase a cost as power grows or reduce it through improved efficiency. Never assume that a higher rank is automatically cheaper.

For each authored positive pool cost, the proposed calculation is:

```text
effectiveCost = max(1, ceil((rankCost + flatCostModifiers)
                          × max(0, 1 + summedPercentCostModifiers)))
```

Percent modifiers use fractions: +20% is `+0.20` and -20% is `-0.20`. A pool whose rank cost is zero remains zero unless a future rule explicitly adds that pool to the cost. This initial minimum preserves the requirement that using a skill consumes a resource. All required pools must be affordable together; do not partially pay a multi-resource skill.

### Five-dice payment timing

1. Before rolling, show final costs after equipment, buffs, and debuffs. Reject an unaffordable skill without spending resources, rolling dice, or ending the turn.
2. At the first accepted roll, freeze the costs and relevant stat values, then reserve every required pool alongside the locked skill/rank/profile.
3. Keeping or rerolling dice uses only the existing reroll allowance. It does not pay the skill cost again.
4. Committing the skill converts the reservation into one deduction **before its effects resolve**. Healing or resource generation from that skill cannot finance its own upfront cost.
5. Passing after rolling pays the reserved cost and discards the hand, as defined in battle.md. Passing before rolling has no skill cost.

HP costs bypass shields, Defense, and Protection because they are payments, not damage. The initial default forbids lethal HP payments: `available HP - HP cost ≥ 1`. A skill costing 4 HP is usable at 5 HP but not at 4 HP. Other status damage can still defeat the character afterward. HP spending does not trigger “take enemy damage” effects or training.

No enemy action, resource drain, potion use, equipment swap, or timed expiration may interleave the first roll and commit/pass in the initial battle flow. Future interrupt or on-reroll effects must define how they interact with reservations before being enabled. Repeated commands and reloads never charge the cost twice.

## 4. Attributes and combat stats

Use Mabinogi's attribute vocabulary while keeping numeric conversions in versioned content definitions. These are proposed roles; they do not adopt Mabinogi's weapon-specific ratios or caps.

| Attribute | Proposed role | Boundary |
| --- | --- | --- |
| Strength (STR) | Melee attack contribution and physical Defense | Conversions must be explicitly authored. |
| Intelligence (INT) | Magic Attack and Magic Protection | Does not automatically discount MP costs; a cost rule must say so. |
| Dexterity (DEX) | Ranged/finesse skill scaling and later crafting | Does not introduce a hidden hit roll or change dice odds by default. |
| Will (WIL) | Magic Defense and selected skill scaling | Does not grant Mabinogi's Deadly survival mechanic. |
| Luck (LUK) | Reserved for explicitly authored luck-related effects | No global loot bonus, critical roll, or high-pip bias is assumed. |

Source context: [Strength](https://wiki.mabinogiworld.com/view/Stats#Strength), [Intelligence](https://wiki.mabinogiworld.com/view/Stats#Intelligence), [Dexterity](https://wiki.mabinogiworld.com/view/Stats#Dexterity), [Will](https://wiki.mabinogiworld.com/view/Stats#Will), and [Luck](https://wiki.mabinogiworld.com/view/Stats#Luck).

| Combat stat | Role in Rebirth Dungeon |
| --- | --- |
| Physical Attack / Magic Attack | Derived contributions from appropriate attributes, equipment, and modifiers; selected by the skill's scaling rule |
| Defense / Magic Defense | Flat reduction for physical / magical damage, supplying `D` in battle.md |
| Protection / Magic Protection | Direct percentage resistance for physical / magical damage, supplying `resistance` in battle.md |
| Shield | Remaining absorption points, applied after defense and resistance |
| Resource regeneration | Authored HP/MP/SP recovery per activation-end boundary |
| Resource cost modifiers | Scoped increases or reductions to SP/MP/HP costs |

For this design, Protection is a direct percentage clamped to 0–100%; it is **the resistance term**, not another reduction multiplied on top. This simplifies Mabinogi's Protection rating and diminishing-return conversion. Elemental resistance, penetration, vulnerabilities, criticals, accuracy/evasion, wounds, hunger, and speed modifiers need later rules. The starter initiative cost remains 100 ticks.

The five-dice damage formula remains owned by battle.md. `B` comes from skill rank; `A` reads the skill's allowed effective attack contribution; `D` and resistance read the target's effective defenses. A sword's weapon attack enters the derived attack contribution once. Do not then add the same weapon again as a separate term.

Dice weighting remains skill/rank-driven. A future stat or status may affect a roll profile only through an explicit, visible mapping, resolved before the first roll. “More Luck” or “more Balance” is not permission to silently alter all dice probabilities.

## 5. Sources and calculation order

| Source | Duration or ownership | Example |
| --- | --- | --- |
| Starting profile | Character's current life | Starting STR and resource maxima |
| Level and age growth | Current life; reset according to character.md's proposed rebirth rules | Earned Max HP or INT growth |
| Learned skills and talent mastery | Persistent progression | Rank-based permanent Defense bonus |
| Active talent | While selected, with accumulated growth tracked separately | Current talent's base bonus |
| Equipment | While equipped and its conditions are met | Weapon attack, armor Defense, a cursed ring's penalty |
| Equipped titles | While equipped; First/Second slots chosen in town and fixed for a run's duration per [titles.md](titles.md) | A First Title's Max HP +10 alongside its authored Max MP -5 penalty |
| Consumables | Instant effect and/or timed status | Recover MP; gain temporary STR; suffer temporary WIL reduction |
| Activated skills | Timed effect or explicitly conditional passive | Guard buff, protection spell, weakening curse |
| Enemies, traps, and environment | Authored hit, area, or condition | Armor-break debuff, poison, stamina drain |

Persistent growth follows [character.md](character.md). Age and level changes occur at its existing progression boundaries and do not rewrite active-run stats. Equipped items, the equipped base-title snapshot taken at run start (per titles.md), and passive bonuses are copied into the run's starting state; **live run buffs and debuffs can modify effective stats on top of that baseline**.

Equipped titles are removable modifier sources identified by title ID and slot. Their flat and percent contributions enter at the equipment stage (step 2 below) and the direct derived-stat stage (step 4 below) exactly like equipment, including independent penalties. Title effects are never permanent skill growth, never alter dice probabilities or AP, and never refill pools; lowering a maximum clamps the current value without later restoration. Contributions are counted once per equipped slot — never re-applied as skill mastery or duplicated across sources.

Calculate stats in an explicit dependency order:

1. Build progression-only base attributes from the starting profile, current-life growth, skills, and talents.
2. Apply equipment and live status modifiers to those primary attributes.
3. Derive resource maxima and combat stats from the effective attributes using authored conversions, plus their own base contributions.
4. Apply direct equipment and status modifiers to those derived stats once, then clamp current pools to any changed maxima.

At each attribute or derived-stat stage, use:

```text
effectiveStat = clamp(floor((baseValue + sum(flatModifiers))
                            × max(0, 1 + sum(percentModifiers))), minimum, maximum)
```

Percent buffs and penalties add within the stage rather than compounding in application order. Resistance percentage changes are authored in percentage points; +10 points changes 20% to 30%, not 22%. Use fixed precision for percentage stats and growth, with rounding defined per stat; the floor above applies to integer-valued attributes and combat amounts. Preserve fractional growth in the underlying progression record.

Example: base STR 30, equipment +10, a buff +5, a +20% modifier, and a -10% debuff produce `floor(45 × 1.10) = 49 STR`. Removing the +5 buff recomputes the result from the remaining sources. Never permanently subtract a cached bonus from an already-rounded total.

Attributes, attack, defense, and regeneration have a minimum of zero; resource maxima follow section 2. Stat-specific upper bounds must be authored and validated. Reject circular dependencies and unknown stat IDs. A modifier to STR can affect derived attack through the STR conversion, but it is not also a direct attack modifier unless the item explicitly grants both.

## 6. Buffs, debuffs, and item effects

A **buff** temporarily improves a stat or supplies a benefit. A **debuff** reduces a stat or applies a harmful condition. Both use the same status framework, with a source, target, affected stat, amount, duration, and stacking rule. Effects can originate from player skills, enemy skills, items, traps, or environmental hazards.

Illustrative effects, with all values subject to later content design:

| Effect | Source | Result |
| --- | --- | --- |
| Fortify | Stamina-consuming defensive skill | Temporary flat Defense increase |
| Arcane Focus | Mana-consuming buff skill | Temporary Magic Attack increase |
| Strength Draught | Potion | Temporary STR bonus |
| Unstable Elixir | Potion | Immediate MP recovery plus a separate temporary WIL penalty |
| Armor Break | Enemy skill | Temporary flat Defense penalty |
| Exhaustion | Enemy or cursed item | Increased stamina costs |
| Poison | Enemy, trap, or item | Periodic damage, optionally accompanied by a separately authored stat penalty |

An instant recovery effect changes a current pool once. A stat modifier changes a computed value while active. Damage over time is a scheduled damage event. These are distinct effects even when one potion or skill applies several of them. Removing a buff does not undo earlier healing, and curing poison does not restore damage it already dealt.

### Stacking and removal

Every status defines a stacking group. The initial default is one instance per group per target, shared across casters and item copies. Reapplying the same effect version refreshes its remaining duration without increasing magnitude. For different versions in one group, an authored priority chooses the stronger version; a lower-priority application does not refresh it, and equal priority replaces it. Distinct groups combine through the stat formula.

Any stacking exception must specify its maximum stacks, per-stack contribution, and whether stacks share a duration. Multi-stat effects require explicit priorities rather than inferring strength from one field. Buffs and debuffs in separate groups may coexist and offset each other numerically; they are still separate removable effects.

Effects end through expiration, an applicable dispel/cleanse, loss of their equipment or area condition, or their stated run-boundary rule. Cleanse removes only tagged harmful effects; dispel removes only eligible buffs. Keep beneficial and harmful parts of a mixed consumable as separate status instances so removal rules remain clear. Equipment penalties remain while equipped unless the effect explicitly supports suppression.

### Turn duration

Measure combat durations in **the affected actor's completed activations**, not frames, seconds, global turns, or dice commands. A status applied during the target's current activation begins counting at the end of that target's next activation. A status applied outside the target's activation first counts at the end of its upcoming activation. Thus a self-cast one-activation Defense buff survives the casting turn and protects against enemies before the caster acts again.

At each eligible activation end: resolve periodic damage or recovery in stable effect order, decrement eligible durations and remove expired statuses, recompute stats and clamp pools, then apply configured regeneration if the actor is alive. Once an actor is defeated, ordinary recovery and regeneration cannot revive it. Expiration happens after the last scheduled tick; a newly applied effect does not tick at the same boundary as its application.

Rolls, kept-die changes, rerolls, and paused menus neither tick nor expire effects. Effects remaining between encounters continue through completed exploration actions. The initial default clears temporary run effects when the run ends; cross-run illnesses, persistent potion toxicity, and real-time timers are deferred. Closing and resuming the same run preserves active effects and their remaining durations.

## 7. Battle timing and consumables

Before the first roll, derive current effective stats and costs from the run baseline plus active modifiers. Freeze the selected action's attack inputs, target mitigation, costs, and roll profile with the dice activation. A skill's newly applied buff or debuff affects subsequent actions; it does not retroactively improve the roll or damage that applied it. Skills that deliberately debuff before damaging need a later explicit exception to this default.

When in-battle consumables are introduced, **Use Item** is an alternative full action available before rolling. Consume one item, resolve its instant effects and statuses, then end the activation; do not also roll a skill in that activation. Invalid use consumes nothing. Equipment changes remain a town/loadout operation in the initial battle design. This extends the older game plan's deferred item-action scope without claiming item use exists today.

Show HP, MP, SP, their maxima and reservations, skill costs, effective attack/defense values, and visible buff/debuff icons. Status details show the source, exact modifier, stacking behavior, and remaining target activations. Insufficient-resource messages identify the missing pool. The damage preview must use the same stat resolver as combat.

## 8. Data, saving, and initial scope

Definitions need stable stat IDs, units and bounds, attribute-to-combat mappings, item modifiers, per-rank cost vectors, status effects, stacking groups/priorities, duration rules, and source/target restrictions. Save progression and equipment references separately from current pools, reservations, run-baseline values, and active status instances with source IDs and timing counters.

Rebuild effective stats from saved sources under pinned content/rules versions. Loading must not reapply instant restoration, re-award growth, refresh a status timer, or duplicate reserved costs. Do not save only a final STR value when the source modifiers are needed to remove a buff correctly later. Retained rewards and defeat/abandonment carry-over remain governed by the existing progression plan.

The first slice should prove HP/MP/SP, a stamina sword skill, a mana skill, an illustrative nonlethal HP cost, equipment contributions, one skill buff, one enemy stat debuff, expiration, and save/resume. Add consumable actions with at least one restorative potion and one potion carrying a temporary side effect.

Future implementation checks should cover mixed-cost affordability; exactly-once reservation/payment; HP costs bypassing shield while leaving 1 HP; unchanged reroll costs; max-pool clamping without free refills; modifier order and removal; stacking across multiple sources; self-buff timing; periodic damage and defeat; and previews matching committed damage.

Still open: actual stat-growth conversions, resource costs and recovery rates, stat caps, equipment values, potion strength, status durations, and individual skill scaling. Mabinogi's full toxicity system, wounds, hunger, negative hidden pools, criticals, and accuracy remain deferred. None of these additions changes the five-dice foundation or the requirement to train a skill to 100 points and spend AP before ranking it up.

## Research notes

Mabinogi Wiki sources were retrieved with Firecrawl and inspected on **September 5, 2026**. Proposed Rebirth Dungeon rules are explicitly separated from reference mechanics. Local caches are gitignored research artifacts.

| Reference | Local cache |
| --- | --- |
| [Stats, resource pools, attributes, defenses, and status effects](https://wiki.mabinogiworld.com/view/Stats) | `.firecrawl/mabinogi-stats.md` |
| [Potion Poisoning](https://wiki.mabinogiworld.com/view/Potion_Poisoning) | `.firecrawl/mabinogi-potion-poisoning.md` |
