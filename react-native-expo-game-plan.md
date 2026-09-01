# React Native + Expo Game Plan

## Overview

The game is a **2D pixel-art RPG dungeon crawler with dice-based combat and gacha mechanics**, built with React Native and Expo.

This is a good fit for React Native because the game is driven mainly by turns, commands, menus, progression, and deterministic rules—not continuous physics or twitch-heavy action. The design should use React Native for the app and controls, Skia for the rendered game world, Reanimated for per-frame presentation work, and pure TypeScript for the actual game rules.

The recommended stack is:

- **Expo SDK 57 + React Native + TypeScript** for the application shell
- **Expo Router** for file-based navigation and deep links
- **React Native Skia** for dungeon, sprite, particle, and combat rendering
- **React Native Reanimated** for the visual frame loop and UI-thread animation values
- **React Native Gesture Handler** for gestures and drag/drop interaction
- **Zustand** for application state, controllers, and dependency wiring
- **Pure TypeScript domain logic** for combat, dice, progression, dungeon generation, loot, economy, and gacha rules
- **Expo SQLite + Drizzle ORM** for local persistence and migrations
- **Zod** for validating JSON, save files, and API responses at trust boundaries
- **Rive React Native** for polished gacha, reward, and menu animations
- **Expo Audio** for music and sound effects
- **Expo SecureStore** for authentication and session secrets
- **Expo Haptics** for tactile feedback
- **RevenueCat (`react-native-purchases`) or `expo-iap`** for store integration
- **EAS Development Builds, Build, Update, and Submit** for native development and delivery

The most important architectural principle is:

> **Skia renders the game. The TypeScript domain decides what happens in the game.**

Do not turn React components, Zustand, Skia, or Reanimated into the source of truth for gameplay. React Native is the app shell and meta-game UI. Skia and Reanimated own visual presentation. The pure TypeScript domain owns the RPG rules.

---

# 1. Recommended Architecture

```text
┌──────────────────────────────────────────────┐
│          React Native / Expo App             │
│                                              │
│ Login / Home / Gacha / Shop / Inventory     │
│ Characters / Settings / Dialogs / HUD       │
│                                              │
│ React Native + Reanimated + Rive             │
└──────────────────────┬───────────────────────┘
                       │
                Zustand / Controllers
                       │
┌──────────────────────▼───────────────────────┐
│              Application Layer               │
│                                              │
│ CombatController                             │
│ DungeonController                            │
│ GachaController                              │
│ InventoryController                          │
│ ProgressionController                        │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│          Pure TypeScript Game Domain         │
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
│ NO React / React Native / Expo / Skia deps   │
└───────────────┬────────────────┬─────────────┘
                │                │
        Repositories        Domain Events
                │                │
┌───────────────▼──────┐  ┌──────▼─────────────┐
│      Data Layer      │  │  Presentation      │
│                      │  │  Bridge            │
│ Expo SQLite          │  │                    │
│ Drizzle ORM          │  │ Skia canvas        │
│ SecureStore          │  │ Shared values      │
│ IAP / future API     │  │ Audio / haptics    │
└──────────────────────┘  └────────────────────┘
```

Dependency direction should point inward:

```text
presentation ─┐
game renderer ├─→ application ─→ domain
data          ┘
```

The domain may define repository interfaces, but it must not import their SQLite, HTTP, Expo, or store-specific implementations.

---

# 2. Expo as the Application Shell

Use **Expo Router** for application navigation. Let files in `app/` define routes and keep feature implementation in `src/`.

```text
app/
├── _layout.tsx
├── index.tsx
├── login.tsx
│
├── (main)/
│   ├── _layout.tsx
│   ├── home.tsx
│   ├── characters.tsx
│   ├── inventory.tsx
│   ├── gacha.tsx
│   ├── shop.tsx
│   └── settings.tsx
│
└── dungeon/
    └── [id].tsx
```

Use Expo Router for:

- Login and account flows
- Home and dungeon selection
- Character and equipment screens
- Inventory and shop
- Gacha banners and history
- Settings
- Deep links and route guards

Do not build a second navigation system inside the Skia canvas. The canvas is a view within the dungeon route, not the application router.

Example route:

```tsx
// app/dungeon/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { DungeonScreen } from '@/presentation/dungeon/dungeon-screen';

export default function DungeonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DungeonScreen dungeonId={id} />;
}
```

Use route groups and layouts for authenticated areas, tab navigation, and modal screens. Keep route files thin.

---

# 3. Use Skia Only for Rendered Game Scenes

React Native Skia is a high-performance renderer, not a full game engine. It does not replace every Flame feature automatically. Build a small, purpose-specific presentation layer instead of a general engine.

```text
GameCanvas
│
├── DungeonLayer
│   ├── TileAtlas
│   ├── PropsLayer
│   └── EncounterMarkers
│
├── ActorLayer
│   ├── PlayerSprite
│   └── MonsterSprites
│
├── EffectsLayer
│   ├── AttackEffects
│   ├── Particles
│   └── DamageNumbers
│
└── CameraTransform
```

Example:

```tsx
function GameCanvas({ scene }: { scene: SceneSnapshot }) {
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group transform={scene.camera.transform}>
        <DungeonLayer map={scene.map} />
        <ActorLayer actors={scene.actors} />
        <EffectsLayer effects={scene.effects} />
      </Group>
    </Canvas>
  );
}
```

