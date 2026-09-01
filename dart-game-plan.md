# Dart Game Plan

## Overview

The game is a **2D pixel-art RPG dungeon crawler with dice-based combat and gacha mechanics**, built primarily with Flutter.

The recommended stack is:

- **Flutter** for the application shell and UI
- **Flame** for real-time game rendering, sprites, effects, and dungeon scenes
- **Rive** for polished UI animations and gacha/reward sequences
- **Riverpod** for application state and dependency injection
- **Pure Dart domain logic** for combat, dice, progression, dungeon generation, and gacha rules
- **Drift** for local persistence
- **go_router** for navigation
- **in_app_purchase** for store integration
- **Freezed + json_serializable** for immutable models and serialization

The most important architectural principle is:

> **Flame renders the game. Your Dart domain decides what happens in the game.**

Do not make Flame your entire application. Treat Flutter as the app shell and meta-game UI, Flame as the dungeon/combat renderer, and a pure-Dart domain layer as the actual RPG rules.

---

# 1. Recommended Architecture

```text
┌──────────────────────────────────────────────┐
│                 Flutter App                  │
│                                              │
│  Login / Home / Gacha / Shop / Inventory    │
│  Character screens / Settings / Dialogs     │
│                                              │
│       Flutter Widgets + Rive animations      │
└──────────────────────┬───────────────────────┘
                       │
               Riverpod / Controllers
                       │
┌──────────────────────▼───────────────────────┐
│                Application Layer             │
│                                              │
│ CombatController                             │
│ DungeonController                            │
│ GachaController                              │
│ InventoryController                          │
│ ProgressionController                        │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│              Pure Dart Game Domain           │
│                                              │
│ CombatEngine                                 │
│ DiceResolver                                 │
│ StatusEffectSystem                           │
│ DungeonGenerator                             │
│ LootResolver                                 │
│ GachaEngine                                  │
│ ProgressionSystem                            │
│ Economy                                      │
│                                              │
│       NO Flutter / Flame dependencies        │
└───────────────┬────────────────┬─────────────┘
                │                │
        Repositories        Game Events
                │                │
┌───────────────▼──────┐  ┌──────▼─────────────┐
│      Data Layer      │  │       Flame        │
│                      │  │                    │
│ Drift                │  │ Dungeon world      │
│ Secure Storage       │  │ Monsters           │
│ IAP                  │  │ Player             │
│ Future API client    │  │ FX / particles     │
│ Future cloud saves   │  │ Pixel animations   │
└──────────────────────┘  └────────────────────┘
```

---

# 2. Flutter as the Application Shell

The root Flutter application should own overall navigation.

Example:

```text
/app
  splash
  login
  home
  dungeon-selection
  game
  characters
  inventory
  gacha
  shop
  settings
```

Use **go_router**.

Example:

```dart
GoRouter(
  routes: [
    GoRoute(path: '/', builder: ...),
    GoRoute(path: '/login', builder: ...),
    GoRoute(path: '/home', builder: ...),
    GoRoute(path: '/gacha', builder: ...),
    GoRoute(path: '/inventory', builder: ...),
    GoRoute(path: '/dungeon/:id', builder: ...),
  ],
);
```

Do not use Flame routing for navigating between the game's meta screens.

Use Flutter navigation for:

- Login
- Home
- Character screens
- Inventory
- Shop
- Gacha
- Settings
- Dungeon selection

---

# 3. Use Flame Only for Actual Game Scenes

A Flame game could look like:

```text
DungeonGame
│
├── DungeonWorld
│   ├── DungeonMap
│   ├── PlayerComponent
│   ├── MonsterComponent
│   ├── ChestComponent
│   └── EnvironmentComponents
│
├── CameraComponent
│
└── Effects
    ├── DamageNumbers
    ├── AttackAnimation
    ├── Particles
    └── ScreenShake
```

Example:

```dart
class DungeonGame extends FlameGame {
  DungeonGame({
    required this.eventStream,
  });

  final Stream<GameEvent> eventStream;

  @override
  Future<void> onLoad() async {
    // assets
    // world
    // camera
    // game event listener
  }
}
```

Flame components should be presentation objects, not authoritative gameplay objects.

Bad:

