# Rebirth Dungeon: Battle System

Combat uses **five six-sided dice** and Dicero-style decisions: roll, keep useful dice, reroll the others, and commit a hand whose pips and combination determine the action's strength. Rebirth Dungeon adds an explicit **skill choice before the roll**. The selected skill's rank supplies its base damage and may change the probabilities of rolling particular faces.

The starter battle and later extensions are planned Godot work; no combat is implemented in this scaffold. It complements [skills.md](skills.md), [character.md](character.md), [stats.md](stats.md), the [game plan](../game-plan.md), and the [project phases](../project-phases.md). Five dice, skill-dependent rolls, and rank-based base damage are requirements. Reroll limits, scoring values, formulas, and other defaults below are provisional; individual skill designs will refine them later.

The [Phase 4 starter contract](../phase4-combat.md) authors the initial skill values, recovery/exhaustion policy, encounter scope and integration boundary for these rules.

## 1. Dicero reference and evidence

Habby's official listing describes Dicero as a roguelite where dice unleash skills and players develop builds through skills and equipment. It does not publish a complete combat formula. [Official Google Play listing](https://play.google.com/store/apps/details?id=com.bailing.lark.roll.dev&hl=en).

Gameplay coverage and a community mechanics guide describe up to five active dice, selective rerolls, pip values, and poker-like combinations such as pairs, straights, and five of a kind. Dice and skill triggers make the decision more involved than simply keeping every high face. [Gameplay walkthrough, March 17, 2026](https://www.youtube.com/watch?v=pn13iUFfrdY), [Community dice mechanics guide](https://dicero.app/en/guides/dicero-dice-mechanics-guide).

Two details need explicit qualification:

- **Roll allowance:** the March walkthrough describes three rolls total, while a July review says three rerolls. Our proposed baseline is one initial roll plus two rerolls. This is a design choice, not a claim that all Dicero versions use the same allowance. [Walkthrough](https://www.youtube.com/watch?v=pn13iUFfrdY), [July review](https://nygamecritics.com/2026/07/23/the-insight-dicero-is-so-much-fun-except-for-one-thing/).
- **Damage values:** the July review reports the eight-category multiplier table used below. The community calculator exposes editable attack and combo inputs, including a different default baseline multiplier, and its guide says to check the current client. Treat the table as a starting balance reference, not a verified current formula. [Reported combo table](https://nygamecritics.com/2026/07/23/the-insight-dicero-is-so-much-fun-except-for-one-thing/), [Community calculator](https://dicero.app/en/calculator).

The Chinese-language official-support FAQ linked by the community guide provides further reference: its first part describes weapon-dependent builds and applying enemy defense before dice-pattern bonuses; its second clarifies that certain dice-attached combo effects require the die to participate in the matching pattern. These are regional reference details, not proof that every international version is identical. [Official-support FAQ 1](https://www.taptap.cn/moment/793123157429979198), [Official-support FAQ 2](https://www.taptap.cn/moment/793123347423561363).

We adopt the central **pip score + combination + keep/reroll** loop. We start with exactly five dice available immediately and add deliberate skill selection. Extra dice inventories, random in-run skill drafts, dice-attached effects, and Dicero's broader progression systems are outside this base specification.

## 2. Core battle rules

| Element      | Proposed rule                                                                        |
|--------------|--------------------------------------------------------------------------------------|
| Dice         | Exactly five dice, each showing a face from 1 through 6                              |
| Skill        | Select one learned, usable active skill before rolling                               |
| Skill cost   | Each activation consumes stamina, mana, HP, or an authored combination; see stats.md |
| Rank         | Use the skill rank captured in the active run's character snapshot                   |
| Initial roll | Roll all five dice once using that skill/rank's probability profile                  |
| Rerolls      | Up to two reroll actions; each rerolls any chosen nonempty subset                    |
| Kept dice    | Retain their current values; keeping does not improve them automatically             |
| Final hand   | Score all five final dice and classify one combination                               |
| Resolution   | Use the selected skill once, consuming the whole hand                                |
| Turn end     | Resolve effects and end the activation once, then continue initiative                |

A **pip** is a dot on a die; the **face value** is the number of pips showing. Dice remain six-sided when weighted: weighting changes the chance of each face, not the maximum face or the number of dice.

Five dice contribute to one skill action. They do not automatically mean five sword swings, five separate attacks, or five separately spendable ability resources. Multi-hit skills will need their own authored resolution rules.

## 3. Player turn

```text
Inspect enemies → Select skill and target → Roll five dice
    → Keep/reroll (up to two times) → Commit skill
    → Resolve effects → End activation → Next scheduled actor
```

### Select a skill

Show the equipped weapon, usable skills and ranks, required resources, target restrictions, base effect, and roll profile. A sword skill must validate its sword requirement before rolling. The default action should be an available basic skill, not an undocumented alternative damage system.

Before the initial roll, the player may change skill or target freely. On the first roll, lock the skill, rank, target, effective attack/defense inputs, costs, and probability profile for this activation. Calculate those inputs from the run's progression baseline, equipment, and active buffs/debuffs. Validate and reserve all required SP, MP, and HP at that point. This prevents rolling with a favorable skill's odds and then spending the hand on another skill.

Every activated skill has a positive resource cost, including basic attacks and buff skills. All required pools must be affordable together; HP payments must leave at least 1 HP and cannot use shields or damage mitigation. Show costs after modifiers, and reject insufficient resources before drawing dice. [Stat and skill-cost rules](stats.md#3-skill-costs).

Changing the panel, target, equipment, or skill selection cannot create a fresh roll after that lock. The first slice keeps targets fixed through resolution. A later retargeting exception must define its eligibility and must preserve the original dice and roll profile.

### Roll and reroll

Roll all five dice and display their values, pip total, current combination, and predicted effect. The player can accept the first result or mark dice to keep and reroll the rest.

One reroll action spends **one reroll**, whether it replaces one die or all five. It does not charge SP, MP, or HP again. The chosen subset is committed together; the player cannot inspect the first replacement before choosing the remaining dice in that same action. Each rerolled die uses the same locked profile and must accept its new result, even if it is lower or breaks a combination.

The player may change which dice are kept between rerolls. Keeping and unkeeping a die costs nothing and draws no randomness. Reject an empty reroll, a reroll before the first roll, or a reroll with no budget left without changing state.

After the second reroll, the player may inspect the final result and commit. Exhausting rerolls does not auto-attack. Reroll allowances reset at the next activation; unused rerolls do not carry over.

### Commit and end

Committing consumes the hand and deducts the reserved SP/MP/HP once before applying the skill, then finalizes the activation. Recovery from the skill cannot pay its own upfront cost. A second commit cannot apply the action or cost again. Even a weak hand remains usable for the initial damage skill; special minimum-hand requirements are deferred.

The player may pass instead. Passing before rolling consumes the turn without a skill cost. Passing after rolling discards the hand and spends the reserved cost, so cancelling is not a free attempt to obtain better dice. Passing grants no skill-use training.

Enemies do not act while the player inspects or rerolls. Only activation completion advances initiative, following the planned command-driven scheduler. There is no real-time deadline for a roll decision.

When consumables are enabled, using a potion is an alternative full action before rolling: consume the item, apply its recovery and/or buff/debuff effects, and end the activation. Potions cannot be used between a roll and its commit/pass. Equipment swaps remain outside the initial battle flow. [Consumable timing](stats.md#7-battle-timing-and-consumables).

## 4. Combinations and pip scoring

All five dice contribute to **pip total**, from 5 through 30. Independently classify the final hand using this provisional table, ordered strongest first:

| Combination     | Definition                                         | Example                    | Multiplier |
|-----------------|----------------------------------------------------|----------------------------|------------|
| Five of a kind  | All five faces match                               | `6,6,6,6,6`                | ×10        |
| Four of a kind  | Exactly four faces match                           | `5,5,5,5,2`                | ×5         |
| Full house      | Three matching faces and a different matching pair | `4,4,4,2,2`                | ×3.5       |
| Straight        | Five distinct consecutive faces                    | `1,2,3,4,5` or `2,3,4,5,6` | ×3         |
| Three of a kind | Exactly three match; the other two differ          | `3,3,3,2,6`                | ×2.5       |
| Two pairs       | Two distinct matching pairs and a fifth face       | `2,2,5,5,6`                | ×2         |
| One pair        | Exactly one pair; the other three faces differ     | `4,4,1,3,6`                | ×1.5       |
| No combination  | None of the above; baseline hand                   | `1,2,3,4,6`                | ×1         |

Multiplier values are adopted provisionally from the [July Dicero review](https://nygamecritics.com/2026/07/23/the-insight-dicero-is-so-much-fun-except-for-one-thing/). The classification details above are explicit Rebirth Dungeon rules. There is no four-die straight, wraparound straight, wildcard, or face above 6 in the initial model.

Apply exactly **one** combination multiplier, never a sum or product of overlapping categories. A full house does not also award a pair and three-of-a-kind bonus. Visual dice order does not affect scoring.

Pip total and pattern are separate sources of strength. High faces can improve the pip score but keeping a low pair might offer a better path to a stronger combination. Compare the predicted skill effect before deciding to reroll.

If later skills trigger from a matching die, distinguish **all five dice** from **the dice participating in the classified combination**. An unmatched die in a pair hand contributes its pips to the base score but would not satisfy a future “this die forms the pair” trigger. Do not implement those triggers until their individual rules are authored.

## 5. Skill ranks and damage

Each skill rank supplies its base effect and an optional probability profile. Rank can improve both reliable power and the distribution of outcomes; it does not need to change both at every step.

For a starter sword attack, use this proposed formula:

```text
B = selected skill's base damage at its current rank
A = skill's allowed effective attack contribution from stats.md (0 if none is authored)
P = sum of all five final face values
K = damage per pip for this skill/rank
M = the final hand's combination multiplier
D = target's effective Defense (physical) or Magic Defense (magical)
resistance = target's effective Protection (physical) or Magic Protection (magical)

attackBeforeDefense = B + A + K × P
comboDamage = floor(max(0, attackBeforeDefense - D) × M)
damageAfterResistance = floor(comboDamage × (1 - resistance))
shieldAbsorbed = min(currentShield, damageAfterResistance)
hpDamage = damageAfterResistance - shieldAbsorbed
```

Resistance is clamped to 0–1 in the first slice; vulnerabilities and penetration are later explicit rules. Clamp resulting HP at zero and reduce shield by the amount absorbed. A fully mitigated attack can deal zero damage; no hidden minimum damage or separate miss/critical roll is included initially.

Protection supplies this resistance term directly; do not apply it again as another mitigation layer. The skill selects the allowed attack scaling, with weapon contributions included once. Equipment, potions, enemy debuffs, and skill buffs can change those effective stats through the calculation order in [stats.md](stats.md#5-sources-and-calculation-order). Costs and current resource pools are separate from attack power: low stamina does not secretly reduce damage after a skill passes its affordability check.

This is **our proposed formula**, not a reconstruction of Dicero's internal calculation. It retains pip-dependent strength and a hand multiplier, with flat defense before the multiplier inspired by the official-support FAQ. Weapon/stat contribution is an explicit term so equipment is not counted twice. [Defense reference](https://www.taptap.cn/moment/793123157429979198).

Illustrative sword attack: `B = 10`, `A = 0`, `K = 2`, and a hand of `4,4,4,2,6` gives `P = 20` and three of a kind, `M = 2.5`. Against `D = 4`, zero resistance, and zero shield, it deals `floor((10 + 2 × 20 - 4) × 2.5) = 115` damage. If a later rank raises only B to 14, the same hand deals 125. These numbers demonstrate the calculation, not final sword balance.

Defensive, healing, or utility skills can reuse the five-dice workflow with their own effect formula. They must explicitly define whether pip totals, combinations, or particular faces affect shields, healing, duration, or another outcome. Do not assume that damage mitigation applies to those effects.

## 6. Skill-dependent roll probabilities

The default profile is a fair die: each face has probability `1/6`. A skill rank may instead supply six nonnegative integer weights:

```text
P(face = i) = weight[i] / sum(weight[1..6])
```

At least one weight must be positive. A zero weight makes a face impossible and must be intentional and visible. Sample each of the five dice independently from the locked profile, in stable die order. The same profile applies to the initial roll and every reroll unless a future skill explicitly introduces a different rule.

Example profiles, not assigned to any final skill rank:

| Face      | Fair weight | High-pip-biased weight |
|-----------|-------------|------------------------|
| 1         | 10          | 5                      |
| 2         | 10          | 7                      |
| 3         | 10          | 9                      |
| 4         | 10          | 11                     |
| 5         | 10          | 13                     |
| 6         | 10          | 15                     |
| **Total** | **60**      | **60**                 |

The biased profile raises the chance of a 6 from about **16.67% to 25%**, and the chance of 5 or 6 from about **33.33% to 46.67%**. Expected pips per die increase from **3.5 to about 4.08** before keep/reroll decisions.

Higher expected pips do not guarantee a stronger hand. Weighting changes combination probabilities too: favoring high faces may help high matching sets while hurting straights. Balance the whole final-damage distribution under realistic reroll choices, including rare ×10 outcomes. Do not assume the displayed increase in average pips is the complete damage increase.

Rank-based base damage, pip scaling, and odds must be independently configurable. A skill may start fair and gain a high-face bias at later ranks, or improve base damage while retaining fair dice. Merely using a sword does not alter odds unless the selected skill or an explicitly supported modifier says so. No hidden pity, guaranteed improvement, or high-roll protection is assumed.

## 7. Enemies, effects, and progression

The first encounter has one hero, one enemy, one damage skill, and one defensive skill. Show enemy HP, defenses relevant to the preview, and the next intended action when known. Battle targeting uses living encounter membership and allegiance; it has no spatial range or line-of-sight rules.

Enemy turns use deterministic authored decisions and the same damage/shield resolver. They do not need a player-style five-dice interface in the first slice. Multi-enemy targeting, area damage, counters, and more complex enemy dice mechanics are later content decisions.

Resolve the committed skill's effects in authored order, remove defeated actors before scheduling the next actor, and finish the player's activation exactly once even when the final enemy dies. If activation-end statuses also cause defeat, complete that resolution before deciding the encounter outcome; proposed priority is player defeat when the player is dead, otherwise victory when no hostiles remain. No damage, status ticks, or extra turns occur because a dice animation finishes.

Successful outcomes may award the selected skill's authored training. A reroll or a matching hand alone is not a skill use. Apply training only from the committed effect events and their specified objectives. AP is spent between runs on skill ranks, never as the default cost of rolling or attacking. [Skill progression contract](skills.md).

Current skill ranks, progression stats, talents, and starting equipment come from the active run's snapshot. Live buffs and debuffs modify effective stats on top of that baseline. Leveling, aging, and town rank-ups cannot silently replace it during an activation. [Character progression contract](character.md), [Stat sources](stats.md#5-sources-and-calculation-order).

A newly applied buff or debuff affects subsequent actions, not the frozen damage inputs or dice of the action applying it. Status durations use the affected actor's completed activations; self-buffs do not expire immediately on their casting turn. At an eligible activation end, resolve periodic effects, expire statuses, recompute stats and clamp pools, then regenerate resources for living actors. Rolls and rerolls do not advance any of these steps. [Status timing and stacking](stats.md#6-buffs-debuffs-and-item-effects).

## 8. Fit with the existing game plan

The [Godot game plan](../game-plan.md#combat-and-rule-transactions) implements this contract through typed battle state and synchronous GDScript rules. A separate battle scene submits commands and renders observations. All five dice belong to one selected skill; there is no per-die ability assignment.

| Command or intent      | Battle-mode contract                                                                       |
|------------------------|--------------------------------------------------------------------------------------------|
| Select skill/target    | Allowed before the first roll; validates ownership and prerequisites                       |
| `ROLL_DICE`            | Lock skill/rank/target/stats/profile, reserve SP/MP/HP costs, and commit five results once |
| Set kept dice          | Change the kept flags without consuming RNG or a turn                                      |
| Reroll selected dice   | Replace a chosen nonempty subset atomically and spend one reroll action                    |
| `USE_ABILITY`          | Consume the whole hand and reserved cost; resolve the locked skill and end activation      |
| `END_TURN`             | Pass under the rules in section 3; never finalize an already-ended activation again        |
| Use item, when enabled | Before rolling, resolve one consumable as a full action and end activation                 |

Use a batch `REROLL_DICE` request with explicit stable die indices. Scene signals carry intents to the session controller; they never resolve damage or generate dice themselves. These commands remain planned, not implemented.

Persist the activation phase, stable die IDs and faces, kept flags, reroll budget, selected skill/rank/target, locked stat inputs and profile, current resource pools and reservations, active status sources/durations, and gameplay RNG state. Save after each accepted roll/reroll, kept-state change and committed resolution. Loading resumes the same hand, costs, effects, and budget; reopening a panel or retrying a command never rerolls, refills resources, refreshes status durations, or applies damage twice.

Use integer weights and exact rational/fixed-point combo arithmetic with the rounding points above. Previews evaluate already-rolled dice without consuming gameplay RNG. Invalid commands leave dice, resources, training, initiative, and RNG unchanged. Pin rules and content versions so replays use the same probabilities and scoring definitions.

## 9. Battle interface and future skill details

Keep the selected skill and rank visible above five persistent die slots. Show which dice are kept, remaining rerolls, pip total, combination, multiplier, target, and predicted effect. Before rolling, expose face probabilities when a skill uses weighted dice. After rolling, show the breakdown from base power through pips, combination, and defenses.

Also show current/max HP, MP, and SP, reserved amounts, final skill costs, and buff/debuff icons with remaining affected-actor activations. Explain which pool blocks an unaffordable skill and expose the stat sources behind the damage preview.

Use separate **Roll**, **Reroll**, and **Use Skill** actions with clear availability. Label the reroll budget unambiguously as **2 rerolls remaining** after the initial roll. Include a compact combination reference so players can judge whether preserving a pair is worth more than chasing higher pips.

When defining an individual skill, add:

- Weapon, learned-rank, targeting, SP/MP/HP cost vectors, and cooldown requirements.
- Base damage or base effect and pip scaling at each rank.
- Face weights at each rank, including whether initial rolls and rerolls differ.
- How combinations modify the effect, and any exact face or participating-die conditions.
- Single-target, area, multi-hit, duration, resistance, and status behavior.
- Training objectives and the precise outcomes that count.

Until those designs exist, do not invent full sword, magic, healing, or defensive rank tables. Keep the fixed five-dice framework, provisional scoring, and skill-specific extension points as the foundation.

## 10. Initial validation and open balance work

Before shipping combat, verify all eight combinations over every possible five-die hand; one initial roll and two batch rerolls; held dice retaining their values; skill/stat/profile locking; damage and rounding examples; and save/resume without extra RNG draws, AP, damage, or turns. Also verify mixed-pool costs and nonlethal HP payments, stat modifiers in previews and damage, buff/debuff expiration, and no repeated cost or regeneration on rerolls. Probability checks should verify profile normalization and compare fair versus weighted outcomes across more than just average pips.

The first playable slice should prove one sword skill at two illustrative ranks, a fair profile and a biased profile, keep/reroll decisions, enemy response, and a resumable activation. Add the defensive skill once its formula and shield duration are authored. These are implementation checks to perform later, not a claim that battle code exists today.

Still open: final reroll allowance, combination multipliers, damage scaling, defense balance, skill costs and cooldowns, defensive/utility scoring, and individual rank probability tables. Rare hands must remain exciting without making ordinary hands ineffective. Exactly five dice and selecting the skill before its roll remain the foundation.

## Godot battle integration

**Godot reset: 2026-09-10. Status: planned; not implemented.** Implement `BattleState` and command/effect rules as typed GDScript data/helpers, with a separate battle scene rendering copied observations. `SkillDefinition` and actor/stat Resources are read-only catalog entries. Save locked hands and RNG through the application controller; no Node transform or animation callback determines targeting, damage or initiative. Initial rules arrive in Phase 4, UI in Phase 5 and disk continuation in Phase 6.

See [Godot architecture](../game-plan.md), [project layout](../directory.md) and [official engine sources](../references.md#godot-engine-sources).

## Research notes

Sources were retrieved through Firecrawl and inspected on **September 5, 2026**. Official store material establishes the game premise; official-support regional FAQs clarify selected rules; gameplay coverage and community references supply the detailed hand/reroll observations. No current game client was directly tested. Local caches are gitignored research artifacts.

| Reference                                                                                                                   | Local cache                            |
|-----------------------------------------------------------------------------------------------------------------------------|----------------------------------------|
| [Habby Google Play listing](https://play.google.com/store/apps/details?id=com.bailing.lark.roll.dev&hl=en)                  | `.firecrawl/dicero-google-play.md`     |
| [March gameplay walkthrough](https://www.youtube.com/watch?v=pn13iUFfrdY)                                                   | `.firecrawl/search-dicero-combat.json` |
| [July review and combo table](https://nygamecritics.com/2026/07/23/the-insight-dicero-is-so-much-fun-except-for-one-thing/) | `.firecrawl/search-dicero-combat.json` |
| [Community dice mechanics guide](https://dicero.app/en/guides/dicero-dice-mechanics-guide)                                  | `.firecrawl/search-dicero-combat.json` |
| [Community damage calculator](https://dicero.app/en/calculator)                                                             | `.firecrawl/dicero-calculator.md`      |
| [Official-support FAQ 1](https://www.taptap.cn/moment/793123157429979198)                                                   | `.firecrawl/dicero-official-faq.md`    |
| [Official-support FAQ 2](https://www.taptap.cn/moment/793123347423561363)                                                   | `.firecrawl/dicero-official-faq-2.md`  |
