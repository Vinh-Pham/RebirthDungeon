# Rebirth Dungeon: Skills

Skills are learned abilities that grow through practice and investment. Players discover them through NPCs, read skill books, or collect missing pages to assemble a skill book. Once learned, a skill must reach **at least 100 training points at its current rank**, and the player must spend the required **AP (Ability Points)** to advance it.

This is a design specification for planned gameplay, modeled after **Mabinogi, the Korean MMORPG**. It complements the [game plan](../game-plan.md) and [project phases](../project-phases.md); it does not claim that skills are implemented. The three acquisition routes and the training-plus-AP gate are required. Additional rules below are proposed defaults for Rebirth Dungeon, with unresolved economy and persistence choices listed at the end.

## 1. Mabinogi reference

Mabinogi separates learning a skill, training its current rank, and spending AP to advance. Its skill overview describes active and passive skills, rank-specific training requirements, and a minimum of 100 skill experience points before advancement. Ranks run from Novice through F–A, then 9–1, with Dan ranks available for some skills. [Mabinogi skills overview](https://wiki.mabinogiworld.com/view/Category:Skills).

The acquisition routes have concrete examples:

| Route           | Mabinogi example                                                                                  | Rebirth Dungeon adaptation                                                           |
|-----------------|---------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| NPC instruction | Icebolt can be learned through Lassar's sorcery lessons.                                          | An NPC teaches a skill after dialogue, a lesson, or a quest.                         |
| Skill book      | Icebolt can also be learned by reading *Icebolt Spell: Origin and Training*.                      | A complete book grants its associated skill when read.                               |
| Collected pages | Fireball's collection quest asks the player to assemble ten pages and return the book to Stewart. | Collect a skill's required pages, complete its book, and read it to learn the skill. |

Sources: [Icebolt acquisition](https://wiki.mabinogiworld.com/view/Icebolt#Obtaining_the_Skill), [Fireball acquisition](https://wiki.mabinogiworld.com/view/Fireball#Obtaining_the_Skill). Fireball also has another acquisition route; the page quest is an example, not its only unlock method. Its completed collection book is handed in rather than read. Reading the assembled book is our adaptation.

Mabinogi awards AP through sources including leveling, aging, and quests. These are reference options for our economy, not fixed reward values. [Ability Points](https://wiki.mabinogiworld.com/view/Stats#Ability_Points).

Mabinogi also offers AP training and other training shortcuts. Rebirth Dungeon's initial design keeps AP spending for advancement: AP cannot buy training points or bypass the 100-point requirement. Dan advancement, training multipliers, automatic advancement, and skill resets are outside the initial scope. [Mabinogi training mechanics](https://wiki.mabinogiworld.com/view/Category:Skills#AP_Training).

## 2. Player progression loop

1. **Discover:** Find an NPC, book, or page that reveals a skill and how to obtain it.
2. **Learn:** Complete an acquisition route to unlock the skill at Rank F with 0 training points.
3. **Practice:** Fulfill the current rank's training objectives through gameplay.
4. **Prepare:** Reach at least 100 training points and obtain enough AP for the next rank.
5. **Advance:** Choose Rank Up, spend AP, and gain the next rank's effects.
6. **Repeat:** Begin the new rank's training objectives at 0 points.

Learning and ranking up are separate actions. The initial unlock at F does not spend AP or count as a rank-up. This skips Mabinogi's Novice stage. Every later rank-up requires both training and AP; owning a book or completing a quest cannot directly award a higher rank.

## 3. Acquiring skills

Each skill defines one or more supported acquisition routes. Completing any one valid route learns the skill; a player does not need to complete every route. Routes can have prerequisites such as another learned skill, a quest milestone, or access to an area. Reveal unmet prerequisites before the player spends an item or lesson fee.

### NPC instruction

An instructor offers a lesson or quest tied to a named skill. Early instructors should teach core dungeon actions, while specialist NPCs can introduce advanced techniques. Completing the lesson grants the skill once. Repeating dialogue cannot duplicate the unlock, grant AP, or reset training.

Proposed example: a town guard teaches **Guard** after a short defensive tutorial. The lesson unlocks Rank F; blocking attacks in later encounters trains it.

### Complete skill books

Books are inventory items associated with a skill. They may come from NPC shops, quest rewards, dungeon loot, or treasure rooms. Merely acquiring a book does not teach the skill: the player selects **Read** after meeting its prerequisites.

The proposed default consumes one book on successful learning. A failed attempt or an already-known skill consumes nothing. Reading another copy never adds ranks, training points, or AP.

Proposed example: reading **Ember Bolt: A Beginner's Primer** unlocks **Ember Bolt** at Rank F.

### Page collection and book assembly

An incomplete skill book records a set of distinct required page IDs. Pages can be collected before the book is obtained, but insertion requires the matching incomplete book. Each skill defines its own page count and acquisition sources; ten pages is a Mabinogi example, not a universal requirement.

1. Obtain the incomplete book from an NPC, quest, or loot source.
2. Find its missing pages through authored dungeon encounters, rewards, or exploration.
3. Insert a matching page, consuming one copy and recording that page as filled.
4. When every required page is present, convert the incomplete book into its complete version.
5. Read the completed book through the normal learning flow.

For Rebirth Dungeon, pages may be inserted in any order and do not expire. A duplicate or wrong-book page is rejected without consumption or loss of existing progress. This deliberately simplifies Fireball's ordered page insertion. Completed books cannot be completed or claimed twice.

The collection screen shows filled slots, missing page names, and discovered source hints. Rare pages should have identifiable places to search; exact drop rates and any guaranteed acquisition route need balancing.

Proposed example: collect five distinct pages of **The Fractured Flame**, assemble the book, then read it to learn **Flame Burst**. These names and the five-page count are illustrative Rebirth Dungeon content.

## 4. Skill types and ranks

Skills can be **active** actions or **passive** effects. Suggested categories are Combat, Magic, Survival, and Crafting. Categories organize discovery and the skill journal; they do not impose class locks. Begin with combat and magic skills that support the dungeon loop; introduce survival and crafting skills with their corresponding gameplay systems.

The proposed rank order is:

```text
F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1
```

Rank 1 is the initial design's maximum. It has no next-rank AP cost or Rank Up action. Master titles and Dan ranks require a separate future design.

Each rank explicitly defines its effects, training objectives, and AP cost to advance to the next rank. Improvements may include damage, shield strength, duration, reliability, or a new tactical effect. Any permanent stat bonus must be authored explicitly and derived from the current rank, so loading a save cannot grant it again.

## 5. Training points

Training points belong to **one skill at one rank**. They are separate from character XP and AP. Spending time with another skill does not train this one.

Each training objective defines a qualifying action or outcome, points per completion, and a maximum counted number of completions. Objectives may change at each rank. Examples include successfully using an attack, absorbing damage with a defensive skill, or defeating an eligible enemy with a particular spell. Passive skills train from relevant outcomes rather than a nonexistent activation button.

For a rank, total training is:

```text
trainingPoints = sum(min(completedCount, maximumCount) × pointsPerCompletion)
```

The player may rank up at **100 points or more**; completing every objective is not necessary. Extra points do not reduce the AP cost or carry into the next rank. Progress remains available while the player gathers AP. Each supported rank below the maximum must offer a reachable set of objectives totaling at least 100 points.

Illustrative Rank F training for Guard:

| Objective                                          | Points per completion | Maximum completions | Available points |
|----------------------------------------------------|-----------------------|---------------------|------------------|
| Use Guard successfully in an eligible encounter    | 2                     | 20                  | 40               |
| Absorb enemy damage with Guard                     | 5                     | 10                  | 50               |
| Finish an encounter in which Guard absorbed damage | 10                    | 3                   | 30               |
| **Total available**                                |                       |                     | **120**          |

Completing the first two rows and one encounter objective earns `40 + 50 + 10 = 100` points and meets the training gate.

Only resolved gameplay outcomes award training. Cancelled or rejected commands, opening the skill panel, toggling kept dice, and replaying animations do not count. One outcome may satisfy multiple distinct objectives, but contributes to each objective only once. For the Guard example, count successful uses per resolved use, damage absorption per enemy attack that loses damage to Guard, and encounter completion once per eligible encounter. Content must define equivalent counting rules for every objective, including multi-target attacks and ongoing effects.

## 6. AP and advancement

AP is a spendable progression resource. Training proves practice; AP determines which trained skills the player invests in. The proposed default gives each hero an AP pool shared across that hero's skills. Ownership across heroes remains an explicit decision before implementation.

Level-ups and authored quest or milestone rewards are proposed AP sources. Their amounts and repeatability remain balance work. Ordinary skill use awards training, not AP, unless it separately completes an authored AP reward.

A rank-up succeeds only when all of these conditions hold:

- The hero knows the skill, and the current rank has a next rank.
- Current-rank training is at least 100 points.
- Available AP covers the authored advancement cost.
- Any explicitly authored advancement prerequisites are satisfied.
- The player is at an allowed progression boundary; the proposed default is between runs.

On success, deduct the AP cost once, advance exactly one rank, apply the new rank's definition, and reset training counts to zero. On failure, change nothing. Reaching 100 points makes the skill eligible; it does not automatically spend AP.

For example, suppose Guard F → E costs **3 AP** (illustrative):

| Training | Available AP | Result                                             |
|----------|--------------|----------------------------------------------------|
| 99       | 10           | Blocked: more training required                    |
| 100      | 2            | Blocked: 1 more AP required                        |
| 100      | 3            | Advance to E; 0 AP remains; E training starts at 0 |
| 120      | 5            | Advance to E; 2 AP remains; E training starts at 0 |

AP costs are authored per transition, not inferred from the rank label. Costs and reward pacing should make investment choices meaningful while letting players advance an early skill without excessive repetition.

## 7. Dice combat and persistence

A **skill** is the learned progression record; an **ability** is a usable action in the existing dice combat system. An active skill unlocks or modifies an ability through stable content IDs. A passive skill modifies specified rules without requiring an ability button.

Using an active combat skill follows [battle.md](battle.md)'s five-dice workflow: select the skill before rolling, lock its rank/target/stats, reserve its resource cost, and commit the whole hand through `USE_ABILITY`. That battle design refines the game plan's earlier per-die allocation model. AP pays for permanent advancement, not individual combat uses. Learning or ranking a skill does not grant extra turns or bypass dice requirements.

The proposed default allows NPC lessons, reading, assembly, and rank-ups between runs. A new run receives the hero's validated skill ranks and loadout. An active run uses that snapshot; menu or profile changes cannot silently alter its abilities. Training earned during a run is recorded as pending progression until the run's defined outcome is committed.

Already committed skills, ranks, AP, training, and inserted pages are persistent progression. What happens to newly earned training, AP, books, and pages on victory, defeat, or abandonment must follow the Phase 8 carry-over decision. This document does not silently settle that open rule. [character.md §6](character.md#6-rebirth-connects-the-systems) proposes the working rebirth behavior — reset current level/XP and life growth while preserving learned ranks, training, unspent AP, and mastery — but its eligibility, cost, and cooldown remain open decisions, and nothing here assumes rebirth exists.

Future content definitions need stable skill/rank/objective IDs, acquisition prerequisites, book/page mappings, effects, training rules, and AP costs. Saved progression needs the owning hero, learned ranks, objective counts, AP balance, inventory, and inserted page IDs. Keep this within the existing versioned content catalogs and combined profile/run save bundle.

Book consumption and learning, page insertion, book completion, and AP spending with advancement must each be saved as one complete transition. Retrying a command or restoring a save must not duplicate progress, consume an item twice, or charge AP twice. Training comes from authoritative simulation outcomes, not presentation callbacks.

## 8. Combat skill catalog

The following twelve skills take their identities from Mabinogi. Each **Reference** paragraph describes the linked wiki page; **Proposed adaptation** and **Progression** describe Rebirth Dungeon design choices. These are planned skills, not implemented abilities or final rank tables. Read their effects alongside [battle.md](battle.md) and [stats.md](stats.md).

### Active and passive distinction

| Skill               | Type                         | Player interaction and role                                                           |
|---------------------|------------------------------|---------------------------------------------------------------------------------------|
| Smash               | Active attack                | Select and roll for a powerful single-target melee strike                             |
| Counterattack       | Active stance                | Select and roll to prepare one automatic retaliation against an eligible attack       |
| Final Hit           | Active buff                  | Select and roll to enter a temporary melee damage state                               |
| Windmill            | Active area attack           | Select and roll to strike eligible hostile encounter members                              |
| Charge              | Deferred redesign            | Unavailable until a non-spatial battle adaptation is authored                         |
| Combat Mastery      | Passive                      | Learned rank supplies general survivability and melee attack benefits                 |
| Critical Hit        | Passive, triggered           | Increases damage when an eligible attack scores a critical; no separate attack button |
| Sword Mastery       | Passive, equipment-dependent | Improves attacks made with a sword                                                    |
| Shield Mastery      | Passive, equipment-dependent | Improves defenses while a shield is equipped                                          |
| Heavy Armor Mastery | Passive, equipment-dependent | Improves heavy-armor defenses and reduces its authored DEX penalty                    |
| Light Armor Mastery | Passive, equipment-dependent | Improves defenses while light armor is equipped                                       |
| Dual Wield Mastery  | Passive, equipment-dependent | Improves melee offense while wielding a legal pair of weapons                         |

**Active skills** occupy the combat action selector, require a positive authored SP cost for this catalog, and use one five-dice activation. Counterattack's reaction and Final Hit's ongoing bonus are consequences of a paid active use; they do not make those skills passive. Passing after rolling still spends the reserved cost without creating the attack, stance, or buff.

**Passive skills** have no Use button, independent dice roll, per-trigger resource payment, or extra turn. They apply automatically when learned and eligible, while still requiring training and AP to rank up. Equipment passives remain learned while unequipped; their conditional effects become inactive. Critical Hit still needs a qualifying critical event. A passive may coexist with an active skill and train from the same outcome through separate objective IDs.

Each supported skill begins at Rank F when learned under section 3; deferred Charge has no active acquisition route until redesigned. Proposed acquisition routes below use instructors, books, or assembled books; equipping an item can reveal a lesson but does not automatically grant mastery in this adaptation. Mabinogi's race restrictions are reference context, not adopted class/race locks. Equipment legality remains required for every hero.

### Shared combat rules for this catalog

- Smash and Windmill use the physical damage resolver in battle.md, with their own rank-specific base damage `B`, pip coefficient `K`, allowed attack contribution `A`, and face weights. All five pips and the single classified combination multiplier participate. Fair dice are the default until a different rank profile is authored.
- Counterattack prepares attack inputs from its hand; Final Hit turns its hand into a buff magnitude. Their details below define how those effects differ from immediate damage. Ranking a mastery never silently changes face weights, combination scoring, or reroll allowance.
- Equipment requirements, costs, cooldown availability, target sets are validated before the first roll. Freeze them with the action. Enemies and equipment swaps cannot interleave the roll and commit.
- Rank-defined cooldowns use completed activations of the skill owner, including passes. Exploration movement/interactions do not advance cooldowns. A cooldown begins on successful skill commitment, skips that casting activation's end, then decrements at each subsequent owner activation end. A value of 1 blocks the next activation and becomes available on the following one. A zero value means no cooldown. Rerolls and menus never tick it; passing without using the skill does not start a new cooldown.
- Passive modifiers enter stats.md's existing source calculation once. Separate permanent rank stat grants from conditional equipment/attack bonuses. A modifier to STR can affect derived attack; do not also add that STR gain as direct attack damage. Resource-max increases never heal or refill a pool.
- Counters, critical rolls and multi-target attacks extend features explicitly deferred by battle.md. Their proposed contracts below must be reconciled with battle.md, stats.md, and the implementation tracker when enabled. The first single-target slice stays usable without those extensions.

### 8.1. Smash — active melee attack

**Reference:** Mabinogi's Smash delivers a strong blow, knocks the target back, and bypasses the **Defense skill**. Higher ranks introduce splash damage, and equipment affects additional behavior. Counterattack can repel Smash. Bypassing the Defense skill is distinct from ignoring a target's numerical Defense stat. [Smash](https://wiki.mabinogiworld.com/view/Smash#Details).

**Proposed adaptation:** Require a compatible melee weapon and one living hostile in the current encounter. Resolve one physical hit using Smash's `B`, `A`, `K`, pips, and combination. Give it a stronger authored base than the starter attack, balanced by its SP cost and any cooldown. It is tagged as eligible for Counterattack. Apply ordinary Defense, Protection, and shield absorption; no penetration is implied by the name or source description. Knockback, splash, weapon-specific bleed/daze, and breaking an active Guard effect are later extensions with separate rules.

**Progression:** An instructor teaches Smash after an introductory melee lesson; a complete book can be an alternative unlock. Rank improves base damage and optionally pip scaling or cost efficiency. Training objectives can count a committed hit and a defeat caused by Smash, once per relevant outcome. A blocked/countered attack is not a damaging hit; an explicit use objective may still count its committed use.

### 8.2. Counterattack — active reactive stance

**Reference:** The player prepares Counterattack to repel supported physical attacks and retaliate. Mabinogi combines portions of the user's and attacker's normal damage, with stamina required to prepare and sustain the stance. It counters attacks including Smash and Charge, but not Windmill, ranged attacks, or magic. [Counterattack](https://wiki.mabinogiworld.com/view/Counterattack#Details).

**Proposed adaptation:** Require a compatible melee weapon. Target self, pay SP once, and commit a hand to prepare `B + A + K × P` and its combination multiplier `M`. The stance has one charge and expires at the **start of the owner's next activation**, or on defeat or encounter end. This is an explicit reaction-window exception to ordinary activation-end status duration; waiting through menus does not extend gameplay time.

Before the first encounter hostile's eligible single-target melee hit resolves, consume the stance, negate that hit and its on-hit effects, and resolve one physical retaliation. Use the stored attack power and `M`, with the attacker's current defenses/shield captured at this reaction boundary. This target was unknown when the stance was prepared. The initial adaptation uses the defender's stored power only, without Mabinogi's attacker-damage contribution or continuing stamina drain. Noneligible attacks resolve normally and do not consume the stance.

The reaction uses no new dice, SP payment, or initiative entry. It cannot trigger another Counterattack or Critical Hit. Resolve it within the attacking action's transaction; if it kills the attacker, finalize that actor's activation once and then evaluate defeat/victory normally. Reactions and multi-hit interruption need explicit event ordering before this skill ships; initially only single-hit melee attacks can trigger it.

**Progression:** An instructor teaches the stance through a defensive lesson. Rank improves prepared retaliation power or resource efficiency, not the number of automatic reactions unless later authored. Training can count preparing the stance and successfully countering, with limited preparation credit and enough reachable counter objectives to reach 100 points. An unused stance does not satisfy a successful-counter objective.

### 8.3. Final Hit — active temporary buff

**Reference:** Mabinogi's Human-only Final Hit creates a timed attack state with increased damage, faster attacks, teleporting normal attacks, and weapon-dependent knockdown behavior. It drains stamina while active and restricts other skills. It is not a passive benefit from dual wielding and is not limited to dual swords. [Final Hit](https://wiki.mabinogiworld.com/view/Final_Hit#Details).

**Proposed adaptation:** Require compatible melee equipment; target self. Commit the hand to grant a melee-only flat attack bonus of `floor((baseBonus[rank] + bonusPerPip[rank] × P) × M)` for an authored number of owner activations. It deals no immediate damage. Use stats.md's self-buff timing, so it survives its casting turn and first decrements at the end of the owner's next activation. Store the resolved magnitude; later actions do not reroll the buff.

While active, qualifying melee attacks read this bonus through `A`; each still uses its own five dice, SP cost, and one normal turn. Use one nonstacking Final Hit status group and prevent recasting while active. Other learned skills remain available in our initial adaptation. Teleportation, faster initiative, endless hit chains, real-time drain, and source race restrictions are not included. A compatible single weapon, sword-and-shield loadout, or legal dual pair can benefit.

**Progression:** Learn through an advanced instructor quest or an assembled combat manual, both granting only Rank F. Rank may improve buff magnitude, duration, cost, or cooldown. Training can count a successful activation and qualifying melee hits while the buff is active. Cap hit credit per resolved action rather than per animation swing; mere elapsed buff time grants nothing.

### 8.4. Windmill — active area melee attack

**Reference:** Mabinogi's Windmill spins through surrounding enemies and knocks them down, with radius improving at rank thresholds. Counterattack does not repel it. Its hitbox, weapon, and AI interactions are specific to Mabinogi's real-time combat. [Windmill](https://wiki.mabinogiworld.com/view/Windmill#Details).

**Proposed adaptation (deferred until multi-enemy battles):** Require compatible melee equipment and at least one living hostile in the encounter. Target all eligible hostile encounter members, excluding allies and the caster; no radius, grid or line-of-sight test applies. Freeze the stable target IDs before rolling. One SP payment and one hand resolve a separate physical hit against each target's frozen defenses; do not divide pips or grant extra turns per target.

Resolve targets by stable actor ID and process the whole action before scheduling another actor or granting encounter completion. Windmill is not counterable. Knockdown, invulnerability frames, AI resets, age-dependent radius, and forced retargeting are deferred. No HP sacrifice is implied; any future HP cost must be explicitly authored under stats.md.

**Progression:** An instructor teaches Windmill after a surrounding-enemies lesson. Rank may increase damage or pip scaling at explicit thresholds; target-count limits require an explicit later rule. Train one successful use per action; a distinct multi-target objective counts once when at least two valid enemies are hit. Kill objectives may count distinct defeated targets once each. Do not require multi-target training while only single-enemy encounters exist.

### 8.5. Charge — active movement attack

**Reference:** Mabinogi's Charge rushes a target, damages it, and causes knockback/stun. It has minimum range, ordinarily requires a shield for Humans/Elves, and provides specific protection against archery while charging. Counterattack can repel it. [Charge](https://wiki.mabinogiworld.com/view/Charge#Details).

**Godot battle disposition:** Deferred pending redesign for non-spatial encounter battles. The old row/column path, minimum distance and move-then-hit rules are retired. Do not expose Charge as usable, require it for training/quests or implement world movement inside battle. A future adaptation must specify a compatible-equipment requirement, single-target effect, counter interaction, cost and reachable training goals before Phase 10 can enable it. Approach/rush animation may be cosmetic; it cannot create range, collision or an extra hit.

### 8.6. Combat Mastery — general passive

**Reference:** Combat Mastery passively improves melee damage and Balance alongside HP and character stat gains. Its damage bonus applies once when dual wielding, and Mabinogi grants the skill at character creation. [Combat Mastery](https://wiki.mabinogiworld.com/view/Combat_Mastery#Details), [Acquisition](https://wiki.mabinogiworld.com/view/Combat_Mastery#Obtaining_the_Skill).

**Proposed adaptation:** An introductory instructor lesson grants Rank F. Authored ranks provide Max HP and a melee-only Physical Attack contribution; any STR/DEX gains are separately defined permanent rank grants. The melee contribution enters eligible skills' `A` once, including dual-wield actions, and does not raise ranged or magic attacks. General Max HP remains active without a weapon. Balance-based damage ranges and dice weighting are not introduced.

**Progression:** Rank increases the authored passive values. Train from resolved eligible melee hits and melee defeats rather than selecting Combat Mastery. A separate survival objective may count eligible encounter completion once. Define per-action limits so multiple weapons and area targets cannot duplicate general-use credit.

### 8.7. Critical Hit — triggered passive

**Reference:** Critical Hit passively increases critical damage. Rank F ordinarily enables critical hits, with counter-skill exceptions; the skill's rank bonus is damage, not a direct increase in the character's critical chance. [Critical Hit](https://wiki.mabinogiworld.com/view/Critical_Hit#Details).

**Proposed adaptation:** Learn Rank F through a complete combat book or instructor lesson, without requiring an event that an unlearned skill cannot produce. This skill remains gated behind a **later critical-resolution extension**: battle.md currently specifies no separate critical roll. Once enabled, eligible direct attacks use an explicitly authored critical chance, while Critical Hit rank supplies only a nonnegative bonus-damage fraction. Without the learned passive, critical chance is zero in this adaptation; counters have no special exception.

Resolve one critical check per valid target at commitment, in stable target order, after dice decisions and any counter interception. Consume no critical draw for a countered hit or a zero-chance profile. Use a versioned combat RNG rule with chance in basis points: `randomInteger(0, 9999) < criticalChanceBp`. Show chance and both normal/critical previews; previewing or rerolling dice never resolves a critical early.

For a critical, replace battle.md's `comboDamage` with `floor(comboDamage × (1 + criticalBonus[rank]))`, then apply Protection/resistance and shields as usual. For a noncritical hit, leave it unchanged. This is one explicit extra multiplier, not another dice combination. Windmill may check each target independently when enabled; Counterattack retaliation, buffs, periodic damage, and passive effects cannot critically hit. Chance sources and limits must be authored before release; do not infer chance from Luck, Will, Protection, or dice faces.

**Progression:** Rank increases critical bonus damage without secretly increasing chance. Train on committed critical hits and eligible critical defeats, counting distinct outcomes once. Supply a reachable nonzero chance and sufficient eligible encounters before exposing rank training; the starter slice must not present an unusable critical skill as trainable.

### 8.8. Sword Mastery — sword-dependent passive

**Reference:** Mabinogi increases melee damage and Balance when using swords. Its bonus applies once even with two swords equipped; equipping a sword unlocks the skill. [Sword Mastery](https://wiki.mabinogiworld.com/view/Sword_Mastery#Details), [Acquisition](https://wiki.mabinogiworld.com/view/Sword_Mastery#Obtaining_the_Skill).

**Proposed adaptation:** A sword instructor teaches Rank F. Add the rank's sword attack contribution once to an action tagged as using a sword. Merely carrying a sword or casting a spell while holding one does not qualify. It can combine with Combat Mastery and Dual Wield Mastery as separate authored contributions, but never once per sword. No Balance or critical-chance bonus is assumed.

**Progression:** Rank increases the conditional attack bonus. Train from committed sword attacks and sword-caused defeats. Use the weapon tags frozen for that action, not equipment observed later when the training notification plays.

### 8.9. Shield Mastery — shield-dependent passive

**Reference:** Mabinogi's Shield Mastery increases Defense, Protection, Magic Defense, Magic Protection, and Auto Defense while a shield is equipped. It is passive and is learned by equipping a shield. [Shield Mastery](https://wiki.mabinogiworld.com/view/Shield_Mastery#Details), [Acquisition](https://wiki.mabinogiworld.com/view/Shield_Mastery#Obtaining_the_Skill).

**Proposed adaptation:** A shield instructor teaches Rank F. While a shield occupies its valid equipment slot, add rank-authored physical/magical Defense and Protection contributions using stats.md's units and caps. Owning the skill does not equip a shield, activate Guard, create a consumable Shield absorption pool, or randomly block hits. Auto Defense remains deferred.

**Progression:** Rank improves the conditional defensive values. Train on eligible hostile attacks resolved while the shield is equipped and, if authored, qualifying defensive-skill outcomes. Count a fully mitigated hit as an incoming attack; exclude an attack entirely negated by Counterattack from shield-defense training. One attack cannot count once per defensive stat.

### 8.10. Heavy Armor Mastery — heavy-armor-dependent passive

**Reference:** Mabinogi improves physical/magical defenses and Auto Defense in heavy armor, reduces its DEX penalty, and unlocks additional accessory capacity at specific ranks. [Heavy Armor Mastery](https://wiki.mabinogiworld.com/view/Heavy_Armor_Mastery#Details).

**Proposed adaptation:** Learn through an armor instructor. Activate rank-authored defensive bonuses only when the body-slot item is tagged `heavy_armor`. Define any armor DEX penalty in equipment content. Mastery reduces that penalty at its source before normal stat aggregation: `remainingPenalty = max(0, basePenalty - masteryRelief)`, using matching percentage-point units. Relief never becomes a positive DEX bonus and does not reduce unrelated debuffs. This is our simplified model, not Mabinogi's race-based penalty table.

**Progression:** Rank improves defenses and optionally penalty relief. Train from eligible hostile physical or magical attacks resolved while wearing heavy armor, including fully mitigated hits but excluding counter-negated attacks. Accessory-slot unlocks, stun resistance, and random Auto Defense require later equipment/status rules.

### 8.11. Light Armor Mastery — light-armor-dependent passive

**Reference:** Mabinogi grants passive Defense, Magic Defense, Protection, and Magic Protection bonuses while light armor is equipped, with acquisition through equipping light armor. [Light Armor Mastery](https://wiki.mabinogiworld.com/view/Light_Armor_Mastery#Details), [Acquisition](https://wiki.mabinogiworld.com/view/Light_Armor_Mastery#Obtaining_the_Skill).

**Proposed adaptation:** Learn through an armor instructor. Apply authored defensive bonuses while the body-slot item is tagged `light_armor`. Clothing, robes, and heavy armor do not qualify unless a later equipment definition explicitly changes the category rules. A body item must have exactly one armor category, so Heavy and Light Armor Mastery cannot both activate from it. Either may coexist with Shield Mastery through a separate shield slot.

**Progression:** Rank increases the conditional defense values. Train from eligible incoming attacks under the same counting rules as Heavy Armor Mastery, using the armor worn at resolution. Do not invent evasion, movement speed, extra turns, or DEX growth merely because the armor is light.

### 8.12. Dual Wield Mastery — paired-weapon-dependent passive

**Reference:** Mabinogi improves damage, Balance, critical rate, Armor Pierce, and Auto Defense while dual wielding. Pseudo-dual weapons do not qualify, and Elves cannot learn it because they cannot dual wield. Equipping a weapon in each hand grants the skill. [Dual Wield Mastery](https://wiki.mabinogiworld.com/view/Dual_Wield_Mastery#Details), [Acquisition](https://wiki.mabinogiworld.com/view/Dual_Wield_Mastery#Obtaining_the_Skill).

**Proposed adaptation:** A paired-weapons instructor teaches Rank F. Activate a rank-authored melee attack bonus only when distinct compatible one-handed weapons occupy both hand slots and the selected action supports that loadout. A shield, two-handed weapon, or one item depicted as two blades does not qualify. Start with paired swords; any other legal pairing needs equipment definitions. The mastery does not grant permission to equip an otherwise illegal pair.

Weapon contributions must be combined once by the equipment resolver before producing the action's `A`; author the off-hand contribution rather than doubling an already-derived attack total. Add Combat Mastery, Sword Mastery when eligible, and Dual Wield Mastery once each. Two weapons still produce one five-dice action, one cost, and one hit unless an individual skill later defines multiple hits. This passive does not activate Final Hit. Source critical-chance, piercing, Balance, and Auto Defense bonuses are deferred until their corresponding systems exist.

**Progression:** Rank improves the conditional melee bonus. Train from qualifying dual-wield attacks and defeats, once per action or distinct defeat as the objective specifies. Equipping and unequipping weapons alone never trains it. Charge's shield requirement makes Charge ineligible for the initial paired-weapon loadout.

## 9. Skill journal

The skill journal should show the selected hero's AP balance and, for each discovered skill:

- Its description, category, active/passive type, and acquisition route.
- Locked, learned, training complete, ready to advance, or maximum-rank status.
- Current rank, current effects, and a preview of the next rank.
- Training progress against 100 points, plus each objective's count and points.
- Required AP and any unmet prerequisites beside the Rank Up action.
- Book collection progress and known missing-page sources, where applicable.

Distinguish **training complete, insufficient AP** from **ready to advance**. At the maximum rank, show **Max Rank**. Keep earned training totals visible even above 100 while capping the visual progress bar at full.

The combat action selector lists active skills only. The journal also lists passives, with their current contribution and a reason when inactive, such as **Requires shield** or **Requires dual swords**. Show Counterattack's remaining charge, Final Hit's duration/magnitude, and active cooldowns. A later-system skill must be labeled unavailable in the prototype instead of presenting a nonfunctional Use or training path.

## 10. Initial scope and decisions

The first skills slice should demonstrate one NPC-taught skill, one book-taught skill, and one skill learned from an assembled book. Include at least two playable ranks for each, an AP source, visible training objectives, and saved advancement. The full F → 1 progression can follow as content expands; the UI must identify any temporary prototype cap.

Before implementation, settle:

- Whether skills and AP belong to individual heroes or the whole account; this proposal assumes individual heroes.
- Exact AP rewards, advancement costs, training objectives, effects, and prerequisites.
- Which pending skill progression and collection items survive defeat or abandonment, aligned with Phase 8.
- Starting skills, available acquisition NPCs, book prices, page sources, and drop rates.
- Whether rebirth later affects levels or AP earning, and what progression it preserves: character.md §6's reset/preserve proposal is the working draft, with eligibility, cost, and cooldown still open.

Acceptance checks for the implementation should cover all three acquisition routes; duplicate learning and pages; incomplete books; rank-up rejection below 100 or with insufficient AP; successful advancement at exactly 100 and above; training reset; maximum-rank behavior; and save/retry without duplicate gains or costs. Validate that each trainable rank can actually reach 100 points and that run abilities use the intended rank snapshot.

For the combat catalog, start with Smash and Combat/Sword Mastery, then equipment defenses and Final Hit. Enable Counterattack, Windmill and Critical Hit as their reaction, multi-target and critical-resolution dependencies are completed; Charge remains disabled until redesigned for non-spatial battles; dual wielding also needs a validated two-hand equipment model. This sequence does not require all twelve skills in the first battle slice.

Each supported rank still needs actual SP costs, cooldowns, effect values, face weights, AP transition costs, and capped training objectives. Preserve the 100-training-plus-AP gate for both types. Add fixtures for passive activation/removal, one mastery contribution with two weapons, armor exclusivity, no free resource refill, Counterattack consumption/expiry and no reaction loops, Final Hit timing, blocked Charge routes, Windmill target order and training counts, and critical RNG/multiplier order when enabled.

Save cooldown counters, Counterattack's prepared inputs/charge/window, Final Hit's resolved magnitude/duration, fixed encounter target IDs for an unfinished activation, and critical results/RNG continuation with the existing run state. Outcome IDs must prevent retries or reloads from reapplying damage or training across the selected active skill and multiple passives. Completed rank progression survives under the existing character policy; pending run training still follows Phase 8 carry-over.

## Godot skill integration

**Godot reset: 2026-09-10. Status: planned; not implemented.** Author `SkillDefinition` Resources with ordered rank records, cost vectors, dice weights, effect tags and training objectives. Store learned ranks, training and page collections in the hero profile. An application transaction validates each lesson/book/page consumption or AP rank-up before saving and emitting a UI update. Phase 8 implements acquisition/progression; Phase 10 stages advanced skills. No shared Resource holds per-hero training.

See [Godot architecture](../game-plan.md), [project layout](../directory.md) and [official engine sources](../references.md#godot-engine-sources).

## Research notes

Mabinogi Wiki pages were retrieved with Firecrawl and inspected on **September 5, 2026**. The linked wiki mechanics are reference material; proposed Rebirth Dungeon rules and illustrative numbers are identified above. Local research caches are kept under the gitignored `.firecrawl/` directory:

| Reference                                                                                                        | Local cache                                  |
|------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| [Skills overview, ranks, training, and AP training](https://wiki.mabinogiworld.com/view/Category:Skills)         | `.firecrawl/mabinogi-skills.md`              |
| [Ability Points](https://wiki.mabinogiworld.com/view/Stats#Ability_Points) (`Ability_Points` redirects to Stats) | `.firecrawl/mabinogi-ability-points.md`      |
| [In-game book catalog](https://wiki.mabinogiworld.com/view/Category:In-game_Books) (`Books` redirects here)      | `.firecrawl/mabinogi-books.md`               |
| [Icebolt acquisition](https://wiki.mabinogiworld.com/view/Icebolt#Obtaining_the_Skill)                           | `.firecrawl/mabinogi-icebolt.md`             |
| [Fireball acquisition and page collection](https://wiki.mabinogiworld.com/view/Fireball#Obtaining_the_Skill)     | `.firecrawl/mabinogi-fireball.md`            |
| [Smash](https://wiki.mabinogiworld.com/view/Smash)                                                               | `.firecrawl/mabinogi-Smash.md`               |
| [Counterattack](https://wiki.mabinogiworld.com/view/Counterattack)                                               | `.firecrawl/mabinogi-Counterattack.md`       |
| [Combat Mastery](https://wiki.mabinogiworld.com/view/Combat_Mastery)                                             | `.firecrawl/mabinogi-Combat_Mastery.md`      |
| [Critical Hit](https://wiki.mabinogiworld.com/view/Critical_Hit)                                                 | `.firecrawl/mabinogi-Critical_Hit.md`        |
| [Final Hit](https://wiki.mabinogiworld.com/view/Final_Hit)                                                       | `.firecrawl/mabinogi-Final_Hit.md`           |
| [Windmill](https://wiki.mabinogiworld.com/view/Windmill)                                                         | `.firecrawl/mabinogi-Windmill.md`            |
| [Sword Mastery](https://wiki.mabinogiworld.com/view/Sword_Mastery)                                               | `.firecrawl/mabinogi-Sword_Mastery.md`       |
| [Shield Mastery](https://wiki.mabinogiworld.com/view/Shield_Mastery)                                             | `.firecrawl/mabinogi-Shield_Mastery.md`      |
| [Heavy Armor Mastery](https://wiki.mabinogiworld.com/view/Heavy_Armor_Mastery)                                   | `.firecrawl/mabinogi-Heavy_Armor_Mastery.md` |
| [Light Armor Mastery](https://wiki.mabinogiworld.com/view/Light_Armor_Mastery)                                   | `.firecrawl/mabinogi-Light_Armor_Mastery.md` |
| [Dual Wield Mastery](https://wiki.mabinogiworld.com/view/Dual_Wield_Mastery)                                     | `.firecrawl/mabinogi-Dual_Wield_Mastery.md`  |
| [Charge](https://wiki.mabinogiworld.com/view/Charge)                                                             | `.firecrawl/mabinogi-Charge.md`              |