```dart
class MonsterComponent {
  int hp = 100;

  void receiveDamage() {
    hp -= Random().nextInt(20);
  }
}
```

Better:

```dart
final result = combatEngine.execute(
  AttackCommand(
    attackerId: player.id,
    defenderId: monster.id,
    dice: dice,
  ),
);
```

The combat engine could emit:

```text
DiceRolled(6)
CriticalTriggered
DamageDealt(monsterId, 24)
StatusApplied(monsterId, poison)
MonsterDefeated(monsterId)
LootDropped(...)
```

Flame receives those events and turns them into animations.

---

# 4. Combat as a Pure Dart State Machine

For a dice-based RPG, model combat as an explicit state machine.

```text
CombatState
├── player
├── enemies
├── dicePool
├── abilities
├── buffs
├── debuffs
├── turn
└── phase
```

Possible phases:

```dart
enum CombatPhase {
  startTurn,
  rolling,
  awaitingPlayerAction,
  resolvingAction,
  enemyTurn,
  victory,
  defeat,
}
```

A core API could look like:

```dart
CombatResult execute(
  CombatState state,
  CombatCommand command,
);
```

Commands:

```text
StartCombat
RollDice
RerollDice
AssignDieToAbility
UseAbility
EndTurn
EnemyAct
```

Events:

```text
TurnStarted
DiceRolled
DieAssigned
AbilityActivated
DamageDealt
HealingApplied
BuffApplied
DebuffApplied
EnemyDefeated
PlayerDefeated
CombatWon
```

Conceptually:

```text
State + Command
       ↓
 Combat Engine
       ↓
New State + Events
```

Benefits:

- Deterministic tests
- Seeded dungeon runs
- Battle replays
- Easier debugging
- Balance simulation
- Easier future server-authoritative logic

---

# 5. Abstract Randomness

Do not scatter `Random()` throughout the codebase.

Create an abstraction:

```dart
abstract interface class RandomSource {
  int nextInt(int max);
  double nextDouble();
}
```

Then inject it:

```dart
class CombatEngine {
  CombatEngine(this.random);

  final RandomSource random;
}
```

Normal game:

```text
RandomSource
    ↓
SeededRandomSource
```

Testing:

```text
FakeRandomSource
→ 6
→ 6
→ 2
→ 5
```

This makes deterministic tests easy.

Example:

```text
given:
 player attack = 10

when:
 dice = 6

expect:
 critical hit
 damage = 20
```

Keep **combat RNG** and **gacha RNG** separate.

Eventually, gacha pulls involving real-money currency should be server-authoritative.

Your client should call:

```dart
GachaRepository.pull(
  bannerId,
  count: 10,
);
```

rather than directly generating rewards.

---

# 6. Riverpod for Application State and Orchestration

Use Riverpod between Flutter, your controllers, and the pure-Dart domain.

```text
Flutter Widget
      │
      ▼
Riverpod Controller
      │
      ▼
Pure Dart Engine
      │
      ▼
Repository
```

Recommended providers/controllers:

```text
combatControllerProvider
inventoryControllerProvider
gachaControllerProvider
profileProvider
settingsProvider
currentRunProvider
```

Avoid one enormous global state object.

Instead separate state:

```text
PlayerProgress
InventoryState
CurrentRunState
CombatState
AccountState
ShopState
GachaState
```

---

# 7. Riverpod vs Flame Responsibilities

## Riverpod should own

```text
player progression
inventory
current dungeon run
combat state
currency
account
gacha pity
quests
settings
save status
```

## Flame should own

```text
sprite positions
animation timers
particles
screen shake
damage text position
temporary visual effects
camera movement
interpolation
```

Do not update Riverpod 60 times per second with Flame presentation state.

For example, these should remain internal to Flame:

```text
monster.x
monster.y
particle.x
particle.y
```

---

# 8. Connect Game Logic to Flame Through Events

Create presentation-oriented game events.

```dart
sealed class GamePresentationEvent {}

class PlayAttackAnimation extends GamePresentationEvent {}

class ShowDamage extends GamePresentationEvent {
  final int amount;
}

class PlayDeathAnimation extends GamePresentationEvent {}
```

Flow:

```text
User taps attack
      ↓
CombatController.attack()
      ↓
CombatEngine.execute()
      ↓
CombatState updated
      ↓
Domain events generated
      ↓
Presentation events generated
      ↓
Flame animations
```

