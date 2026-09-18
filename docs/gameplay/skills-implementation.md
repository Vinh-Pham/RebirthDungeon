# Implemented skill system — content version 2

This is the accepted implementation contract for the Phaser 4 / React game. It supersedes provisional numbers, prototype limits, Godot notes, and unresolved progression policy in `skills.md`, `battle.md`, and `stats.md`. Other systems described in those documents are not implicitly implemented.

## Progression and learning

Skills and AP belong to each character. New characters know only Normal Attack. Aren, the Combat instructor beside the Blacksmith, teaches talent attacks and equipment masteries for free when the matching equipment is worn. Existing save skills migrate to F without loss. Normal Attack is unranked; all fourteen other skills support F, E, D, C, B, A, 9, 8, 7, 6, 5, 4, 3, 2, 1. Charge remains unavailable.

Learning starts at F with zero training. Advancement is manual, requires 100 training points and `2 + rankIndex` AP (F index 0), and resets training without carrying surplus. The last rank has no advancement. Existing starting AP, level-up and aging AP remain unchanged. Rebirth preserves skills, training, pages, and AP; it does not automatically teach the new talent's attack.

Lessons, reading, page insertion, advancement, and equipment changes require town with no active run. Run entry snapshots progression stats, ranks, and equipment. Training, XP/AP, and claimed loot persist immediately and survive victory, defeat, and abandonment. Profile growth does not alter an active run's baseline. Raising maxima never refills current resources.

Critical Hit is learned by explicitly reading its 60-gold General Shop manual. Final Hit uses an incomplete 30-gold manual and five distinct pages, inserted in any order, then the completed book must be read. Page insertion and learning consume one item only on success. Duplicate or invalid requests do not consume items. Each of a run's first five encounter victories offers the lowest missing page not owned in inventory/bank or already inserted; page rewards are claimed like other loot. General Shop also sells every page for 30 gold. Full inventories can leave loot unclaimed without corrupting progression.

## Versioned balance content

`src/domain/skillCatalog.ts` owns explicit generated rank records, cost vectors, dice weights, training objectives and AP costs. The following use `r = 0…14`.

| Active | Base B | Per pip K | Cost | Cooldown |
| --- | --- | --- | --- | --- |
| Normal Attack | 0 | 0.2 | 2 SP | 0 |
| Smash | 4 + 2r | 0.4 | 6 SP | 0 |
| Power Shot | 4 + 2r | 0.4 | 6 SP | 0 |
| Double Shot, per hit | 1 + r | 0.15 | 6 SP total | 0 |
| Icebolt | 3 + 2r | 0.35 | 6 MP | 0 |
| Counterattack | 2 + 2r | 0.3 | 5 SP | 0 |
| Windmill | 2 + r | 0.25 | 8 SP | 1 |
| Final Hit | 2 + r | 0.1 | 8 SP | 4 |

Final Hit grants `floor((B + K × pips) × combination)` melee attack for `2 + floor(r/5)` subsequent owner activations. It deals no immediate damage. Double Shot uses half the gun attack contribution per hit, one hand/cost, and one critical check for its target. Normal Attack uses the equipped weapon's category, with unarmed melee as fallback.

All dice are fair except Smash at ranks 9–1, which uses `[5,7,9,11,13,15]` weights. Probabilities are visible. Ranking a mastery never alters dice odds.

| Passive | Effect |
| --- | --- |
| Combat Mastery | +5+2r Max HP; +1+r melee attack |
| Sword / Dual Wield Mastery | Each contributes +1+r eligible attack once |
| Critical Hit | Enables 10% critical chance; +25+5r percent critical damage |
| Shield Mastery | +1+r physical/magical Defense and protection percentage points |
| Light Armor Mastery | +1+r defenses; +1+floor(r/2) protection points |
| Heavy Armor Mastery | +2+2r defenses; +1+r protection points; reduces its armor's DEX penalty by min(20,2r) points |

