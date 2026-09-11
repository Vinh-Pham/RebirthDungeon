# Godot Plugin Recommendations for a Mabinogi-Inspired RPG with Dicero-Style Combat

## Project Direction

The game concept combines:

- **Mabinogi-inspired RPG systems**
  - Quests
  - Inventory and equipment
  - NPC interactions
  - Life skills
  - Character progression
  - Social systems
- **Dicero-style combat**
  - Dice-triggered abilities
  - Skill combinations
  - Build crafting
  - Equipment that modifies available combat outcomes

The strongest approach is to use focused Godot plugins for supporting systems while keeping the core combat, dice, stats, and progression systems custom.

---

## Recommended Plugins

| Plugin | Recommended Use | Priority |
|---|---|---|
| **Godot State Charts** | Player/combat states, skill execution, stun/cast/recovery states | ★★★★★ |
| **LimboAI** | Enemy and NPC combat AI | ★★★★★ |
| **Inventory System (ExpressoBits)** | Items, equipment, consumables, loot | ★★★★★ |
| **QuestSystem 2** | Quests, objectives, progression | ★★★★☆ |
| **Dialogic 2** | NPC conversations and story dialogue | ★★★★☆ |
| **Phantom Camera** | RPG exploration and combat cameras | ★★★★☆ |
| **G.U.I.D.E.** | Controller support, rebinding, button prompts | ★★★★☆ |
| **netfox** | Real-time multiplayer synchronization | ★★★★☆ if multiplayer |
| **Nakama** | Accounts, chat, social features, matchmaking | ★★★★☆ if online RPG |
| **GodotSteam** | Steam lobbies, achievements, Steam integration | ★★★☆☆ if releasing on Steam |

---

## 1. Godot State Charts

**Best use:** Player state management and combat flow.

Instead of managing many booleans such as:

```gdscript
is_attacking
is_rolling
is_stunned
is_casting
is_waiting_for_dice
```

represent combat with clear states:

```text
Combat
├── Waiting
├── RollingDice
├── ChoosingSkill
├── ExecutingSkill
│   ├── Windup
│   ├── Active
│   └── Recovery
├── Hitstun
└── Dead
```

This is especially useful for:

- Dice rolls
- Skill selection
- Attack windups
- Recovery frames
- Stuns
- Interrupts
- Cast times
- Death states

Recommended division:

```text
Player
└── Godot State Charts

Enemies
└── LimboAI
```

Asset Library:

https://godotengine.org/asset-library/asset/1778

---

## 2. LimboAI

**Best use:** Enemy and NPC AI.

LimboAI combines:

- Behavior trees
- State machines
- Visual editing
- Debugging tools
- Custom GDScript tasks

Example enemy structure:

```text
Goblin
├── IsDead?
├── HasTarget?
│
├── InAttackRange?
│   ├── ChooseAbility
│   ├── Telegraph
│   └── Attack
│
├── TargetVisible?
│   └── Chase
│
└── Patrol
```

This is useful when enemies need to react to the player's dice rolls, active skills, positioning, or build.

Repository:

https://github.com/limbonaut/limboai

---

## 3. Inventory System by ExpressoBits

**Best use:** Items, equipment, consumables, crafting materials, and loot.

Useful item categories:

```text
Weapons
Armor
Food
Potions
Crafting materials
Quest items
Skill books
Dice modifiers
Enchantments
Equipment
```

A custom equipment resource might look like:

```gdscript
class_name EquipmentItem
extends Item

@export var strength := 0
@export var defense := 0
@export var skill_tags: Array[StringName]
@export var dice_bonus := 0
```

Why it fits:

- Modular
- Resource-based
- Inventory logic separated from UI
- Extensible for equipment and RPG systems
- Suitable for multiplayer-oriented projects

Asset Library:

https://godotengine.org/asset-library/asset/1650

An alternative worth investigating is **Modular Inventory** if you specifically want:

- Drag-and-drop
- Hotbars
- Item stacking
- Slot restrictions
- Dropping items into a 3D world

---

## 4. QuestSystem 2

**Best use:** Mabinogi-style quests and progression.

Possible quest objectives:

```text
Talk to an NPC
Kill 5 wolves
Gather 10 herbs
Craft an item
Reach a skill rank
Use a specific skill
Complete a dungeon
Deliver an item
Win a battle under certain conditions
```

Possible custom objective classes:

```text
KillObjective
CollectObjective
TalkObjective
CraftObjective
SkillRankObjective
ExploreObjective
DiceRollObjective
RelationshipObjective
```

The ability to create custom objectives is particularly useful for unusual systems such as dice-based combat or life-skill progression.

Asset Library:

https://godotengine.org/asset-library/asset/3809

---

## 5. Dialogic 2

**Best use:** NPC dialogue, quests, story conversations, and branching choices.

Good uses include:

```text
NPC conversations
Branching choices
Relationship dialogue
Quest conversations
Character portraits
Story scenes
Shopkeeper conversations
Tutorial dialogue
```

One caution: Dialogic 2 has historically had breaking changes between releases. For a production project, pin a version that works for your game instead of automatically upgrading.

Repository:

https://github.com/dialogic-godot/dialogic

---

## 6. Phantom Camera

**Best use:** Exploration, combat, lock-on, boss, and dialogue cameras.

Possible camera states:

```text
ExplorationCamera

CombatCamera
    ↓ enemy selected

LockOnCamera
    ↓ boss starts

BossCamera

DialogueCamera
```

Useful features:

- Smooth player following
- Target tracking
- Camera transitions
- Combat cameras
- Boss cameras
- Camera zones
- Dialogue cameras
- Multi-target framing

Repository:

https://github.com/ramokz/phantom-camera

Asset Library:

https://godotengine.org/asset-library/asset/1822

---

## 7. G.U.I.D.E.

**Best use:** Input management and controller support.

Useful features include:

- Runtime rebinding
- Input contexts
- Controller support
- Input combinations
- Keyboard/controller prompt switching

Example input contexts:

```text
Exploration
WASD     Movement
E        Interact

Combat
1-6      Dice abilities
Space    Dodge
Q        Lock target
R        Reroll

Menu
WASD     Navigate
E        Accept
Esc      Back
```

UI prompts can then change automatically depending on the player's input device.

Example:

```text
[E] Interact
```

could become:

```text
[X] Interact
```

when using a controller.

Asset Library:

https://godotengine.org/asset-library/asset/3503

---

# Custom Dicero-Style Combat System

The core dice and combat system should probably **not** come from a plugin.

This is likely to be one of the systems that gives the game its identity.

A data-driven approach using Godot `Resource`s would work well.

Example:

```text
AbilityResource
├── name
├── icon
├── dice_faces
├── damage
├── damage_type
├── cooldown
├── mana_cost
├── targeting_type
├── tags[]
├── effects[]
└── animation
```

Possible flow:

```text
Dice
 ↓
DiceRoller
 ↓
RollResult
 ↓
SkillResolver
 ↓
AbilityResource
 ↓
EffectPipeline
 ↓
Target
```

Example dice setup:

```text
Roll 1
    Basic Slash

Roll 2
    Heavy Slash

Roll 3
    Firebolt

Roll 4
    Heal

Roll 5
    Multi-hit

Roll 6
    Ultimate
```

Equipment could modify those faces.

Example:

```text
Fire Wand

Before:
1 Slash
2 Slash
3 Firebolt
4 Heal
5 Multi
6 Ultimate

After:
1 Firebolt
2 Firebolt
3 Flame Wave
4 Heal
5 Meteor Fragment
6 Meteor
```

This combines traditional RPG equipment progression with Dicero-style combat build crafting.

---

# Mabinogi-Style Life Skills

The life-skill system should also likely be custom and data-driven.

Possible skill categories:

```text
SkillResource
├── Combat
│   ├── Sword Mastery
│   ├── Defense
│   └── Magic
│
├── Gathering
│   ├── Mining
│   ├── Herbalism
│   └── Logging
│
├── Production
│   ├── Blacksmithing
│   ├── Cooking
│   ├── Tailoring
│   └── Alchemy
│
└── Social
    ├── Trading
    └── Music
```

Character skill progression could store:

```text
SkillProgress
├── rank
├── xp
└── mastery
```

This supports the Mabinogi-like idea that the player's character develops according to what they spend time doing instead of being permanently locked into a single class.

---

# Multiplayer Plugins

If multiplayer is planned, consider these after the single-player combat loop is stable.

## netfox

**Best use:** Real-time combat networking.

Potential uses:

- Network synchronization
- Interpolation
- Client-side prediction
- Rollback-oriented synchronization
- Lag compensation

Asset Library:

https://godotengine.org/asset-library/asset/2375

---

## Nakama

**Best use:** Broader online-RPG infrastructure.

Potential uses:

- User accounts
- Chat
- Matchmaking
- Social systems
- Multiplayer APIs
- Server-backed player data

Asset Library:

https://godotengine.org/asset-library/asset/1642

---

## GodotSteam

**Best use:** Steam integration.

Potential uses:

- Steam lobbies
- Achievements
- Friends
- Steamworks integration
- Platform services

Asset Library:

https://godotengine.org/asset-library/asset/2445

---

# Recommended Initial Stack

```text
Godot 4.x

Player/combat states
└── Godot State Charts

Enemy AI
└── LimboAI

Dialogue/NPCs
└── Dialogic

Quests
└── QuestSystem 2

Items/equipment
└── ExpressoBits Inventory System

Camera
└── Phantom Camera

Input
└── G.U.I.D.E.

CUSTOM GAME CODE
├── Dice system
├── Ability system
├── Stats
├── Damage formulas
├── Life skills
├── Character progression
└── Combat resolver

LATER, if multiplayer
├── netfox
├── Nakama
└── GodotSteam
```

---

# Recommended Architecture

The most important design decision is to keep the game's defining systems under your control.

Use plugins for infrastructure:

```text
Plugins
├── Inventory
├── Quest tracking
├── Dialogue
├── AI
├── Cameras
├── Input
└── Networking
```

Keep these custom:

```text
Your Game
├── Dice mechanics
├── Combat resolver
├── Ability system
├── Character stats
├── Damage formulas
├── Life skills
├── Equipment interactions
└── Character progression
```

This avoids locking the project into a generic RPG framework and makes it much easier to combine:

- Mabinogi-style character progression
- Life skills
- Exploration
- NPC/social gameplay
- Dicero-style dice rolls
- Ability combinations
- Equipment-driven combat builds