A Flame component should not determine whether something crits.

It should receive something like:

```text
CriticalHitEvent(
    target: goblin,
    damage: 42,
)
```

and make that event look good.

---

# 9. Use Flutter Overlays Heavily

Flutter UI should sit over or around the Flame canvas.

Example:

```text
┌─────────────────────────────┐
│                             │
│          FLAME              │
│                             │
│       Goblin Sprite         │
│                             │
│      attack animations      │
│                             │
├─────────────────────────────┤
│         FLUTTER             │
│                             │
│ 🎲 6   🎲 3   🎲 5   🎲 1 │
│                             │
│ [Attack] [Poison] [Shield]  │
│                             │
└─────────────────────────────┘
```

Flutter is excellent for:

- Drag/drop
- Buttons
- Responsive layouts
- Tooltips
- Scrolling ability lists
- Accessibility
- Inventory grids
- Menus and dialogs

Flame is better for:

- Sprites
- Particles
- World positioning
- Camera movement
- Real-time animation
- Effects

Use each where it is strongest.

---

# 10. Rive Usage

Use Rive selectively.

Do not use it as the primary system for pixel-art characters.

Use Flame sprite animation for:

```text
heroes
monsters
attacks
dungeon objects
pixel VFX
```

Use Rive for:

```text
gacha summon animation
menu transitions
animated buttons
currency counters
rarity reveals
level-up UI
loading animations
special UI effects
```

Recommended rule:

```text
Rive belongs in Flutter UI
    ↓
use package:rive

Rive animation belongs physically in game world
    ↓
use flame_rive
```

Avoid `flame_rive` unless the animation actually needs to exist inside the Flame scene.

---

# 11. Pixel-Art Rendering

Use a fixed-resolution camera.

Example logical sizes:

```text
360 × 640

or

320 × 180
```

Establish a consistent tile size:

```dart
const tileSize = 16.0;
```

or:

```dart
const tileSize = 32.0;
```

Keep game-world art aligned to integer coordinates where possible.

For pixel rendering:

```dart
paint.filterQuality = FilterQuality.none;
```

Avoid arbitrary fractional scaling when possible.

---

# 12. Dungeon Maps

Two approaches are recommended.

## Procedural dungeons

Use your own pure-Dart representation:

```text
Dungeon
├── rooms
├── doors
├── encounters
├── treasure
├── events
└── bossRoom
```

Example:

```dart
class DungeonFloor {
  final List<Room> rooms;
}
```

Generate the dungeon outside Flame, then render it inside Flame.

This is ideal for a roguelike.

## Hand-authored dungeons

Use:

```text
Tiled
+
flame_tiled
```

A hybrid approach is also strong:

```text
Procedural topology
+
Hand-created room templates from Tiled
```

---

# 13. Sprite Atlases

Avoid hundreds of standalone frame files.

Instead of:

```text
goblin_walk_1.png
goblin_walk_2.png
goblin_walk_3.png
...
```

use sprite sheets or atlases.

Possible asset structure:

```text
assets/
├── images/
│   ├── characters/
│   ├── monsters/
│   ├── dungeon/
│   ├── items/
│   └── effects/
│
├── atlases/
│
├── rive/
│   ├── summon.riv
│   ├── level_up.riv
│   └── buttons.riv
│
├── audio/
│   ├── music/
│   └── sfx/
│
├── data/
│   ├── monsters.json
│   ├── items.json
│   ├── abilities.json
│   ├── banners.json
│   └── loot_tables.json
│
└── tiles/
```

Consider `flame_texturepacker` if using TexturePacker atlases.

---

# 14. Make Game Content Data-Driven

Do not hardcode gameplay content into the engine.

Bad:

```dart
final goblin = Monster(
  hp: 100,
  attack: 5,
  poisonResistance: 0.2,
);
```

Prefer data:

```json
{
  "id": "goblin_01",
  "hp": 100,
  "attack": 5,
  "resistances": {
    "poison": 0.2
  }
}
```

Make these data-driven:

```text
heroes
monsters
items
abilities
dice
status effects
loot tables
dungeons
gacha banners
rarity tables
experience curves
```

This makes balancing much easier.

---

# 15. Gacha Architecture