Skia presentation objects must not be authoritative gameplay objects.

Bad:

```ts
function MonsterSprite() {
  let hp = 100;

  function receiveDamage() {
    hp -= Math.floor(Math.random() * 20);
  }
}
```

Better:

```ts
const result = combatEngine.execute(
  state,
  {
    type: 'USE_ABILITY',
    actorId: player.id,
    targetId: monster.id,
    abilityId: 'power-slash',
    dieId: selectedDie.id,
  },
  random,
);
```

The engine returns a new state and events. The presentation bridge translates events into Skia, audio, haptic, and UI animations.

---

# 4. Reanimated as the Visual Frame System

Use Reanimated shared values for high-frequency presentation state:

```text
actor x/y
camera offset and zoom
sprite animation frame
opacity and scale
screen shake
particle position and lifetime
damage-number position
temporary VFX progress
```

Use `useFrameCallback` only where per-frame updates are actually needed:

```ts
useFrameCallback((frame) => {
  const dtMs = frame.timeSincePreviousFrame ?? 0;

  updateCameraPresentation(dtMs);
  updateSpriteClocks(dtMs);
  updateParticles(dtMs);
  updateFloatingText(dtMs);
});
```

Do not run turn-based combat rules at 60 or 120 frames per second. Combat advances when a command is issued. The frame callback only makes already-decided results look good.

Do not write high-frequency coordinates to Zustand:

```ts
// Avoid this every frame.
useGameStore.setState({ monsterX: monsterX + velocity });
```

Use this boundary:

```text
Zustand / application state
    combat state, inventory, progression, run, account

Reanimated shared values
    coordinates, camera, animation clocks, shake, particles
```

Avoid `runOnJS` in hot loops. Cross from the UI thread to JavaScript only for infrequent, meaningful events.

---

# 5. Combat as a Pure TypeScript State Machine

Model combat as an explicit state machine.

```ts
export type CombatPhase =
  | 'startTurn'
  | 'rolling'
  | 'awaitingPlayerAction'
  | 'resolvingAction'
  | 'enemyTurn'
  | 'victory'
  | 'defeat';

export interface CombatState {
  readonly player: PlayerCombatant;
  readonly enemies: readonly EnemyCombatant[];
  readonly dice: readonly Die[];
  readonly phase: CombatPhase;
  readonly turn: number;
}
```

Commands should use discriminated unions:

```ts
export type CombatCommand =
  | { type: 'START_COMBAT' }
  | { type: 'ROLL_DICE' }
  | { type: 'REROLL_DIE'; dieId: string }
  | { type: 'ASSIGN_DIE'; dieId: string; abilityId: string }
  | {
      type: 'USE_ABILITY';
      actorId: string;
      targetId: string;
      abilityId: string;
      dieId: string;
    }
  | { type: 'END_TURN' };
```

Events should also be discriminated unions:

```ts
export type CombatEvent =
  | { type: 'TURN_STARTED'; turn: number }
  | { type: 'DICE_ROLLED'; dice: readonly Die[] }
  | { type: 'ABILITY_ACTIVATED'; actorId: string; abilityId: string }
  | { type: 'DAMAGE_DEALT'; targetId: string; amount: number }
  | { type: 'CRITICAL_HIT'; targetId: string }
  | { type: 'STATUS_APPLIED'; targetId: string; status: StatusEffect }
  | { type: 'ENEMY_DEFEATED'; enemyId: string }
  | { type: 'COMBAT_WON' }
  | { type: 'PLAYER_DEFEATED' };
```

Core API:

```ts
export interface CombatResult {
  readonly state: CombatState;
  readonly events: readonly CombatEvent[];
}

export function executeCombatCommand(
  state: CombatState,
  command: CombatCommand,
  random: RandomSource,
): CombatResult {
  // Pure TypeScript. No React, Expo, Zustand, or Skia.
}
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

- Deterministic unit tests
- Seeded dungeon runs
- Battle replays and event logs
- Easier debugging and balance simulation
- Straightforward save/load behavior
- A clean path to server-authoritative validation later

---

# 6. Abstract Randomness

Do not scatter `Math.random()` throughout the codebase.

```ts
export interface RandomSource {
  nextInt(maxExclusive: number): number;
  nextFloat(): number;
}
```

Use a serializable seeded implementation for dungeon runs:

```ts
export interface StatefulRandomSource extends RandomSource {
  snapshot(): RandomSnapshot;
  restore(snapshot: RandomSnapshot): void;
}
```

Inject it into engines:

```ts
const result = executeCombatCommand(state, command, runRandom);
```

Testing can use a sequence-backed fake:

```ts
const random = new SequenceRandomSource([6, 6, 2, 5]);
```

Keep these streams separate:

- Dungeon generation RNG
- Combat RNG
- Loot RNG
- Cosmetic RNG
- Gacha RNG

For a resumable run, store the seed **and current generator state or deterministic draw index**. A seed alone is insufficient if load order or draw count can change.

Paid or production gacha must ultimately use server-authoritative randomness. The client should call a repository rather than generate rewards directly.

---

# 7. Zustand for Application State and Orchestration

Use Zustand between React Native screens, application controllers, domain engines, and repositories.

```text
React Native UI
      │
      ▼
