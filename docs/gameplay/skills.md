# Rebirth Dungeon: Skills

Updated **October 2, 2026** for the Expo/React Native application in this repository. NPC/book/page acquisition, per-hero ranks, capped training and AP are implemented for the supported pilot skills. This document also records later extensions.

Skills grow through practice and investment. Heroes learn them through **NPC instruction**, **complete skill books**, or **collected pages assembled into a book**. Advancing a learned skill requires **at least 100 training points at its current rank plus the authored AP (Ability Points) cost**. Preserve these requirements while adapting the skills to the application's existing turn-based combat.

## 1. Current project baseline

Use the TypeScript implementation as the integration baseline. The neighboring [battle specification](battle.md) and [game plan](../game-plan.md) describe the deterministic TypeScript implementation; historical Godot/five-dice rules do not govern this game. [README](../../README.md) provides broader project context, but inspect the current schemas and resolvers when its older examples differ.

| Area                | Implemented today                                                                                              | Change required for skills                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Platform            | Expo SDK 57, React Native, Expo Router; iOS, Android, and web                                                  | Reuse the existing app and dependencies                                  |
| Battle flow         | Select action → select target → confirm → resolve → next actor                                                 | Resolve a learned skill at the hero's saved rank                         |
| Initiative          | Fixed speed order established at encounter start; ties preserve participant order                              | Skills consume one scheduled turn; speed buffs do not reorder this queue |
| Catalog             | 34 reference skill definitions (including Human Ranged Attack) plus the separately authored Enchant town skill | Add authored game rank definitions and explicit availability             |
| Combat              | Seeded hit, critical, damage-range, defense, protection, and injury rules                                      | Reuse the resolvers; add only the mechanics an enabled skill needs       |
| Progression         | Hero level, XP, talent, resources, inventory, equipment, learned ranks, training, AP, discovery and books      | Author further supported rank adapters                                   |
| Saves               | Version 12 campaign saves; SQLite on native, IndexedDB on web                                                  | Preserve lossless migrations from versions 1–11                          |
| Battle continuation | A pending encounter restarts from its entry hero state and seed                                                | Keep training inside that battle until its result is committed           |

The four starter spells are `firebolt`, `icebolt`, `lightning-bolt`, and `healing`; the instructor outside the northeast Combat School also enables Smash. Their catalog `rank: F` is a definition value, not the saved hero rank. Class skill IDs supply starter grants, while hero learned records determine battle availability and reconstructed rank bonuses. Smash, Combat Mastery, Sword Mastery, Icebolt and the town-only Enchant skill support F/E progression. Human/Elf Ranged Attack now have F/E basic-Attack adapters with ranged damage/balance and owned attribute totals, but no new learning or rank-up route. Loaded bows choose owned Elf Ranged Attack or default Human F; no arrows means fists. Other catalog entries need authored adapters before learning.

Implementation anchors: [BattleMachine](../../src/engine/battle/BattleMachine.ts), [BattleController](../../src/engine/battle/BattleController.ts), [CombatSystem](../../src/engine/ecs/systems/CombatSystem.ts), [SkillResolver](../../src/engine/battle/SkillResolver.ts), [Stats](../../src/engine/rpg/Stats.ts), [Hero model](../../src/engine/rpg/Character.ts), [JourneySession](../../src/game/JourneySession.ts), and [SaveSchema](../../src/persistence/SaveSchema.ts).

## 2. Turn-based combat contract

### Selecting and using an active skill

```text
SELECT_ACTION { action: 'skill', skillId }
    → SELECT_TARGET { targetId }
    → CONFIRM_ACTION
    → USE_SKILL inside BattleController
    → resolve costs, effects, deaths, and turn boundaries
    → next scheduled actor or battle result
```

The battle action menu lists **learned, implemented active skills**. Combat also contains the always-available Attack and Defend basic actions. Their icons/details use the talent’s Combat Mastery/Human Ranged Attack/Magic Mastery identity and Defense respectively, while keeping existing attack/guard rules. Loaded bows instead use Human Ranged Attack or owned Elf Ranged Attack independently of talent, with a one-arrow cost and ranged rank inputs. Empty/broken bows use fist damage and Combat Mastery presentation. This does not cast a passive or grant a learned rank. Other passive skills do not appear as selectable actions. Rest remains engine-supported. Items contains the character’s saved battle-usable consumable assignments, configured through Inventory; these do not grant skill training.

Selection and targeting are reversible. Neither spends resources nor draws gameplay randomness. `CANCEL_ACTION` returns to action selection without using the turn or awarding training. Confirmation revalidates ownership, rank, implementation support, equipment, cooldown, resource affordability, and living targets before any mutation or RNG draw. A rejected command changes none of those values and leaves the player able to correct the selection.

On accepted confirmation, resolve one action synchronously and deduct its MP/SP costs once. A committed attack that misses still spends its cost and turn. A multi-target skill pays once and advances initiative once. Assigned battle-usable items consume one copy and one self-targeted turn without weapon wear, attack RNG or skill training. AP is never a battle-use cost.

Use `staminaCost` from the resource rules for the displayed and resolved SP cost, including its fullness adjustment. Healing another ally currently costs no SP; healing oneself applies Healing's authored SP cost. Preserve this target-dependent behavior when showing the confirmation summary. HP costs, charge loading, and upkeep payments need explicit future resolver support before any skill can require them.

