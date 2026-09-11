# Rebirth Dungeon

> **Active migration (2026-09-10):** [Free exploration and separate battles](free-exploration.md) supersedes the grid-world, shared dungeon/battle screen, spatial combat, and legacy-save contracts below. Earlier phase evidence is retained as history.

> **Explore dungeons, turn five dice into a chosen skill, and build mastery that lasts across lives.**

Rebirth Dungeon is a **2D pixel-art, turn-based dungeon-crawling RPG** combining **Mabinogi-inspired character development** with **Dicero-inspired dice battles**. Players prepare a hero in town, explore grid-based dungeons, collect equipment and skill books, train abilities through use, and spend Ability Points to advance them. Rebirth starts a new life without erasing the hero’s accumulated mastery.

The central fantasy is not simply finding a stronger weapon: it is becoming a more capable adventurer through several lives, discovering new disciplines, and bringing that knowledge back into the dungeon.

**Design synthesis updated:** September 7, 2026. This overview summarizes the existing specifications; proposed values are not final balance or implemented features. See [[Rebirth Dungeon/Reference Research|reference research]] and [[Rebirth Dungeon/Documentation Audit|the review of all 10 project docs]].

## 1. Identity and design pillars

| Pillar                  | Player experience                                                                                           |
|-------------------------|-------------------------------------------------------------------------------------------------------------|
| Persistent mastery      | Skills and invested progression make each new life different from a fresh character.                        |
| Flexible specialization | Talents encourage a focus without forbidding other skills; equipment and learned abilities shape a build.   |
| Tactical dice decisions | Choose the right skill, then decide which dice to keep and which to risk rerolling.                         |
| Purposeful exploration  | Dungeons provide encounters, loot, missing book pages, quest evidence, and reasons to return.               |
| Deliberate preparation  | Equipment, supplies, enchants, and selected titles matter before entering a run.                            |
| Trustworthy progression | Resuming a game preserves the same hand and earned state; animations and retries never grant extra rewards. |

**Format:** single-player, offline-first play; cardinal grid movement, fog of war, and command-driven turns. Desktop is the primary development target, with Android and iOS delivery planned. The initial presentation uses landscape layouts and 16-pixel art tiles.

## 2. What the reference games contribute

### Mabinogi: the progression foundation