Zustand action / controller
      │
      ▼
Pure TypeScript engine
      │
      ▼
Repository
```

Prefer small stores or slices with narrow selectors:

```text
useAccountStore
usePlayerStore
useInventoryStore
useCurrentRunStore
useCombatStore
useGachaStore
useSettingsStore
```

Avoid one global `useGameStore` with hundreds of unrelated fields.

Example:

```ts
interface CombatStore {
  state: CombatState | null;
  dispatch(command: CombatCommand): void;
}

export const useCombatStore = create<CombatStore>((set, get) => ({
  state: null,
  dispatch(command) {
    const current = get().state;
    if (!current) return;

    const result = executeCombatCommand(current, command, combatRandom);
    set({ state: result.state });
    presentationBridge.publish(result.events);
  },
}));
```

Use selectors so unrelated UI does not rerender:

```ts
const phase = useCombatStore((store) => store.state?.phase);
```

For domain code or non-React controllers, Zustand's vanilla store API is also appropriate. Do not import hooks into the domain.

---

# 8. Zustand vs Skia/Reanimated Responsibilities

## Zustand should own

```text
player progression
inventory and equipment
current dungeon run
combat state
currencies
account state
gacha pity
quests
settings
save and sync status
```

## Skia/Reanimated should own

```text
sprite positions
animation timers
camera transforms
particles
screen shake
floating text position
interpolation
temporary visual effects
```

## React Native component state should own

```text
open/closed dialogs
focused control
temporary form input
local menu selection
tooltip visibility
```

Promote local UI state to Zustand only when several features genuinely need to share or persist it.

---

# 9. Connect Game Logic to Presentation Through Events

Domain events describe what happened. Presentation events describe how the app should communicate it.

```ts
export type GamePresentationEvent =
  | { type: 'PLAY_ATTACK'; actorId: string; abilityId: string }
  | { type: 'SHOW_DAMAGE'; targetId: string; amount: number; critical: boolean }
  | { type: 'PLAY_DEATH'; actorId: string }
  | { type: 'PLAY_SFX'; sound: Sfx }
  | { type: 'HAPTIC'; style: HapticStyle };
```

Flow:

```text
User activates ability
        ↓
Combat controller dispatches command
        ↓
Combat engine returns new state + events
        ↓
Store commits authoritative state
        ↓
Presentation bridge maps domain events
        ↓
Skia + Reanimated + Audio + Haptics
```

Keep the mapping explicit and testable:

```ts
export function mapCombatEvents(
  events: readonly CombatEvent[],
): readonly GamePresentationEvent[] {
  // Pure mapping logic.
}
```

For multi-step visuals, use a presentation queue. The authoritative combat result should be committed immediately, while inputs can be temporarily gated until the required animation sequence finishes.

Do not let animation completion decide damage, critical hits, loot, or victory.

---

# 10. Use React Native UI Over the Canvas

Place ordinary React Native controls over or around the Skia canvas.

```tsx
function CombatScreen() {
  return (
    <View style={styles.screen}>
      <GameCanvas />

      <View style={styles.hud} pointerEvents="box-none">
        <HealthBar />
        <TurnIndicator />
        <DiceTray />
        <AbilityBar />
      </View>
    </View>
  );
}
```

React Native is strongest for:

- Buttons and forms
- Accessible controls
- Responsive layouts
- Inventory grids and scrolling lists
- Tooltips, sheets, dialogs, and menus
- Drag/drop targets
- Localization and dynamic text

Skia is strongest for:

- Tiles and world positioning
- Sprites and sprite batching
- Particles and shaders
- Camera transforms
- Damage numbers and combat VFX
- Pixel-art composition

Do not draw every button and label inside Skia. Native controls provide better semantics, accessibility, layout behavior, and testing.

Use `react-native-gesture-handler` for dragging dice, panning maps, and gesture composition. Keep the final ability assignment as a domain command.

---

# 11. Rive Usage

Use `@rive-app/react-native` selectively for polished UI sequences.

Use Skia sprite animation for:

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
reward and rarity reveal
level-up UI
menu transitions
animated buttons
loading sequences
special UI effects
```

Recommended split:

```text
Pixel-art world and combat → Skia
Polished vector UI moments → Rive
Ordinary UI transitions → Reanimated
```

The new Rive React Native runtime uses native code, so plan on an Expo development build. Load `.riv` assets with `require()` when possible so they participate cleanly in bundling and eligible OTA updates.

Do not make Rive the source of truth for pull results. Resolve the pull first, then feed the known result into the reveal state machine.

---

# 12. Pixel-Art Rendering

Choose a fixed logical game resolution, for example:

```text
360 × 640 portrait
320 × 180 landscape
```

Choose one base tile size:

```ts
export const TILE_SIZE = 16;
```

or:

```ts
export const TILE_SIZE = 32;
```

Scale the logical canvas to fit the available viewport while preserving aspect ratio:

```ts
const scale = Math.min(
  viewportWidth / LOGICAL_WIDTH,
  viewportHeight / LOGICAL_HEIGHT,
);
```

Guidelines:

- Align world coordinates and camera stops to logical pixels where practical.
- Use nearest-neighbor sampling for pixel assets.
- Avoid fractional source rectangles in sprite atlases.
- Add safe-area padding to React Native HUD layers, not the logical world.
- Test on small phones, tall phones, tablets, and 120 Hz devices.
- Separate logical simulation coordinates from physical screen pixels.

Do not assume a high-performance canvas automatically guarantees crisp pixel art. Validate sampling, scaling, atlas boundaries, and transforms on both Android and iOS.

---

# 13. Dungeon Maps and Camera

## Procedural dungeons

Represent dungeons in pure TypeScript:

```ts
export interface DungeonFloor {
  readonly width: number;
  readonly height: number;
  readonly tiles: Uint16Array;
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly encounters: readonly Encounter[];
  readonly bossRoomId: string;
}
```

Generate maps outside Skia, then render the immutable result.

## Hand-authored room templates

Use Tiled as an editor, export JSON, validate it, and convert it into your own runtime model:

```text
Tiled editor
    ↓
JSON export
    ↓
Zod validation / build-time conversion
    ↓
DungeonMap model
    ↓
Skia Atlas renderer
```

Recommended hybrid:

```text
Procedural floor topology
        +
Hand-authored room templates
```

Avoid depending on an obscure React Native Tiled renderer. A small parser/converter for the subset of Tiled features you use is easier to own and test.

## Camera system

Because Skia does not provide a Flame-style game camera abstraction, define one explicitly:

```ts
export interface CameraState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}
```

The camera presentation may interpolate with Reanimated shared values, but room bounds, target selection, and logical coordinates should remain ordinary typed data.

Implement only the camera features this game needs:

- Follow player or focus target
- Clamp to map bounds
- Snap to logical pixels
- Short screen shake impulse
- Optional scripted pan or zoom

---

# 14. Sprite Atlases and Asset Loading

Avoid hundreds of standalone frame files. Use sprite sheets or atlases.

```text
assets/
├── images/
│   ├── characters.png
│   ├── monsters.png
│   ├── dungeon.png
│   ├── items.png
│   └── effects.png
│
├── atlases/
│   ├── characters.json
│   ├── monsters.json
│   └── dungeon.json
│
├── rive/
│   ├── summon.riv
│   ├── level-up.riv
│   └── reward-reveal.riv
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
│   └── loot-tables.json
│
└── maps/
```

Skia `Atlas` is appropriate for efficiently drawing many tiles or sprites from one image. Store source rectangles and transforms in compact arrays and avoid rebuilding large arrays unnecessarily every React render.

Use `expo-asset` to preload critical images, audio, map files, and fonts before entering a dungeon. Create an asset manifest so missing assets fail during development rather than during combat.

For atlas tooling, use TexturePacker, Aseprite export metadata, or a small build-time converter that emits the exact JSON format your renderer consumes.

---

# 15. Make Game Content Data-Driven

Do not hardcode gameplay content inside engines.

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
equipment
abilities
dice
status effects
loot tables
dungeons
encounter tables
gacha banners
rarity tables
experience curves
```

Use TypeScript types internally and Zod at trust boundaries:

```ts
const MonsterDefinitionSchema = z.object({
  id: z.string().min(1),
  hp: z.number().int().positive(),
  attack: z.number().nonnegative(),
  resistances: z.record(z.string(), z.number().min(0).max(1)),
});

export type MonsterDefinition = z.infer<typeof MonsterDefinitionSchema>;
```

Validate content during tests or a build step, not every time an actor is rendered. Include a content/schema version in saved runs so changes can be migrated or rejected safely.

---

# 16. Gacha Architecture

Treat gacha as a separate domain with explicit banner and pity rules.

```ts
export interface GachaBanner {
  readonly bannerId: string;
  readonly version: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly cost: CurrencyCost;
  readonly featuredUnitIds: readonly string[];
  readonly rarityRates: Readonly<Record<Rarity, number>>;
  readonly pityRules: PityRules;
}
```

Repository boundary:

```ts
export interface GachaRepository {
  pull(input: {
    bannerId: string;
    count: 1 | 10;
    idempotencyKey: string;
  }): Promise<GachaPullResult>;
}
```

Development:

```text
LocalGachaRepository
        ↓
GachaEngine
        ↓
Seeded local RNG
```

Production:

```text
RemoteGachaRepository
        ↓
API
        ↓