Battle rank and learned-skill inputs are copied from the hero when the encounter starts. Equipment durability and encounter statuses can change during the battle and affect subsequent actions through the existing stat pipeline. Town progression cannot alter an active encounter. The next encounter receives the updated hero after the previous result is committed; this plan does not introduce an expedition-wide frozen rank/stat snapshot.

Targeting uses living encounter membership and allegiance: `self`, `ally` (including self), `enemy`, or `allEnemies`. Canvas positions, camera movement, and attack animations do not create range or line-of-sight rules. An area action uses the selected enemy and the full eligible hostile set established at confirmation. After Use, enemy-targeted skills automatically confirm the sole living enemy; multiple enemies still require a canvas target tap. This shortcut does not apply to ally selection or change costs and RNG draws.

### Damage, healing, and passives

Extend [SkillResolver](../../src/engine/battle/SkillResolver.ts) with a resolved definition for the hero's rank; feed it into [AttackResolver](../../src/engine/battle/AttackResolver.ts). Keep existing hit chance, balance-based sampling, physical/magical defenses, protection curves, critical chance, critical multiplier, wounds, and weapon wear. Rank upgrades author their changes to these inputs rather than adding a second damage formula.

The current range-based skill path builds physical power from the effective physical damage range plus skill power, then floors each endpoint after its authored physical multiplier, and magical power from the skill range plus magic-attack scaling. Preserve the existing fallback for legacy combatants without ranges. A preview computes ranges/chances from the same prepared inputs without consuming RNG; it cannot promise the exact result before confirmation.

For area damage, preserve the resolver's current selected-target-first RNG evaluation and shared critical result for the remaining targets, with target iteration supplied by `TurnQueue.order`. Do not silently change to one independent critical roll per target or reorder targets for presentation. Any future change needs an explicit combat-rule version and replay fixtures.

Passives contribute automatically when learned and eligible. They have no activation, per-trigger payment, animation-driven effect, or extra turn. Separate always-on rank stat grants from action-specific and equipment-specific bonuses. A melee or sword bonus must not strengthen a magic spell simply because its caster holds a sword. Aggregate each contribution once; keep the existing stat caps and protection units. Increasing max HP, MP, or SP does not refill the current pool; decreasing a maximum clamps the current pool to its valid limit.

### Turn timing

| Mechanic                                | Planned timing                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Existing status effects                 | Retain `turnStart`/`turnEnd` ticks on the affected actor and the current stacking rules                     |
| Self-buff applied with `turnEnd` timing | The casting turn counts, as it does today; author its duration accordingly                                  |
| Defend                                  | Existing damage reduction lasts until the defender's next turn starts; preserve its recovery behavior       |
| New skill cooldown                      | Set on successful use; skip that casting turn's end, then decrement at each subsequent completed owner turn |
| Counterattack window                    | One prepared reaction, expiring at the start of the owner's next turn                                       |
| UI/navigation/suspension                | No skill, cooldown, status, or initiative advancement                                                       |

For cooldown `1`, the next owner turn cannot use that skill; its end clears the cooldown, allowing use on the following owner turn. Attack, Defend and Rest also count as completed owner turns. Cooldowns clear at encounter end in the initial implementation; longer-lived cooldowns require a separate design.

For a self-buff intended to improve two subsequent owner actions, a `turnEnd` status needs duration `3`: one tick on casting, then two on later actions. Display the remaining useful actions after casting. Do not globally change status duration semantics to add this skill. Reactions resolve inside the triggering action, with no recursive reactions or added queue entry. All death and outcome handling completes before scheduling another actor, retaining defeat priority when both sides die.

## 3. Learning and acquisition

Progression belongs to **one hero**, scoped by the selected character's existing save storage. NPC lessons, reading, page insertion, and rank-ups are available in town when there is no active dungeon or pending encounter. The journal can be viewed elsewhere, with the reason progression actions are unavailable. Picking up a book or page during exploration is inventory acquisition, not learning.

A skill can support more than one learning route. Any valid route grants Rank F with zero objective counts and no AP charge. Check prerequisites before consuming a fee or item. A repeated lesson or a book for an already-known skill cannot reset training, increase rank, or award AP.

| Route           | Player flow                                                                         | State transition                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| NPC instruction | Open an instructor service, inspect prerequisites, choose Learn                     | Validate instructor/access/fee, deduct any fee, add the learned record                                               |
| Complete book   | Select an owned book in Inventory, inspect the skill, choose Read                   | Consume one book and add the learned record together                                                                 |
| Page collection | Obtain the incomplete book, insert its distinct pages, then read the completed book | Consume each page with its slot update; exchange the incomplete book for one complete book when all slots are filled |

Books and pages need explicit item kinds/metadata in `ItemSchema`; they are not battle consumables. Store collection progress per hero under a stable recipe ID. The initial model permits one collection per recipe per hero and one nonstacking incomplete book for that collection, avoiding ambiguity between multiple partly filled copies.

Pages may be collected before the incomplete book, but insertion requires ownership of the matching incomplete book. Permit insertion in any order, with no expiration. A duplicate, unrelated page, unmet prerequisite, or already-completed collection consumes nothing. Show filled slots, missing page names, and discovered source hints. Required pages in the pilot have identifiable, guaranteed sources rather than relying only on rare drops.