Training objectives are capped counts, not uncapped progress events. Direct attacks and offensive masteries: damaging action 2×40 and defeat 5×10. Counterattack: preparation 2×20 and successful reaction 5×20. Final Hit: activation 2×20 and buffed damaging melee action 3×30. Critical Hit: critical action 5×20 and critical defeat 10×5. Defensive masteries: incoming attack 1×100 and eligible encounter survived 5×10. General action credit is once per action, defeat credit once per distinct defeated target. Fully mitigated incoming hits train defense; counter-negated hits do not.

## Combat and equipment

A first roll freezes skill/rank, targets, attack/mitigation, costs, and dice profile. Costs are reserved, then paid once at commitment or paid passing. Passing before rolling has no cost. Two nonempty batch rerolls are allowed; no automatic commitment. Potions and Recover are alternative pre-roll full actions. Enemy activations cannot interleave a rolled hand.

Combination multipliers: five of a kind 10; four 5; full house 3.5; straight 3; triple 2.5; two pairs 2; pair 1.5; otherwise 1. No four-die straight. Only one combination applies.

`comboDamage = floor(max(0, B + A + K × pips − Defense) × combination)`; a critical multiplies that floored amount by its bonus, then Protection applies, then shield absorption, then HP. Zero damage is allowed. Use Magic Defense/Protection for magical attacks. No inferred Luck/Will critical chances.

Weapon attack enters A once with STR/10 melee, DEX/10 bow, INT/10 magic, or (STR+INT)/20 guns. An off-hand sword contributes half its weapon power, not half the entire derived attack. Broken weapons retain the existing half-power penalty. Only distinct paired swords activate Dual Wield Mastery. All races may use this supported pair. Dual guns occupy both hands without activating the mastery. Existing non-skill race restrictions remain.

Blacksmith sells a shield (40g, +2 physical/magic Defense), light armor (60g, +3/+1), and heavy armor (100g, +5/+2, 20% DEX penalty). Existing tunic/coat are clothing. Light and heavy armor cannot activate together; either can combine with a shield.

Counterattack prepares one stored retaliation, negates the first eligible single-hit melee attack, and expires when the player's next activation starts. It cannot counter or critically hit another reaction. Final Hit cannot stack or be recast while active. Its casting activation does not reduce duration. Cooldowns start on successful use, skip the casting activation, and tick after subsequent owner activations, including passes. Windmill targets all living hostiles in stable ID order. One critical RNG check per eligible target occurs at commitment. Crits, results and RNG continuation are saved atomically.

The existing player-then-surviving-enemies order remains; no new initiative scheduler. Counterattack clears at encounter end. Final Hit/cooldowns freeze during exploration and resume next encounter; all temporary effects clear at run end.

## UI and storage

HeroUI's journal shows all discoverable skills, routes, ranks, objectives, AP, next effects, collection slots, passive eligibility and disabled Charge. Town NPC lessons and inventory reading/page insertion use the same transaction pipeline. Phaser owns combat controls and previews; previews use the authoritative resolver without advancing RNG.

Save schema 2 migrates schema 1, preserving dice, holds, rerolls, enemy HP, position, inventory, resources and AP. Existing learned skills become F. Pending actions are reconstructed under revised rules without rerolling or charging. A one-time notice explains this change. The original legacy snapshot is retained under `legacy-v1` on the next durable write. Invalid current saves fall back to a validated previous save; migration failure does not overwrite a valid fallback. Versioned run/action snapshots contain only serializable data.

XState owns phase orchestration and save-before-publish. Immer owns progression and combat mutations. Commands, persistent phase changes, item identities, rank gates and the existing operation ledger prevent duplicate outcomes on retry. No training is driven by presentation callbacks.

## References and validation

Firecrawl copies: [skill training](../references/mabinogi-skills.md) and [Critical Hit](../references/mabinogi-critical-hit.md), retrieved September 18, 2026 UTC. HeroUI MCP supplied Button and ProgressBar documentation. These sources inform the adaptation; the numeric balance above is authored for Rebirth Dungeon.

Vitest covers rank reachability, acquisition, equipment, action snapshots, cost payment, advanced skill timing, critical ordering, migration and save failure. Playwright covers trainer learning/reload, journal, book reading, page assembly, equipment, AP advancement, and the existing complete dungeon journey. See [verification](../verification.md) for current results and host limitations.