Treat gacha as its own game domain.

```text
GachaBanner
├── bannerId
├── version
├── start/end
├── cost
├── featuredUnits
├── rarityRates
├── pityRules
└── guarantees
```

Repository:

```dart
abstract interface class GachaRepository {
  Future<GachaPullResult> pull({
    required String bannerId,
    required int count,
  });
}
```

Development:

```text
LocalGachaRepository
    ↓
GachaEngine
    ↓
local RNG
```

Production later:

```text
RemoteGachaRepository
    ↓
API
    ↓
server RNG
```

The UI remains unchanged.

Pity system:

```dart
class PityState {
  int pullsSinceLegendary;
  int featuredGuaranteeCounter;
}
```

Version banner configurations:

```text
bannerId = "summer_2026"
version = 3
```

This will help with production auditing and live-service changes.

---

# 16. Persistence: Drift

Use Drift for important local game state.

Recommended packages:

```text
drift
drift_flutter
```

Possible database tables:

```text
player_profile
characters
owned_characters
inventory
currencies
equipment
progression
quests
gacha_pity
completed_dungeons
current_run
save_metadata
```

Benefits:

- Type-safe SQLite
- Migrations
- Transactions
- Reactive queries
- Background isolate support

---

# 17. Current Dungeon Run: Snapshot It

Do not completely normalize an active run into many database tables.

Use a snapshot:

```text
current_run
--------------------------------
run_id
dungeon_id
seed
floor
state_json
schema_version
updated_at
```

`state_json` can contain an immutable `DungeonRunState`.

Recommended persistence strategy:

```text
Permanent account data
    → normalized Drift tables

Active dungeon run
    → versioned snapshot

UI preferences
    → SharedPreferences
```

---

# 18. SharedPreferences Only for Preferences

Use SharedPreferences for:

```text
music enabled
SFX volume
language
haptics
graphics setting
tutorial acknowledged
```

Do not use it for:

```text
premium currency
inventory
character ownership
gacha pity
critical save state
```

Prefer the newer SharedPreferences APIs for new code.

---

# 19. Secure Storage

Use:

```text
flutter_secure_storage
```

for:

```text
auth refresh tokens
device identifiers
session secrets
```

Do not use it as your general game-save database.

Wrap it:

```dart
abstract interface class TokenStorage {
  Future<void> saveToken(String token);
  Future<String?> readToken();
  Future<void> clear();
}
```

---

# 20. Authentication Architecture

Do not couple the rest of the game to Firebase, Supabase, or another auth provider yet.

Define:

```dart
abstract interface class AuthRepository {
  Stream<AuthState> get authState;

  Future<User> signIn(...);

  Future<void> signOut();
}
```

Development implementation:

```text
GuestAuthRepository
```

Future implementations:

```text
FirebaseAuthRepository
SupabaseAuthRepository
CustomAuthRepository
```

Avoid calling provider-specific APIs directly throughout the UI.

---

# 21. Purchases

Use:

```text
in_app_purchase
```

Wrap it:

```dart
abstract interface class PurchaseRepository {
  Stream<PurchaseEvent> get purchaseEvents;

  Future<List<Product>> loadProducts();

  Future<void> purchase(String productId);

  Future<void> restorePurchases();
}
```

Implementation:

```text
InAppPurchaseRepository
        ↓
in_app_purchase
```

Future production flow:

```text
PurchaseRepository
       ↓
purchase initiated
       ↓
Apple / Google
       ↓
purchase token
       ↓
YOUR SERVER
       ↓
verification
       ↓
grant currency
```

Do not directly grant premium currency on the client merely because a local purchase-completed callback fired.

---

# 22. Models: Freezed + JSON Serialization

Recommended:

```text
freezed
freezed_annotation
json_serializable
json_annotation
build_runner
```

Example state:

```dart
@freezed
sealed class CombatState with _$CombatState {
  const factory CombatState({
    required PlayerCombatant player,
    required List<EnemyCombatant> enemies,
    required List<Die> dice,
    required CombatPhase phase,
    required int turn,
  }) = _CombatState;
}
```

Example events:

```dart
@freezed
sealed class CombatEvent with _$CombatEvent {
  const factory CombatEvent.damageDealt(
    String targetId,
    int amount,
  ) = DamageDealt;

  const factory CombatEvent.statusApplied(
    String targetId,
    StatusEffect effect,
  ) = StatusApplied;
}
```