Mabinogi’s official guides describe rebirth retaining skills, talent ranks, AP, and skill-earned stats while resetting level and age. Talents provide specialization benefits without preventing players from learning other disciplines. These are the foundation for Rebirth Dungeon’s **temporary life growth + lasting skill mastery** model. [Nexon Beginner’s Guide](https://www.nexon.com/mabinogi/guide/beginnersGuide), [Nexon Talent Guide](https://www.nexon.com/mabinogi/guide/talents).

Practice and AP should serve meaningful choices, not repetitive chores. Nexon’s NEXT update reduced training requirements and removed several failure- and enemy-power-based training restrictions. Rebirth Dungeon should similarly favor achievable, outcome-based objectives over farming empty actions. This is a design recommendation, not adoption of Mabinogi’s automatic advancement or training shortcuts. [Nexon NEXT update](https://www.nexon.com/mabinogi/news/20062/next-new-beast-update).

The existing specs also adapt books and page collections, inventory bags, prefix/suffix enchants, titles, and Chapter/Generation quests. They do **not** require an MMO, multiplayer economy, full life simulation, or Mabinogi’s exact numerical tables.

### Dicero: the battle inspiration

Habby describes Dicero as a dice-driven roguelite with skills, equipment, and combinations that vary across runs. Its official store description establishes the broad inspiration, not a complete battle formula. [Habby’s Dicero listing](https://play.google.com/store/apps/details?id=com.bailing.lark.roll.dev&hl=en_US).

Rebirth Dungeon’s existing battle research uses gameplay coverage and community material for keep/reroll and poker-like combinations, with conflicting reports about roll allowance. **Exactly five dice, skill-before-roll selection, two proposed rerolls, resource payment, and the damage formula are explicit Rebirth Dungeon rules—not claims of an exact Dicero clone.** See [[gameplay/battle|battle rules and source qualifications]]. Random in-run skill drafts and dice-attached effects remain deferred.

## 3. The core gameplay loop

1. **Prepare in town.** Choose equipment, pack supplies, accept quests, review training goals, and select earned titles. Learn or rank skills when eligible.
2. **Enter a dungeon.** Start a run with a snapshot of the hero’s progression, loadout, and eligible quest stages.
3. **Explore and fight.** Move through rooms, manage resources, resolve five-dice encounters, and choose which loot fits in the inventory.
4. **Resolve the expedition.** Apply the run’s victory, defeat, or abandonment policy to supplies, loot, XP, skill training, and quest/title evidence.
5. **Invest in progress.** Claim rewards, read or assemble books, spend AP on trained skills, improve equipment, and advance the story.
6. **Rebirth when eligible.** Begin another life with retained mastery, a reset level and age, and a chosen talent. Repeat leveling with a broader set of tools.

**A turn, an encounter, a dungeon run, and a life are different units.** One life can contain many runs. Defeat, finishing a dungeon, and closing the app do not automatically trigger rebirth. Exact defeat/abandonment retention and rebirth eligibility remain unresolved.

Details: [[/gameplay/towns|Towns]].

## 4. Five-dice battles

```text
Inspect enemy → Choose skill and target → Roll five d6
    → Keep useful dice / reroll a subset (up to twice)
    → Commit the whole hand → Resolve skill → Next actor
```

- Select a learned, usable **active skill before rolling**. The first roll locks its rank, target, effective stats, resource cost, and face probabilities.
- All five dice power **one skill action**. They are not five attacks or individually allocated ability resources.
- Keep any useful faces and reroll a nonempty subset. A reroll costs one allowance regardless of the number of dice replaced; replacement results must be accepted.
- The final hand contributes its **pip total** and **one combination**: no combination, pair, two pairs, three of a kind, straight, full house, four of a kind, or five of a kind.
- Rank can improve a skill’s base effect and, when authored, its face probabilities. Weighted dice still have faces 1–6; their odds must be visible.
- Every activated skill costs stamina, mana, HP, or an authored combination. **AP is for progression, not attacking.** Costs are reserved on the first roll and paid once on commitment; HP payment must leave at least 1 HP.
- Passing before rolling costs a turn but no skill resources. Passing after rolling discards the hand and pays the reserved cost. There is no free cancellation to fish for better rolls.
- Enemies do not act during inspection or rerolls. Potions, when enabled, are separate full actions before rolling. Loading resumes the same hand and remaining budget.

The starter damage model combines skill base power, allowed attack scaling, and pips; subtracts flat defense; applies the hand multiplier; then applies percentage protection and shields. Detailed formulas and provisional multipliers belong in [[/gameplay/battle|Battle]], not in this overview.

Start with a sword attack and an authored defensive option. Smash and equipment masteries expand that foundation; Counterattack, Windmill, Charge, and criticals require later reaction, area, movement, and RNG rules.

## 5. Character growth across lives

| Layer                                  | Progression                                                         | Rebirth behavior in the current proposal                   |
|----------------------------------------|---------------------------------------------------------------------|------------------------------------------------------------|
| Current life                           | Character XP, current level, level/age-derived growth               | Reset level to 1, XP to 0, and replace current-life growth |
| Age and active talent                  | Age advances over time; talent shapes growth                        | Choose an allowed starting age and talent                  |
| Lifetime record                        | Cumulative level                                                    | Preserve; the rebirth reset itself grants no level         |
| Skill mastery                          | Learned skills, ranks, training, unspent AP                         | Preserve                                                   |
| Talent mastery                         | Derived from associated skill ranks, including inactive talents     | Preserve; no second AP payment                             |
| Committed possessions and achievements | Inventory, installed enchants, page progress, quests, earned titles | Preserve; recheck equipment and effect eligibility         |

Skills are acquired through **NPC instruction, complete books, or assembled page collections**. Learning grants Rank F with zero training. Advancement requires **at least 100 training points at the current rank plus the required AP**, followed by an explicit Rank Up action in town.

The rank order is `F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1`. Advancement resets that rank’s training; excess points do not carry over. Passive skills train through qualifying outcomes rather than a Use button.

The character spec proposes a current-level cap of 200, 1 AP per earned level, and an offline-friendly age-up every seven elapsed days, reconciled outside active dungeon play. These are **provisional economy and timing choices**, not a promise of final pacing. Rebirth does not refund spent AP or grant free level-up AP.

Details: [[/gameplay/skills|Skills]], [[/gameplay/character|Character]], and [[/gameplay/stats|Stats]].

## 6. Equipment, discovery, and story

- **Inventory:** a proposed 6 × 10 backpack with rectangular item sizes, stacks, and non-nesting bags. Equipment occupies dedicated slots. Full world pickups stay unclaimed; committed rewards that do not fit enter saved, withdraw-only overflow without an expiry timer.
- **Builds:** weapons, armor, skill passives, talents, and equipped titles contribute through a shared stat model. Increasing a resource maximum does not refill it.
- **Enchanting:** town-only application supports one prefix and one suffix per eligible item. Initial application failure spends materials and mana but preserves equipment. Burning is a separate destructive attempt to recover scrolls.
- **Quests:** mainstream stories use Chapters and Generations; NPC and Skill Quests provide instruction and progression goals. Role-playing missions later let players control an isolated NPC template without transferring borrowed gear or skills to the hero.
- **Titles:** achievements unlock a persistent collection. One First and one Second Title can provide selected bonuses and penalties; talent display is cosmetic. Owning many titles does not stack all their effects.

Details: [[/gameplay/inventory|Inventory]], [[/gameplay/enchants|Enchants]], [[/gameplay/quests|Quests]], and [[/gameplay/titles|Titles]].

## 7. Scope and current status

The first priority is a compelling **offline dungeon → training/AP → stronger next run** loop. Rebirth is essential to the long-term identity, but its eligibility and economy must be defined before implementation. Full skill catalogs, extensive crafting, Grandmaster/Dan progression, vanity titles, multiplayer features, and monetization are not prerequisites for proving the core game.

The tracker records Phases 0–1 complete and **Phase 2—validated content and deterministic RNG—as next**. September 6 work notes record a Kotlin/KTX migration, superseding older Java-only descriptions. This review did not inspect implementation code or rerun builds; older simulator evidence does not verify the latest dependency set.

The longer roadmap retains gacha, authentication, cloud synchronization, and purchases as later service work, not dependencies of offline combat or progression.

**Decisions to settle next:** resource recovery and exhaustion, starter combat values, run-loss rules, XP/AP/training pacing, rebirth eligibility/cost/cooldown, and an aging clock policy. See [[Rebirth Dungeon/Documentation Audit|the audit and prioritized recommendations]].

**Documentation roles:** this note owns the high-level vision; gameplay specs own detailed rules; [[/game-plan|Game Plan]] owns architecture; [[/project-phases|Project Phases]] records implementation status and evidence. Where those documents disagree, the audit flags the conflict rather than silently treating it as resolved.