The last insertion consumes its page, removes the incomplete book, marks the recipe completed, and creates exactly one complete book in a single candidate state. Validate output capacity before changing anything. Keep a completion marker so retries cannot produce another book. Reading that book uses the normal learning transition. Selling or discarding an incomplete book is disabled in the pilot; other book/page sale rules are authored explicitly.

Equipping a weapon can reveal a mastery lesson or hint but does not automatically teach it. No race lock is inferred from Mabinogi reference tables. Growth talents remain stat-growth choices and do not restrict learning unless a future prerequisite explicitly says so.

## 4. Ranks, training, and AP

### Rank progression

```text
F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1
```

Use the existing `SkillRankSchema` order. A learned record stores the current rank and objective completion counts. Every supported rank defines its game effects, resource costs, optional cooldown, objectives, and an explicit AP cost for its next transition. Rank 1 has no next rank. A prototype with only F and E shows **Prototype cap: E**, keeping it distinct from **Max Rank: 1**.

Rank stat grants are cumulative totals at that rank, derived once when stats are calculated. Never award them again on load or rank-up. Do not sum both a reference table's individual gains and its cumulative column. Mabinogi's AP rows, racial variants, seconds, and percent strings remain reference data, not executable progression rules.

### Training

Training belongs to a single skill at its current rank, separately from character XP and AP:

```text
trainingPoints = sum(min(completedCount, maximumCount) × pointsPerCompletion)
```

A skill can advance at 100 points or more without completing every objective. Excess points do not reduce AP cost or carry into the next rank. Each supported nonterminal rank must offer reachable objectives totaling at least 100 points. Retain counts above the eligibility threshold within their objective caps; cap only the progress bar at full.

Implemented Rank F training for Smash:

| Objective                                                   | Points each | Maximum count | Available points |
| ----------------------------------------------------------- | ----------- | ------------- | ---------------- |
| Resolve Smash against an eligible hostile, including a miss | 2           | 20            | 40               |
| Deal positive HP damage with Smash                          | 5           | 10            | 50               |
| Defeat an eligible hostile directly with Smash              | 10          | 3             | 30               |
| **Total**                                                   |             |               | **120**          |

Twenty uses, ten damaging hits, and one defeat yield `40 + 50 + 10 = 100`. Selection, cancellation, invalid commands, opening a menu, waiting, equipment toggles, and animation completion award nothing. In the pilot, eligible encounters are actual authored world/dungeon encounters involving the hero and a hostile; debug arenas and town interactions do not train combat skills.

Define counting scope per objective: **action**, **target outcome**, or **encounter**. A use objective counts once per accepted action even if it hits five enemies. A defeat objective may count each distinct defeated target once. Multiple distinct objectives and learned passives may train from the same outcome without duplicating any one objective. Healing objectives require positive restored HP and respect wounds; healing a full-health target or passive resource recovery does not count as effective Healing.

Training must be calculated from an authoritative action-result record inside the simulation. Existing `SKILL_USED`, `DAMAGE_DEALT`, `HEALTH_RESTORED`, and `ENTITY_DIED` notifications do not provide enough attribution by themselves: damage currently lacks skill/action identity and also represents status ticks. Add a detached outcome record with encounter/action IDs, source/target IDs, selected skill/rank, attack and equipment tags, hit/critical state, actual damage/healing, direct-versus-status origin, and defeated targets. Give ongoing effects an originating skill/action only when their objectives support them. Update the pending training ledger before publishing external notifications, so a failing listener cannot lose training or make the action safe to replay. Presentation, audio, and React subscriptions consume resulting notifications; they never grant training.

### AP and rank-up

The hero has one nonnegative integer AP balance shared by its skills. AP buys advancement only: it cannot purchase training points or bypass the 100-point gate. New characters start with **5 AP**; implemented progression rewards are **1 AP per level gained** and **3 AP for one authored introductory milestone per hero**. Count every actual level gained when an XP reward crosses several thresholds. Add no retroactive AP for imported levels. Later quests can author AP rewards and repeatability; ordinary uses and book reading award none.

Rank-up requires all of the following:

- A learned skill with a supported next rank.
- At least 100 current-rank training points.
- Enough AP for the authored transition.
- Satisfied advancement prerequisites.
- Town access with no active dungeon or pending encounter.

On success, deduct AP once, advance exactly one rank, and reset objective counts for the new rank. On failure, change nothing. Reaching 100 never auto-spends AP. For Smash’s implemented F → E cost of 3 AP:

| Training | AP before | Result                       |
| -------- | --------- | ---------------------------- |
| 99       | 10        | Requires more training       |
| 100      | 2         | Requires 1 more AP           |
| 100      | 3         | Rank E, 0 AP, training reset |
| 120      | 5         | Rank E, 2 AP, training reset |

## 5. Skill catalog adapted to turns

### Existing starter magic

Preserve these skills and their current Rank F behavior while adding learned-rank resolution. These are runtime definition inputs, not guaranteed final damage or healing:

| Skill ID         | Target and effect               | Current base range                                               | MP  | SP                                  |
| ---------------- | ------------------------------- | ---------------------------------------------------------------- | --- | ----------------------------------- |
| `firebolt`       | One hostile, fire damage        | 7–25 plus authored magic scaling                                 | 2   | 0                                   |
| `icebolt`        | One hostile, ice damage         | 10–20 plus authored magic scaling                                | 1   | 0                                   |
| `lightning-bolt` | One hostile, lightning damage   | 1–40 plus authored magic scaling                                 | 2   | 0                                   |
| `healing`        | One living ally, including self | 6–10 plus authored magic scaling; capped by unwounded missing HP | 12  | 6 base for self, 0 for another ally |

Each is one action, with no loading timer or stored charges. Firebolt does not gain Burn from its name, Icebolt does not gain slowing, and Lightning Bolt does not gain chain targets. Icebolt has an authored F/E adapter: 20 committed uses supply 100 training for a 2 AP advancement, with E power 11–21 and +2 permanent INT. Firebolt, Lightning Bolt and Healing remain capped at F until their E adapters are authored. Training can count committed uses, actual damage/healing, and direct defeats where appropriate.

### Combat skills

Retain the following identities from the earlier plan, adapting them to the current turn scheduler. Availability describes required work, not current implementation status. Smash, Combat Mastery and Sword Mastery already have implemented F/E adapters; Final Hit, Windmill, Charge, Shield Mastery, and Dual Wield Mastery require new definitions as well as their mechanics.

| Skill               | Type                   | Turn-based role and dependency                                                       |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| Smash               | Active melee           | Stronger single-hostile physical attack; pilot                                       |
| Combat Mastery      | Passive                | Max HP and eligible melee damage; pilot                                              |
| Sword Mastery       | Equipment passive      | Sword action damage and authored Balance contribution; pilot after weapon tags       |
| Critical Hit        | Triggered passive      | Rank-derived critical damage bonus using existing critical resolution                |
| Defense             | Active defensive skill | Later rank-aware improvement to Defend, with one shared defense resolver             |
| Final Hit           | Active self-buff       | Temporary melee bonus for authored future owner actions; status extension            |
| Windmill            | Active area melee      | One action against all living hostiles; use the existing area resolver               |
| Counterattack       | Active stance          | Prepare one automatic retaliation; reaction extension                                |
| Heavy Armor Mastery | Equipment passive      | Defense/protection while wearing heavy armor; armor-category tags                    |
| Light Armor Mastery | Equipment passive      | Defense/protection while wearing light armor; armor-category tags                    |
| Shield Mastery      | Equipment passive      | Defense/protection while a shield is equipped; shield slot and legality rules        |
| Dual Wield Mastery  | Equipment passive      | Bonus for a legal two-weapon loadout; two-hand equipment model                       |
| Charge              | Later active attack    | A non-spatial single-target guard-breaking adaptation; authored mitigation extension |

**Smash.** Learn Rank F for free from the instructor outside the Combat School in the northeast refuge. Require a usable compatible melee weapon and target one hostile. Rank F multiplies the effective physical range by 2; E multiplies it by 2.1. Floor each endpoint before critical damage, Defense and Protection. Smash bypasses Defend's guard reduction, but not ordinary Defense/Protection; retain existing hit/critical, injury and weapon-wear rules. Pay 4 base SP, 0 MP and one turn. The existing 100-point training gate, 3 AP F→E transition and E cap remain authored adaptations. There is no owner-turn cooldown. Knockback, splash, weapon debuffs, racial variants and two-handed bonuses are deferred. Train on uses, positive damage and direct defeats. Source: [Mabinogi Smash](https://wiki.mabinogiworld.com/view/Smash), fetched with Firecrawl October 2, 2026; the source's real-time cooldown, AP and training tables are reference data.

**Combat Mastery.** Derive authored max HP and melee-only damage bonuses from its learned rank. The HP bonus stays active without a weapon. The melee bonus applies to eligible basic melee attacks and skills once, including any later legal paired-weapon action, and does not become magic attack. Train on eligible melee actions, direct hits/defeats, and optionally encounter completion once.

**Sword Mastery.** Require a usable equipped weapon tagged `sword` and an action that actually uses it. Add its damage and Balance values once, preserving the physical Balance cap. A broken weapon, exhausted bare-hand fallback, or spell cast while holding a sword does not qualify. Train using action-time weapon tags, before weapon wear can break the sword.

**Critical Hit.** Critical rolls already exist and remain possible without this passive. Preserve existing chance sources, protection reduction, and the 30% effective chance cap in the range-based path. Rank supplies an authored critical multiplier contribution without secretly increasing chance or adding another roll. A proposed adapter uses the existing baseline multiplier plus one rank bonus; reference percentages must be mapped explicitly to that convention. Train from actual direct critical damage and critical defeats. Periodic damage and healing remain noncritical under the current rules.

**Defense.** Keep the current free Defend action available. Later make a learned Defense rank improve its authored mitigation or recovery through the same resolver, with any additional SP cost shown before confirmation. Do not introduce a separate Guard absorption pool or stack two Defend reductions. Defensive training needs the action outcome to report damage prevented compared with the undefended result; selecting Defend alone cannot prove prevention.