Immutable state makes game logic much easier to reason about and test.

---

# 23. Audio

Use:

```text
flame_audio
```

Wrap it:

```dart
abstract interface class AudioService {
  void playSfx(Sfx sound);
  void playMusic(Music track);
  void stopMusic();
}
```

The domain layer should not directly call Flame audio APIs.

Instead:

```text
DamageDealt
    ↓
presentation layer
    ↓
play sword_hit.wav
```

---

# 24. Recommended Flutter Packages

## Core

| Package | Purpose |
|---|---|
| `flame` | 2D engine |
| `flutter_riverpod` | application state and DI |
| `flame_riverpod` | Flutter/Flame state bridge |
| `go_router` | application navigation |
| `rive` | animated UI |
| `flame_rive` | Rive inside Flame scenes |
| `flame_audio` | music and SFX |
| `drift` | local database |
| `drift_flutter` | Flutter Drift setup |
| `freezed_annotation` | immutable models |
| `json_annotation` | serialization |
| `in_app_purchase` | Apple/Google purchases |
| `flutter_secure_storage` | auth/session secrets |
| `shared_preferences` | user preferences |
| `connectivity_plus` | connectivity hints |
| `uuid` | IDs for runs/events/etc. |

## Development and code generation

```text
build_runner
freezed
json_serializable
riverpod_generator
riverpod_annotation
```

## Optional game packages

```text
flame_tiled
flame_texturepacker
flame_behaviors
```

Do not add everything at once.

`flame_behaviors` can be useful later, but your core gameplay behavior should still live in the pure-Dart domain.

You probably do not need Forge2D/Box2D unless you decide dice or game objects require actual physics.

---

# 25. Suggested Project Structure

```text
lib/
│
├── main.dart
│
├── bootstrap/
│   ├── bootstrap.dart
│   └── providers.dart
│
├── app/
│   ├── app.dart
│   ├── router.dart
│   └── theme/
│
├── core/
│   ├── errors/
│   ├── logging/
│   ├── random/
│   │   ├── random_source.dart
│   │   └── seeded_random_source.dart
│   ├── time/
│   └── utils/
│
├── domain/
│   │
│   ├── combat/
│   │   ├── combat_engine.dart
│   │   ├── combat_state.dart
│   │   ├── commands/
│   │   ├── events/
│   │   ├── dice/
│   │   ├── abilities/
│   │   └── status_effects/
│   │
│   ├── dungeon/
│   │   ├── dungeon.dart
│   │   ├── room.dart
│   │   ├── dungeon_generator.dart
│   │   └── dungeon_run.dart
│   │
│   ├── character/
│   ├── inventory/
│   ├── equipment/
│   ├── progression/
│   ├── economy/
│   │
│   └── gacha/
│       ├── banner.dart
│       ├── pity_state.dart
│       ├── pull_result.dart
│       └── gacha_engine.dart
│
├── application/
│   ├── combat/
│   │   └── combat_controller.dart
│   ├── dungeon/
│   │   └── dungeon_controller.dart
│   ├── inventory/
│   ├── gacha/
│   ├── shop/
│   └── account/
│
├── data/
│   │
│   ├── repositories/
│   │   ├── auth_repository.dart
│   │   ├── save_repository.dart
│   │   ├── purchase_repository.dart
│   │   └── gacha_repository.dart
│   │
│   ├── local/
│   │   ├── database/
│   │   │   ├── app_database.dart
│   │   │   ├── tables/
│   │   │   └── daos/
│   │   └── secure_storage/
│   │
│   ├── platform/
│   │   └── purchases/
│   │
│   └── remote/
│       └── // later
│
├── game/
│   │
│   ├── dungeon_game.dart
│   ├── world/
│   │   └── dungeon_world.dart
│   ├── components/
│   │   ├── player_component.dart
│   │   ├── monster_component.dart
│   │   └── dungeon_component.dart
│   ├── effects/
│   ├── animations/
│   └── bridge/
│       └── game_event_bridge.dart
│
└── presentation/
    │
    ├── home/
    ├── combat/
    ├── inventory/
    ├── characters/
    ├── gacha/
    ├── shop/
    ├── settings/
    └── widgets/
```