Server-side RNG + transaction
```

The production response should atomically include:

- Pull results
- Updated currency balance
- Updated pity state
- Updated inventory/ownership state or a transaction identifier
- Banner version used
- Server receipt or audit identifier

Use idempotency keys so retries cannot charge twice or issue duplicate pulls. Never trust the client clock for banner availability, and never grant paid rewards from client-generated randomness.

The UI flow remains stable when the repository implementation changes.

---

# 17. Persistence: Expo SQLite + Drizzle ORM

Use:

```text
expo-sqlite
drizzle-orm
drizzle-kit
```

Possible tables:

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

Example:

```ts
export const currentRun = sqliteTable('current_run', {
  runId: text('run_id').primaryKey(),
  dungeonId: text('dungeon_id').notNull(),
  seed: integer('seed').notNull(),
  floor: integer('floor').notNull(),
  stateJson: text('state_json').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

Use transactions for changes that must stay consistent, such as equipping an item, consuming currency, or completing a dungeon.

Keep SQL and Drizzle types in the data layer. Map database rows to domain types rather than leaking generated table types into the engine.

Write and test migrations from the beginning. Never rely on deleting the app database during development as the normal upgrade strategy.

---

# 18. Snapshot the Current Dungeon Run

Do not fully normalize an active run into many relational tables. Store a versioned snapshot:

```text
current_run
--------------------------------
run_id
dungeon_id
seed
floor
rng_state
state_json
schema_version
content_version
updated_at
```

Recommended persistence split:

```text
Permanent account data
    → normalized SQLite tables

Active dungeon run
    → versioned JSON snapshot

Small UI preferences
    → SQLite key-value store or AsyncStorage
```

The snapshot should include everything needed to resume deterministically:

- Run and dungeon identifiers
- Floor/map state
- Player and encounter state
- Combat state if saving mid-combat is allowed
- Collected rewards not yet committed
- RNG state or draw index
- Schema and content versions

Write snapshots at explicit checkpoints and on application-background events. Debounce noncritical writes. Use an atomic transaction when moving rewards from a completed run into permanent inventory.
---

# 19. Preferences Storage

Use `expo-sqlite/kv-store` or `@react-native-async-storage/async-storage` for small, noncritical preferences:

```text
music enabled
music and SFX volume
language
haptics enabled
graphics quality
tutorial acknowledged
accessibility preferences
```

Do not use key-value preferences for:

```text
premium currency
inventory
character ownership
gacha pity
active-run snapshots
critical progression
```

If SQLite is already a core dependency, `expo-sqlite/kv-store` reduces the number of persistence systems. AsyncStorage remains reasonable if the team prefers its simpler standalone API.

---

# 20. Secure Storage

Use `expo-secure-store` for small sensitive values:

```text
auth refresh token
session token
device-bound secret
```

Wrap it:

```ts
export interface TokenStorage {
  save(token: string): Promise<void>;
  read(): Promise<string | null>;
  clear(): Promise<void>;
}
```

Do not use SecureStore as a game database or for large save documents. Handle read/write failures and token invalidation explicitly.

---

# 21. Authentication Architecture

Do not couple the game to Firebase, Supabase, Clerk, or a custom provider before one is chosen.

```ts
export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  subscribe(listener: (state: AuthState) => void): () => void;
  signIn(input: SignInInput): Promise<User>;
  signOut(): Promise<void>;
}
```

Development implementation:

```text
GuestAuthRepository
```

Possible future implementations:

```text
FirebaseAuthRepository
SupabaseAuthRepository
ClerkAuthRepository
CustomAuthRepository
```

Provider SDK types should stop at the repository boundary. The rest of the application should understand only domain-level `User`, `AuthSession`, and `AuthState` types.

Use Expo Router layout guards for authenticated route groups. Hydrate the session before deciding the initial route to avoid login-screen flashes.

---

# 22. Purchases

Choose one client library:

- **RevenueCat `react-native-purchases`** when you want hosted product configuration, receipt handling, analytics, and entitlement tooling.
- **`expo-iap`** when you want a thinner OpenIAP-compatible client and will own more backend/store logic.

Wrap either one:

```ts
export interface PurchaseRepository {
  subscribe(listener: (event: PurchaseEvent) => void): () => void;
  loadProducts(): Promise<readonly Product[]>;
  purchase(productId: string): Promise<PurchaseAttempt>;
  restorePurchases(): Promise<void>;
}
```

Production flow:

```text
Purchase initiated
        ↓
Apple App Store / Google Play
        ↓
Store transaction or purchase token
        ↓
Backend or RevenueCat verification
        ↓
Idempotent server-side grant
        ↓
Client refreshes authoritative balance
```

Do not grant premium currency solely because a local purchase callback reports success. The server must verify and grant idempotently.

IAP libraries require custom native code, so real purchase testing needs an Expo development build and store sandbox/test accounts. Mock the repository for unit tests and most UI development.

---

# 23. TypeScript Models and Runtime Validation

TypeScript replaces most of the role previously handled by generated immutable model packages.

Use:

```text
type and interface
readonly properties
discriminated unions
generics
exhaustive switch checks
```

Use Zod only at trust boundaries:

```text
bundled JSON content
SQLite snapshot JSON
API requests and responses
remote configuration
imported debug saves
```

Do not validate the same trusted object on every render or every engine step.

Use `structuredClone`, focused update functions, array mapping, or object spread for normal immutable updates. Add `immer` only if deeply nested updates become a recurring source of defects.

Use exhaustive checks:

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
```

Keep serialization models versioned. A TypeScript type disappears at runtime; it does not validate a save file by itself.

---

# 24. Audio and Haptics

Use `expo-audio` for music and sound effects. Wrap it:

```ts
export interface AudioService {
  preload(): Promise<void>;
  playSfx(sound: Sfx): void;
  playMusic(track: MusicTrack): void;
  setMusicVolume(value: number): void;
  setSfxVolume(value: number): void;
  stopMusic(): void;
}
```

Use `expo-haptics` behind a similar adapter:

```ts
export interface HapticsService {
  impact(style: HapticStyle): void;
  success(): void;
  error(): void;
}
```

The domain must not call Expo APIs directly.

```text
DamageDealt
    ↓
Presentation bridge
    ├── attack animation
    ├── screen shake
    ├── damage number
    ├── sword SFX
    └── haptic feedback
```

Respect user settings, silent-mode expectations, app lifecycle, and reduced-motion/accessibility preferences. Preload short critical SFX before combat.

---

# 25. Recommended Packages

## Core

| Package                                | Purpose                                                 |        Add now?        |
| -------------------------------------- | ------------------------------------------------------- | :--------------------: |
| `expo`                                 | App framework and native module ecosystem               |          Yes           |
| `expo-router`                          | File-based routing and deep links                       |          Yes           |
| `@shopify/react-native-skia`           | Dungeon, sprite, tile, particle, and VFX rendering      |          Yes           |
| `react-native-reanimated`              | UI-thread animation and visual frame callbacks          |          Yes           |
| `react-native-worklets`                | Worklet runtime required by the current animation stack |          Yes           |
| `react-native-gesture-handler`         | Gestures and drag/drop                                  |          Yes           |
| `zustand`                              | Application state and orchestration                     |          Yes           |
| `zod`                                  | Runtime validation at trust boundaries                  |          Yes           |
| `expo-asset`                           | Asset loading and caching                               |          Yes           |
| `expo-audio`                           | Music and SFX                                           |          Yes           |
| `expo-haptics`                         | Haptic feedback                                         |          Yes           |
| `expo-sqlite`                          | Local database and optional KV store                    |    Prototype phase     |
| `drizzle-orm`                          | Typed SQLite schema and queries                         |    Prototype phase     |
| `expo-secure-store`                    | Tokens and small secrets                                |    When auth begins    |
| `@rive-app/react-native`               | Gacha/reward animation                                  | When Rive assets exist |
| `react-native-nitro-modules`           | Required by the new Rive runtime                        |       With Rive        |
| `@tanstack/react-query`                | Remote server cache and request state                   |  When backend begins   |
| `react-native-purchases` or `expo-iap` | Store purchases                                         |  When commerce begins  |

## Development and testing

```text
typescript
eslint
prettier
jest-expo
@testing-library/react-native
fast-check
drizzle-kit
Maestro or Detox for end-to-end tests
```

`fast-check` is optional but useful for property-based tests of dice, loot, dungeon generation, and gacha invariants.

## Optional packages

```text
immer                       deeply nested immutable updates
@shopify/flash-list         large inventory/history lists
expo-crypto                 secure IDs or digests when needed
expo-updates                explicit OTA update policy
Sentry React Native         production diagnostics
```

Do not add every package on day one. Add a dependency only when its feature enters the implementation milestone.

---

# 26. Suggested Project Structure

```text
app/
├── _layout.tsx
├── index.tsx
├── login.tsx
├── (main)/
└── dungeon/

src/
├── bootstrap/
│   ├── bootstrap.ts
│   └── dependencies.ts
│
├── core/
│   ├── errors/
│   ├── logging/
│   ├── random/
│   │   ├── random-source.ts
│   │   └── seeded-random-source.ts
│   ├── time/
│   └── utils/
│
├── domain/
│   ├── combat/
│   │   ├── combat-engine.ts
│   │   ├── combat-state.ts
│   │   ├── commands.ts
│   │   ├── events.ts
│   │   ├── dice/
│   │   ├── abilities/
│   │   └── status-effects/
│   │
│   ├── dungeon/
│   │   ├── dungeon.ts
│   │   ├── room.ts
│   │   ├── dungeon-generator.ts
│   │   └── dungeon-run.ts
│   │
│   ├── character/
│   ├── inventory/
│   ├── equipment/
│   ├── progression/
│   ├── economy/
│   └── gacha/
│       ├── banner.ts
│       ├── pity-state.ts
│       ├── pull-result.ts
│       └── gacha-engine.ts
│
├── application/
│   ├── combat/
│   ├── dungeon/
│   ├── inventory/
│   ├── gacha/
│   ├── shop/
│   └── account/
│
├── data/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── mappers/
│   ├── repositories/
│   ├── secure-storage/
│   ├── purchases/
│   └── remote/
│
├── game/
│   ├── canvas/
│   ├── camera/
│   ├── scene/
│   ├── sprites/
│   ├── tiles/
│   ├── particles/
│   ├── effects/
│   ├── animation/
│   └── bridge/
│
├── stores/
│   ├── combat-store.ts
│   ├── current-run-store.ts
│   ├── inventory-store.ts
│   └── settings-store.ts
│
└── presentation/
    ├── home/
    ├── dungeon/
    ├── combat/
    ├── inventory/
    ├── characters/
    ├── gacha/
    ├── shop/
    ├── settings/
    └── components/

assets/
├── images/
├── atlases/
├── maps/
├── data/
├── rive/
└── audio/
```

Do not create every folder on day one. Grow the structure feature by feature while preserving dependency direction.

---

# 27. Typical Combat Interaction

```text
Player drags 🎲6 onto Power Slash
                │
                ▼
       React Native Combat UI
                │
                ▼
        Combat store action
                │
                ▼
       USE_ABILITY command
                │
                ▼
          CombatEngine
                │
          ┌─────┴──────┐
          ▼            ▼
    CombatState      Domain events
      updated             │
                          │
                DAMAGE_DEALT(32)
                CRITICAL_HIT
                          │
                          ▼
                Presentation bridge
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
      Skia sprite     Reanimated       Audio/haptic
      animation       shake + text     feedback
```

The state transition is deterministic. Presentation may be skipped, sped up, replayed, or changed without changing the damage result.

---

# 28. Typical Gacha Interaction

```text
Summon ×10
    │
    ▼
Gacha controller
    │
    ▼
GachaRepository.pull()
    │
    ├── Local seeded implementation during development
    │
    └── Remote authoritative implementation in production
             │
             ▼
       GachaPullResult
             │
    ┌────────┴─────────┐
    ▼                  ▼
Authoritative      Rive reveal
inventory/pity     sequence receives
state updates      known results
```

Do not delay persistence until the reveal animation ends. If the app closes during the animation, the granted items must still exist and the result should be recoverable from history.

---

# 29. Testing Strategy

```text
__tests__/
├── domain/
│   ├── dice/
│   ├── combat/
│   ├── status-effects/
│   ├── loot/
│   ├── dungeon-generation/
│   └── gacha/
│
├── application/
├── data/
├── game/
└── presentation/

e2e/
├── new-game.yaml
├── resume-run.yaml
├── combat-win.yaml
└── restore-purchases.yaml
```

Important deterministic tests:

```text
rolling two sixes triggers a critical
poison ticks at the correct phase
shield absorbs damage before HP
enemy dies when HP reaches zero
pity triggers at the configured pull count
featured guarantee resets correctly
loot tables never produce invalid IDs
the same seed and commands produce the same dungeon and combat
save/load preserves RNG and active-run state
replaying commands reproduces the same event log
```

Also test:

- Zod validation for every bundled content file
- Database migrations from every shipped schema version
- Repository error and retry behavior
- Idempotent gacha and purchase requests
- Store selectors to prevent unnecessary rerenders
- Presentation-event mappings
- App background/resume during combat and gacha reveal
- Pixel output and layout on representative Android/iOS sizes
- Reduced motion, larger text, and screen-reader flows for controls

Use production-mode builds for performance measurements. Development mode is not a reliable indicator of frame time or memory behavior.

---

# 30. Performance and Lifecycle Rules

Set performance budgets early:

```text
target frame rate          60 fps on supported baseline devices
combat command execution   effectively instantaneous for normal encounters
dungeon entry              no visible asset fetch after transition begins
resume snapshot write      bounded and debounced
React rerenders            isolated through narrow selectors
```

Key rules:

- Batch tiles and repeated sprites with Skia Atlas.
- Keep large map arrays stable; do not recreate them on every React render.
- Do not mirror every shared value into Zustand.
- Preload combat-critical assets.
- Pool or cap particles and floating text.
- Pause presentation frame callbacks when the game screen is unfocused or backgrounded.
- Persist the run before the OS can suspend the app.
- Profile on a real mid-range Android device, not only a simulator or flagship phone.
- Test both 60 Hz and high-refresh displays.
- Keep remote fetching out of combat resolution.

Skia is the right renderer for this design, but the team owns the camera, sprite lifecycle, tile conversion, scene orchestration, and performance discipline that a full engine would normally provide.

---

# 31. Expo Development and Delivery

Start with modern Expo and **development builds**, not an Expo-Go-only architecture.

Recommended workflow:

```text
Expo SDK 57
    +
Continuous Native Generation
    +
Development builds
    +
EAS Build / Update / Submit
```

Expo Go is useful for an early shell and currently includes several core libraries, but it cannot host arbitrary custom native code. Rive and real IAP are concrete reasons to establish a development build early.

Create separate EAS profiles:

```text
development   local/dev-client testing
preview       internal QA distribution
production    store release
```

Treat OTA updates carefully:

- Use runtime-version compatibility rules.
- Do not ship JavaScript that assumes native modules absent from the installed binary.
- Version content and save schemas.
- Keep a rollback plan for live balance/content changes.
- Test migrations and resume behavior against the previous production build.

Build and test iOS and Android continuously. Do not defer Android validation until release; rendering, lifecycle, audio, and store behavior can differ.

---

# 32. Recommended Implementation Milestones

## Milestone 0: Architecture spike

Prove the risky rendering boundary before building meta-game screens.

Deliver:

- One Expo development build on Android and iOS
- One Skia canvas with a tile atlas
- Player and monster sprite animation
- Camera clamp and screen shake
- React Native HUD over the canvas
- One Reanimated frame callback
- A frame-time check on a mid-range physical device

Exit condition: the team is comfortable owning the renderer without a full game engine.

## Milestone 1: Vertical combat slice

Deliver:

- Pure TypeScript combat state machine
- Seeded `RandomSource`
- Dice tray and one drag-to-ability interaction
- One player ability and one enemy action
- Event-to-presentation bridge
- SFX and haptic feedback
- Deterministic engine tests

## Milestone 2: Dungeon run

Deliver:

- Procedural topology plus two or three room templates
- Tiled JSON conversion pipeline
- Movement/navigation and encounters
- Loot and progression
- Current-run snapshot including RNG state
- Background/resume recovery

## Milestone 3: Meta game

Deliver:

- Home, character, inventory, equipment, and settings routes
- Zustand stores with narrow selectors
- Expo SQLite + Drizzle schema and migrations
- Data-driven content validated with Zod
- Rive level-up or reward animation

## Milestone 4: Gacha prototype

Deliver:

- Versioned banner model and pity engine
- Local seeded repository
- Rive summon/reveal sequence
- Atomic inventory/pity updates
- Pull history and interruption recovery

## Milestone 5: Production services

Deliver:

- Auth repository implementation
- Backend API and TanStack Query integration
- Server-authoritative gacha
- Cloud save/sync strategy
- Purchase verification and idempotent grants
- Analytics, crash reporting, remote configuration, and live-ops controls

---

# 33. First Prototype Dependencies

Start with the latest compatible versions for the selected Expo SDK, installed through `npx expo install` where applicable.

```text
expo
expo-router
typescript

@shopify/react-native-skia
react-native-reanimated
react-native-worklets
react-native-gesture-handler

zustand
zod

expo-asset
expo-audio
expo-haptics

jest-expo
@testing-library/react-native
```

Add when the vertical slice needs persistence:

```text
expo-sqlite
drizzle-orm
drizzle-kit
```

Add only when those features begin:

```text
@rive-app/react-native
react-native-nitro-modules
expo-secure-store
@tanstack/react-query
react-native-purchases or expo-iap
```

Do not begin the prototype with auth, purchases, cloud saves, or production gacha. First prove combat, rendering, camera, asset loading, performance, and deterministic resume.

---

# 34. Final Recommended Stack

## React Native + Expo

Use for:

- Application shell
- Navigation and deep links
- Menus and accessible controls
- Combat HUD
- Inventory and character management
- Gacha, shop, and settings screens
- Native development and delivery workflow

## React Native Skia

Use for:

- Dungeon tiles
- Characters and monsters
- Sprite animation
- Camera transform
- Particles
- Damage numbers
- Combat VFX

## Reanimated + Worklets

Use for:

- Visual frame callbacks
- Shared animation values
- UI-thread interpolation
- Camera movement and shake
- UI transitions and gesture feedback

## Zustand

Use for:

- Application orchestration
- Shared application state
- Controllers/actions
- Dependency access at the app boundary

## Pure TypeScript Domain

Use for:

- Dice mechanics
- Combat rules
- Abilities and status effects
- Dungeon generation
- Progression and loot
- Economy
- Gacha and pity rules

## Zod

Use for:

- Bundled content validation
- Save snapshot parsing
- API responses
- Remote configuration

## Expo SQLite + Drizzle

Use for:

- Local-first persistence
- Player progression
- Inventory and characters
- Gacha pity and history
- Dungeon-run snapshots
- Schema migrations and transactions

## Expo Router

Use for:

- Application navigation
- Typed routes
- Deep links
- Authenticated layouts
- Screen structure

## Rive

Use for:

- Gacha summon sequences
- Reward and rarity reveals
- Level-up animations
- Polished vector UI moments

## RevenueCat or Expo IAP

Use for:

- App Store and Google Play purchases
- Purchase restoration
- Store transaction integration

Always wrap the selected implementation behind a repository and verify paid grants authoritatively.

---

# 35. Overall System

```text
 React Native UI              Skia + Reanimated
        │                            │
        └────────────┬───────────────┘
                     ▼
              Application Layer
              Zustand/controllers
                     │
                     ▼
            PURE TYPESCRIPT DOMAIN
                     │
                     ▼
                Repositories
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
 Expo SQLite / native APIs   Backend later
```

This architecture supports a strong local-first game now while leaving clean paths for:

- Authentication
- Cloud saves
- Server-authoritative gacha
- Purchase verification
- Live events and remote configuration
- Cross-device progression
- Analytics and diagnostics
- Social or multiplayer features

The key tradeoff is deliberate:

> **Expo provides a stronger app ecosystem; Skia provides the renderer; the project owns the small amount of game-engine infrastructure it actually needs.**

For this dice-driven RPG, that tradeoff is reasonable. If the design later becomes physics-heavy, collision-heavy, or twitch-action focused, reevaluate whether a dedicated game engine is more appropriate before adding more custom engine infrastructure.

---

# Official References

Recommendations and package compatibility were checked on **September 1, 2026**. Install versions compatible with the chosen Expo SDK rather than copying isolated package version numbers.

- [Expo SDK 57 and `create-expo-app`](https://docs.expo.dev/more/create-expo/)
- [Expo Router introduction](https://docs.expo.dev/router/introduction/)
- [React Native Skia in Expo](https://docs.expo.dev/versions/latest/sdk/skia/)
- [Skia Atlas](https://shopify.github.io/react-native-skia/docs/shapes/atlas/)
- [Reanimated `useFrameCallback`](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/)
- [Expo SQLite and Drizzle integration](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo in-app purchases guide](https://docs.expo.dev/guides/in-app-purchases/)
- [Rive React Native runtime](https://rive.app/docs/runtimes/react-native/react-native)
- [Adding Rive to Expo](https://rive.app/docs/runtimes/react-native/adding-rive-to-expo)
- [Expo app-store delivery](https://docs.expo.dev/deploy/submit-to-app-stores/)
