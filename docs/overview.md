# Rebirth Dungeon

**Explore dungeons, turn five dice into a chosen skill, and build mastery that lasts across lives.**

Rebirth Dungeon is a single-player, offline-first **2D pixel-art RPG built with Godot 4.7 and GDScript**. Explore freely, enter a separate turn-based battle scene, and invest earned progress in a hero whose skills survive rebirth. Desktop is the first development target; landscape Android and iOS releases follow verified exports and device testing.

Documentation reset: **2026-09-10**. The repository now contains the application foundations and authored continuous exploration. See [project phases](project-phases.md) for current completion and remaining combat, progression and persistence work. Features and balance values below describe the intended game, not completed work.

## Design pillars

| Pillar | Player experience |
| --- | --- |
| Persistent mastery | A new life retains learned skills, ranks, training and unspent AP. |
| Flexible specialization | Talents encourage a focus while allowing other disciplines. |
| Tactical dice decisions | Choose a skill first, then decide which faces to keep or reroll. |
| Purposeful exploration | Discover rooms, encounters, equipment, book pages and quest evidence. |
| Deliberate preparation | Equipment, supplies, enchants and selected titles shape the next run. |
| Trustworthy progress | Resuming preserves the hand and earned state; retries grant nothing twice. |

Mabinogi inspires progression, skill learning, talents, towns and rebirth. Dicero inspires accessible dice-driven battles. The exact five-dice rules and numerical proposals are Rebirth Dungeon's own design; the references are not a requirement to reproduce either game. See [reference research](references.md).

## Core loop

1. Prepare in a walkable town: recover, buy supplies, choose equipment and review skills/quests.
2. Enter a dungeon with a snapshot of the hero's loadout and eligible progression goals.
3. Move continuously through discovered rooms. Enter a separate battle when an encounter triggers.
4. Win the encounter and return to the saved exploration location. Clear required encounters to unlock the exit.
5. Resolve the expedition once, retaining or discarding pending rewards under its outcome policy.
6. Spend AP on trained skills, learn from lessons/books/pages, improve equipment and advance the story.
7. Rebirth when eligible to begin a new life with accumulated mastery.

An activation, encounter, expedition and life are different units. Closing the app, losing a battle or leaving a dungeon never implicitly triggers rebirth. [Free exploration](free-exploration.md) defines the first loop and temporary economy; full inventory and progression extend it later.

## Five-dice battles

Choose a learned active skill and legal encounter target before rolling **five d6**. The first roll locks the skill, rank, target, effective stats, face weights and resource cost. Keep useful faces and reroll a nonempty subset up to twice. Commit the whole hand to one skill, using its pip total and one combination multiplier.

Skills consume stamina, mana, HP or an authored combination; HP payment must leave at least 1 HP. AP buys progression and is never an attack resource. Passing before rolling has no skill cost. Passing afterward discards the hand and pays its reserved cost. Potions are separate full actions before rolling. Menus, movement and animations never advance battle turns.

Eight combinations run from no combination through pair, two pairs, three of a kind, straight, full house, four of a kind and five of a kind. Rank may improve authored effect values or visible face probabilities. [Battle](gameplay/battle.md) owns scoring; [Stats](gameplay/stats.md) owns cost and effect calculation; [starter combat](phase4-combat.md) supplies provisional values.

## Growth across lives

Skills come from NPC instruction, complete books or assembled page collections. Learning grants Rank F with zero training. Rank-up requires **at least 100 training points plus the authored AP cost**, followed by an explicit town action. The rank sequence is `F → E → D → C → B → A → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1`; excess training does not carry over after advancement.

Rebirth proposes resetting level to 1, XP to 0 and current-life growth while retaining skills, ranks, training, unspent AP, talent mastery, committed possessions and achievements. Choose an allowed age and talent. Rebirth does not refund spent AP or grant level-up rewards by itself. The proposed level cap of 200, 1 AP per earned level and seven-day aging cadence remain balance choices. Eligibility, cost, cooldown and clock policy must be settled before implementation. [Character](gameplay/character.md), [Skills](gameplay/skills.md).

## Equipment, discovery and story

- Inventory uses a proposed 6 × 10 backpack, rectangular item footprints, stacks and non-nesting bags. Committed rewards that cannot fit enter saved, withdraw-only overflow. This inventory grid is independent of continuous world movement.
- Equipment, skill passives, talents, enchants and equipped titles feed one stat calculation. Increasing resource maxima never refills current pools.
- Enchanting is town-only, with prefix/suffix slots, protected equipment on initial application failure, and a separate destructive burning action.
- Quests use Chapters and Generations alongside NPC and Skill Quests. Later role-playing missions use isolated NPC characters without exporting borrowed gear.
- Titles form a persistent collection. One First and one Second Title provide selected effects; talent display is cosmetic.

The first slice uses a small potion supply and one gold balance. Full bags, banking, crafting, extensive skill catalogs, advanced combat and expanded towns follow the proven loop. Authentication, cloud synchronization, gacha and purchases remain deferred product choices.

## Documentation ownership

[Game Plan](game-plan.md) defines Godot architecture and save boundaries. [Directory](directory.md) indexes the docs and proposed project layout. [Project Phases](project-phases.md) is the sole completion tracker. [Audit](audit.md) records the reset and unresolved design decisions. Gameplay documents own detailed rules; Godot integration sections describe how to implement them without changing their core progression contracts.