Do not create every folder on day one. Add features as they become necessary.

---

# 26. Typical Combat Interaction

```text
Player drags 🎲6 onto "Power Slash"
                 │
                 ▼
         Flutter Combat UI
                 │
                 ▼
        CombatController
                 │
                 ▼
        UseAbilityCommand
                 │
                 ▼
           CombatEngine
                 │
           ┌─────┴──────┐
           ▼            ▼
     CombatState      Events
       updated           │
                         │
               DamageDealt(32)
               CriticalHit
                         │
                         ▼
                  Flame bridge
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        sword sprite   shake     "32!"
        animation      camera    damage text
```

This separation keeps gameplay deterministic and presentation flexible.

---

# 27. Typical Gacha Interaction

```text
Summon x10
    │
    ▼
GachaController
    │
    ▼
GachaRepository.pull()
    │
    ├── Local implementation now
    │
    └── Server implementation later
             │
             ▼
        PullResult[]
             │
    ┌────────┴────────┐
    ▼                 ▼
Inventory         Rive reveal
updated           animation
```

This allows you to switch from client-side prototype RNG to server-authoritative production pulls later without rebuilding the UI.

---

# 28. Testing Strategy

Recommended structure:

```text
test/
├── domain/
│   ├── dice/
│   ├── combat/
│   ├── status_effects/
│   ├── loot/
│   ├── dungeon_generation/
│   └── gacha/
│
├── application/
│
├── data/
│
└── presentation/
```

Important tests:

```text
rolling two sixes triggers critical
poison ticks at beginning of turn
shield absorbs damage before HP
enemy dies when HP <= 0
pity triggers at pull 80
featured guarantee resets correctly
loot table never produces invalid item
same dungeon seed produces same dungeon
saving/loading preserves current run
```

Useful testing packages later:

```text
fake_async
clock
alchemist
patrol
```

---

# 29. Recommended First Prototype Dependencies

Start smaller.

```text
flutter
flame
flutter_riverpod
flame_riverpod
rive
flame_audio

freezed_annotation
json_annotation

drift
drift_flutter
shared_preferences

go_router
```

Development:

```text
build_runner
freezed
json_serializable
riverpod_generator
```

Add these when needed:

```text
in_app_purchase
flutter_secure_storage
connectivity_plus
flame_rive
flame_tiled
```

---

# 30. Final Recommended Stack

## Flutter

Use for:

- Application shell
- Navigation
- Menus
- Combat controls
- Inventory
- Character management
- Gacha
- Shop
- Settings

## Rive

Use for:

- Polished UI animations
- Gacha summon sequences
- Reward reveals
- Level-up animations
- Animated buttons and transitions

## Flame

Use for:

- Dungeon rendering
- Characters
- Monsters
- Sprite animation
- Camera
- Particles
- Damage numbers
- Combat VFX

## Riverpod

Use for:

- Application orchestration
- Shared state
- Dependency injection
- Controllers

## Pure Dart Domain

Use for:

- Dice mechanics
- Combat rules
- Abilities
- Status effects
- Dungeon generation
- Progression
- Loot
- Economy
- Gacha rules

## Freezed

Use for:

- Immutable states
- Domain events
- Data models
- Copy/equality support

## Drift

Use for:

- Local-first persistence
- Player progression
- Inventory
- Characters
- Gacha pity
- Dungeon run snapshots

## go_router

Use for:

- Application-level navigation
- Deep links
- Route guards
- Screen structure

## in_app_purchase

Use for:

- App Store purchases
- Google Play purchases

Always wrap it behind your own repository interface.

---

# 31. Overall System

```text
      Flutter             Flame
         │                  │
         └──────┬───────────┘
                ▼
          Application
             Layer
                │
                ▼
        PURE DART DOMAIN
                │
                ▼
          Repositories
                │
      ┌─────────┴──────────┐
      ▼                    ▼
  Local storage        Server later
```

This architecture gives you a Flutter-native implementation now while leaving a clean path for future:

- Authentication
- Cloud saves
- Server-authoritative gacha
- Purchase validation
- Live events
- Account progression
- Cross-device synchronization
- Analytics
- Remote configuration
- Multiplayer or social features

without requiring a rewrite of your core game logic.