**Final Hit.** One self-targeted activation pays SP and applies a nonstacking, melee-only bonus; it deals no immediate damage. Author a turn-count duration using the casting-turn rule in section 2. Each subsequent attack still costs its own turn/resources. Recasting while active is rejected. The existing generic `attack` status has no melee-only filter, so add eligible-action filtering before enabling the buff, including exclusion of future ranged attacks. Train on its activation and qualifying boosted melee hits. Teleporting, faster queue entries, and endless hit chains are cosmetic or deferred.

**Windmill.** One physical area action, one SP payment, one turn. Reuse `allEnemies` targeting, the current area RNG contract, and each target's own defenses. The skill is not counterable in this adaptation. Resolve all target effects before checking the final turn outcome; train uses once per action and direct defeats per target. No radius, tile-distance, movement, invulnerability, or automatic HP sacrifice applies. Require multi-hostile fixtures before authoring training that demands two hits.

**Counterattack.** One self-targeted stance consumes a normal turn and prepares a rank-defined retaliation profile without rolling its damage in advance. Store that profile in encounter state. The first eligible hostile single-target melee attempt before the owner's next turn consumes the stance, negates that attack and its on-hit effects, and retaliates through the physical resolver with hit chance 1 and critical chance 0. Sample any retaliation range from the battle RNG only when triggered. Ranged/magic, area, periodic, and reaction damage bypass the stance without consuming it. Retaliation cannot start another counter. Apply the attacker's accepted action cost before the reaction, and finalize its turn even if retaliation kills it. Train preparation with a cap and successful counters from attributed reaction outcomes; unused stances do not earn counter credit.

**Heavy/Light Armor Mastery.** Add authored defense, magic defense, protection, and magic protection using current numeric stat units. Require a body item with exactly one `heavy_armor` or `light_armor` tag; owning armor in Inventory is insufficient. A body item cannot enable both masteries. Any DEX penalty relief reduces an authored equipment penalty at its source, never converts it into a positive bonus. Train on eligible incoming attacks while that armor contributes. Auto Defense, accessory-slot unlocks, and stun resistance await their own systems.

**Shield Mastery.** Gate behind a real shield item/slot and equipment validation, since today's hero only has weapon and armor slots. Apply the shield's passive defensive contributions once. It neither equips a shield nor creates a shield-HP pool or automatic block. Train eligible incoming attacks while the shield contributes; a counter-negated attack does not count as shield mitigation.

**Dual Wield Mastery.** Gate behind distinct compatible weapon instances in two validated hand slots; shields and two-handed weapons cannot count as a pair. Combine weapon contributions once before deriving damage, with an explicit off-hand rule. Add eligible Combat/Sword/Dual Wield bonuses once each. Two weapons still produce one action unless a skill explicitly implements multiple hits. Weapon wear and breakage need authored per-hand rules before enabling it. No free Final Hit, extra turn, or automatic critical/piercing bonus follows from the name.

**Charge.** Proposed later adaptation: one hostile melee strike that reduces the current Defend action's mitigation by an authored rank value. It needs an explicit mitigation-bypass field and counterable melee tag; leave acquisition/use disabled until those rules and its equipment requirements are implemented. A rush animation changes no world position, range, queue entry, or number of hits. This preserves an approach/guard-breaking identity without importing real-time pathfinding into battle.

Other reference skills, including ranged, advanced magic, and life skills, remain visible as **Not implemented** until their equipment/effect and training systems exist. Seconds, world radii, racial variants, and charge counts must be redesigned into explicit actions, turn counts, or prerequisites. Presence in the Codex does not grant ownership or stat bonuses.

## 6. Data and engine integration

Keep content, hero progression, encounter state, and UI state separate:

| Owner                                               | Planned data/responsibility                                                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/skills` and `src/data/schemas/content.ts` | Stable skill IDs, immutable game rank definitions, learning routes, prerequisites, supported mechanics, and retained source references |
| `src/data/items`, town/world definitions            | Book/page metadata, recipes, instructor offers, guaranteed pilot sources                                                               |
| `HeroSchema` in `src/engine/rpg/Character.ts`       | AP, discovered IDs, learned rank/objective counts, book collections, claimed progression milestones                                    |
| `StatSource`/`Stats`                                | Explicit learned rank input and conditional passive aggregation, replacing the class-list bonus loop                                   |
| `src/engine/rpg/Skills.ts` (new)                    | Pure acquisition, training, rank eligibility, rank-up, and passive/rank-resolution helpers                                             |
| `BattleController`, `CombatSystem`, `SkillResolver` | Validate and resolve a rank-aware action; maintain cooldowns/reactions and authoritative action outcomes                               |
| `BattleSession`                                     | Copy hero skills into the encounter, collect bounded pending training, expose detached views                                           |
| `JourneySession`                                    | Validate town progression commands; merge a completed battle's training and level/milestone AP once                                    |
| `JourneyHost`, `SaveRepository`, `AutoSaver`        | Serialize progression mutations, save the complete candidate campaign, retain/retry failed writes                                      |
| `src/ui/skills` (new), battle and inventory UI      | Render journal/action views and dispatch intents                                                                                       |

Proposed learned record: `skillId → { rank, objectiveCounts }`; derive training points rather than saving a second total that can disagree. Counts use stable objective IDs scoped to rank. Book collections store recipe IDs and distinct inserted page IDs, not array positions. Saves contain IDs and runtime values, never source tables, functions, React elements, or mutable catalog definitions.

Add proposed `LEARN_SKILL`, `READ_SKILL_BOOK`, `INSERT_SKILL_PAGE`, and `RANK_UP_SKILL` commands to the typed command union and shape validator. Gameplay handlers resolve instructor/item/recipe access from authoritative state; the UI cannot choose arbitrary AP costs or grant a skill ID without a valid route. Notify with proposed learned/training/rank/AP events only after the state transition succeeds.

Resolve the hero's rank into a game action definition without mutating `ContentRegistry.skill()`. Enemy skills use explicit authored ranks/defaults, independently of the selected hero's progress. New heroes receive an explicit starter-skill grant; class templates may specify that initial list but cannot remain the runtime source of ownership.

Catalog validation must reject unknown IDs/ranks/objectives, missing next-rank definitions, negative/noninteger costs and counts, invalid effects/target combinations, unreachable training gates, invalid item/recipe references, contradictory equipment tags, and malformed rank ranges. Full reference tables do not prove that every game rank is implemented. Keep reference-only entries unavailable; supported passives are eligible effects even though they have no battle button.

## 7. Persistence and encounter outcomes

### Preserve the existing checkpoint model

The campaign hero remains authoritative outside combat. While a battle is active, collect training in a detached, bounded encounter ledger. Do not mutate the campaign's learned counts on each attack: restarting the saved pending encounter would otherwise replay those gains.

| Boundary                                           | Proposed skill progression policy                                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Encounter entry                                    | Save the hero and pending encounter seed/identity; create its rank snapshot                                                      |
| During battle                                      | Training, cooldowns, reactions, and statuses stay in that BattleSession                                                          |
| Victory or defeat committed through `finishBattle` | Merge that battle's eligible training once; AP level/milestone rewards join the same hero transition                             |
| Victory                                            | Keep current XP/gold/drop rewards, including any authored book/page loot                                                         |
| Defeat                                             | Preserve learned ranks, AP, and committed training; retain current resource restoration and gold penalty; add no victory rewards |
| Leave/reload before battle completion is committed | Discard that battle ledger; recreate the pending encounter from the entry state and seed                                         |
| Later dungeon defeat/return                        | Previously committed encounter progression and owned books/pages remain with the hero                                            |

This commits practice on both completed victory and defeat, following the existing encounter boundary rather than deferring progression until a whole dungeon run ends. Defeat is the current refuge recovery flow; it does not reset levels, ranks, AP, or training as a new rebirth system. Deliberate rebirth needs a separate design.

For bounded deduplication, give each battle instance a stable encounter identity derived from saved encounter context, monotonically numbered action outcomes, and capped objective counters. Consume each outcome once inside that encounter ledger. Merge the ledger only for the matching pending encounter, and clear pending in the same campaign candidate; repeated result submissions cannot merge twice. Manual load restores the whole campaign, including AP and collection/milestone flags, rather than merging old progression into the loaded slot.

No mid-turn serialization is required for the first skills slice. Cooldowns and prepared reactions are discarded when an unfinished encounter restarts, alongside HP changes and training from that attempt. Exact mid-battle resume is separate future work requiring turn queue, statuses, cooldowns, reaction inputs, ranks, RNG state, action sequence, and pending outcomes together.

### Migration and durable progression actions

Bump the wire save version when extending `HeroSchema`, preserving existing version 1–5 migration coverage. Migrate existing Warden saves to learned Rank F records for their current four starter skills, with zero training, zero AP, and empty collection/milestone state. Preserve current stat totals and resources; adding the new learned input must not double the existing four +INT grants or refill pools. Give pending legacy encounters the same deterministic starting ranks.

Use the existing per-character campaign payload as the sole progression record; keep `CharacterProfile` for identity/setup details. A save-format change does not by itself require a SQLite/IndexedDB database schema change. Retain native SQLite and web IndexedDB through `createSaveStorage`; no new storage dependency is needed.

Learning plus book/fee consumption, page insertion plus book completion, and AP spending plus rank-up must each form one validated candidate campaign. Add a host-owned durable progression operation: flush earlier writes, save the candidate to the auto slot, then publish success and permit the next dependent mutation. A failed write retains the exact candidate for retry and cannot charge again or emit a second progression result. Do not claim the current 250ms debounced autosave already provides this confirmation guarantee.

Use that same durable boundary for merging a completed battle ledger with its rewards and clearing pending before dismissing the battle. This requires host/session coordination beyond today's synchronous `returnFromBattle`; it prevents training and inventory from being committed separately. Keep the previous live campaign on validation/load failure and surface save errors with a Retry action.

Background/unmount flushes remain useful, but mobile termination may occur without a callback. Critical progression actions need the explicit save boundary above; do not rely on component cleanup for correctness. Render/audio timers and storage retry callbacks cannot resolve the action again.

## 8. Mobile skill journal and action UI

Use the existing React Native/HeroUI shared controls and Uniwind/theme conventions. Add a thin Expo Router route at `src/app/(screens)/game/[characterId]/skills.tsx` backed by `src/ui/skills/SkillsScreen.tsx`. It obtains the existing character-scoped host through `CharacterGameContext`; it must not create a second journey. Register the route in the character stack and expose Skills from the character view/navigation. Keep helpers/components outside `src/app/`. Expo Router supports the shared native/web route structure. [Expo Router documentation](https://docs.expo.dev/router/introduction/).

On compact screens, use a single-column skill list and a drill-in detail view. Show AP, learned/discovered filters, category, rank, training, and eligibility on concise rows. A selected skill shows current/next effects, objective counts, acquisition hints, and one clearly labeled Learn/Read/Rank Up action. Avoid presenting the entire rank table in a narrow combat menu. Long lists should render only the needed rows; keep stable keys and cached immutable catalog lookups outside render loops.

| Journal state                | Player-facing feedback                                            |
| ---------------------------- | ----------------------------------------------------------------- |
| Discovered, unlearned        | How to learn and unmet prerequisites                              |
| Learned, below threshold     | `72 / 100 training` and remaining objectives                      |
| Training complete, AP short  | `Training complete · Need 1 AP`                                   |
| Ready                        | `Rank up F → E · 3 AP` plus next-rank preview                     |
| Prototype boundary           | `Prototype cap: E`                                                |
| Final rank                   | `Max Rank: 1`                                                     |
| Unsupported mechanic         | `Not implemented` with its dependency; no learning/rank-up action |
| Conditional passive inactive | Its reason, such as `Equip a usable sword`                        |

Book details show page slots and missing source hints, with explicit Insert/Read actions. Display the journal's banked training and any current-encounter pending gain separately, labeled **Banked after this battle**. Progression actions are read-only during a dungeon/battle, with **Return to town to rank up** visible beside their controls.

In battle, skill rows show the hero's rank, effective MP/SP cost, target type, cooldown, and an unavailable reason. Confirmation shows selected targets and predicted range/chance; an area skill explicitly says **All enemies**. Keep self-target shortcuts, named target buttons as an alternative to tapping sprites, and Back/cancel behavior that preserves the current turn.

Provide comfortable touch targets of at least 48 logical units, screen-reader labels/state, sufficient contrast, and layouts that tolerate larger text. Keep confirm actions reachable on small portrait screens and account for device safe areas with the already-installed safe-area library. [Expo safe-area guidance](https://docs.expo.dev/develop/user-interface/safe-areas/). Show readiness and progress through text as well as color; retain keyboard focus/selection behavior on web. Opening or dismissing the journal never advances combat.

Read detached session snapshots with the project's existing subscription pattern. Zustand stores selection/filter/presentation preferences, not authoritative AP/ranks. Skia, Reanimated, and audio can react to skill events but cannot write progression. Clean up subscriptions on navigation and honor host generations so a stale save response cannot update another character's screen.

## 9. First playable progression slice

Preserve the four current starter spells. Demonstrate all three acquisition routes with skills that are not already granted:

| Pilot skill    | Acquisition                                      | F → E proposal                                                                  | Dependencies                                           |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Smash          | Town melee instructor lesson                     | Additive physical skill range 10–14 → 14–20; 4 base SP, 0 MP, no cooldown; 3 AP | Compatible melee weapon requirement and action tags    |
| Combat Mastery | Read a complete combat manual                    | Max HP +10 → +12; melee min/max damage +1/+1 → +2/+2; 3 AP                      | Learned-rank stat aggregation and melee filtering      |
| Sword Mastery  | Assemble three named pages, then read its manual | Sword min/max damage +0/+2 → +1/+3; Balance +0.01 → +0.02; 3 AP                 | Sword tags, usable weapon checks, collection inventory |

These are **Rebirth Dungeon pilot values**, not imported Mabinogi balance. Author them as numeric definitions and evaluate their damage/resource pacing against existing enemy HP and protection before release. E is the prototype cap for these three; no E → D spending or unsupported training is exposed.

Use section 4's Smash objectives for F. Combat Mastery F can award 2 points for each of 20 committed melee actions, 5 for each of 10 positive melee hits, and 10 for each of 3 direct melee defeats (120 available). Sword Mastery F can award 3 points for each of 20 damaging sword actions and 10 for each of 6 sword defeats (120 available). Each must be attainable through repeatable eligible encounters; authored guaranteed page rewards must remain obtainable if a dungeon is left or failed before their acquisition commits.

Keep the introductory AP milestone and page sources distinct from repeatable battle rewards, with persisted claim IDs. Do not require a learned skill to produce an otherwise impossible acquisition/training event. Add no arbitrary racial variants or class locks to this slice.

## 10. Implementation order

1. **Content and progression foundation:** Separate reference tables from game rank definitions; add hero progression fields, pure helpers, starter grants, schema validation, and legacy migration. Replace class-derived ownership/stat grants with explicit learned ranks. Existing starter battles and stats must remain equivalent.
2. **Authoritative training and AP:** Add attributed action outcomes and a bounded encounter training ledger. Integrate completed-battle merging, multi-level AP awards, and one-time milestone claims. Add the host's durable candidate/save operation and failure retry flow.
3. **Acquisition:** Add instructor offers, complete/incomplete books and pages, validated town commands, and all-or-nothing item/progression transitions. Author guaranteed pilot sources.
4. **Journal and pilot skills:** Add the character-scoped route/list/detail UI, banked/pending training, rank-up flow, rank-aware battle selection/previews, Smash, Combat Mastery, and Sword Mastery at F/E. Verify all three learning routes and a saved rank-up on native and web.
5. **Extend combat selectively:** Author rank adapters for starter magic; add Critical Hit, Defense, armor masteries, Final Hit, and Windmill using existing resolver/status support. Add Counterattack only with its reaction contract. Shield/Dual Wield/Charge and advanced or life skills follow their explicit dependencies.

These are skills implementation steps, not the historical Godot phase numbers. No new native module, hand-written `ios/` or `android/` project, combat timer, or alternative navigation stack is required for the pilot.

## 11. Acceptance and verification

### Engine/content

- All three routes learn exactly Rank F; failed/duplicate learning consumes nothing and preserves counts.
- Pages work in any order; wrong/duplicate/missing pages and full-output inventory reject without mutation; final insertion produces one book once.
- Reject rank-up at 99 training or insufficient AP; accept exactly 100 and higher, spend once, reset counts, and distinguish prototype/final caps.
- Every supported nonterminal rank has at least 100 reachable points. Unknown IDs, unsupported mechanics, invalid rank ranges, and bad recipe/equipment references fail validation.
- Changing selection, cancelling, showing previews, and opening the journal leave resources, RNG, turns, and training unchanged.
- A confirmed skill hit/miss consumes one turn/cost; invalid targets, equipment, cooldowns, and affordability fail before RNG/mutation.
- Active damage/healing, hit/critical sampling, Defend, status timing, wounds, regeneration, and weapon durability preserve current combat fixtures.
- Passives apply once, with action/equipment conditions; broken/exhausted weapons deactivate sword credit; no rank change or save reload refills resources.
- Training distinguishes direct skill damage, passive bonuses, status ticks, resource recovery, and target/encounter scopes. Critical and area outcomes obey existing RNG order.
- Cooldown `1`, self-buff casting ticks, stance consumption/expiry, attacker death during retaliation, and reaction-loop prevention have boundary fixtures before those skills are enabled.

### Persistence and UI

- Migrate version 1–5 saves with the four starter ranks and no double stat bonuses, invented AP, or lost equipment/inventory. Existing pending encounters remain replayable.
- Restarting an unfinished encounter discards its pending training. Committing victory/defeat merges it once; duplicate results and failed save retries cannot double AP, costs, items, or training.
- Loading an older manual slot restores that slot's progression as a whole. Character switching cannot mix ownership, AP, collections, or delayed callbacks.
- Learning, last-page assembly, rank-up, and battle-result failures keep a complete retained candidate and a usable retry flow. Native/web save round trips validate the same payload.
- On iOS, Android, and web, verify compact screens, larger text, safe areas, touch and named targeting, disabled reasons, screen-reader feedback, and web keyboard navigation. Navigation/backgrounding cannot resolve a skill or tick its timers.

Use the existing Vitest engine, data, RPG, battle, and persistence suites; add focused integration fixtures when implementing this plan. This documentation edit does not implement those checks. Required project commands are:

```sh
npm test
npx expo lint
npx tsc --noEmit
```

The repository currently has `package-lock.json` and no `bun.lock`. Use `bunx` if it later adopts Bun. Run lint and typecheck before declaring implementation complete; exercise native persistence and the journal on devices because a web pass alone does not verify them.

## 12. Remaining balance decisions and references

Pilot defaults above settle hero ownership, town-only advancement, F/E scope, encounter-level training retention, starter-save migration, and initial AP sources. Remaining work is balance/content authoring: instructor/lesson fees, manual/page names and guaranteed locations, exact prerequisites, E+ rank tables for other skills, long-term AP pacing, passive caps, and each advanced skill's costs/cooldowns/effects. Quest, life-skill, and deliberate rebirth rules are separate future designs.

Mabinogi supplies the learning/training/AP inspiration and skill identities. The catalog retains source URLs, retrieval dates, rank descriptions, and tables; preserve those references without treating them as game rules. Background: [skill overview](https://wiki.mabinogiworld.com/view/Category:Skills), [AP](https://wiki.mabinogiworld.com/view/Stats#Ability_Points), [book learning example](https://wiki.mabinogiworld.com/view/Icebolt#Obtaining_the_Skill), and [page collection example](https://wiki.mabinogiworld.com/view/Fireball#Obtaining_the_Skill). The earlier September 2026 research is historical reference material, not a fresh mechanics audit.

Expo SDK **57** was checked against `package.json` for this revision. Follow [AGENTS.md](../../AGENTS.md), fetch [matching SDK documentation](https://docs.expo.dev/versions/v57.0.0/) and the [Expo documentation index](https://docs.expo.dev/llms.txt) before implementing framework APIs, and reuse the current [native SQLite adapter](../../src/persistence/createSaveStorage.ts) and [web IndexedDB adapter](../../src/persistence/createSaveStorage.web.ts). Native database guidance: [Expo SQLite SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).

## Implemented enchanting pilot

Enchant is a town-only life skill, learned at F for free from the refuge keeper. Applications and destructive burns at the blacksmith train its authored objectives. F → E needs 100 training and 2 AP; E is the current cap. It never appears as a battle action or trains from combat outcomes. Current saves are version 12 and preserve ranks, capped training, installed equipment values and the separate enchanting RNG. See [Enchants](enchants.md) for acquisition, recipes and protections.
