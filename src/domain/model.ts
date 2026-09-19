import type { QuestJournal, RunQuests, RpSession } from './quests/types';
import type {
    StatModifier,
    CostModifier,
    StatusInstance,
    StatSnapshot,
    ModifierSource,
} from './stats/types';
import type { SkillProgress, RankDefinition } from './Skills';
export type Race = 'Human' | 'Elf' | 'Giant';
export type Talent = 'Close Combat' | 'Archery' | 'Magic' | 'Dual Gun';
export type Screen =
    'Title' | 'CharacterSelect' | 'NewCharacter' | 'Town1' | 'Alby' | 'Battle' | 'TreasureRoom';
export type Phase = 'selecting' | 'choosingDice' | 'reward' | 'treasure' | 'exploring';
export type Resource = 'hp' | 'mana' | 'stamina';
export interface Stats {
    hp: number;
    mana: number;
    stamina: number;
    str: number;
    int: number;
    dex: number;
    will: number;
    luck: number;
}
export const equipmentSlots = [
    'accessory1',
    'head',
    'accessory2',
    'main',
    'body',
    'offhand',
    'gloves',
    'boots',
    'robe',
] as const;
export type EquipmentSlot = (typeof equipmentSlots)[number];
export type EquipmentLoadout = Record<EquipmentSlot, string | null>;
export interface InventoryAnchor {
    column: number;
    row: number;
}
export const emptyEquipment = (): EquipmentLoadout => ({
    accessory1: null,
    head: null,
    accessory2: null,
    main: null,
    body: null,
    offhand: null,
    gloves: null,
    boots: null,
    robe: null,
});
export interface Item {
    id: string;
    kind: string;
    count: number;
    durability?: number;
}
export interface ItemDefinition {
    name: string;
    icon: string;
    type:
        | 'weapon'
        | 'armor'
        | 'shield'
        | 'gear'
        | 'consumable'
        | 'material'
        | 'book'
        | 'page'
        | 'collection';
    footprint?: { width: number; height: number };
    slots?: EquipmentSlot[];
    races?: Race[];
    hand?: 'sword' | 'melee' | 'ranged' | 'magic' | 'shield';
    price: number;
    power?: number;
    talent?: Talent;
    resource?: Resource;
    restore?: number;
    defense?: number;
    magicDefense?: number;
    armorCategory?: 'light' | 'heavy';
    skill?: string;
    page?: number;
    modifiers?: StatModifier[];
    costModifiers?: CostModifier[];
    statuses?: string[];
    cleanse?: 'harmful' | 'buff' | 'poison';
    requiresRun?: boolean;
    description?: string;
}
export interface Enemy {
    species?: 'spider';
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    boss: boolean;
    magicDefense?: number;
    protection?: number;
    magicProtection?: number;
    shield?: number;
    attackType?: 'melee' | 'ranged' | 'magic';
    statuses?: StatusInstance[];
    inflicts?: string[];
}
export interface Battle {
    room: number;
    enemies: Enemy[];
    dice: number[];
    held: boolean[];
    rerolls: number;
    skill: string;
    target: string;
    turn: number;
    log: string[];
    action?: ActionSnapshot;
    criticalResults?: Record<string, boolean>;
}
export interface Reward {
    id: string;
    gold: number;
    items: Item[];
    boss: boolean;
    claimed: string[];
}
export interface Room {
    id: number;
    x: number;
    y: number;
    kind: 'entry' | 'encounter' | 'boss' | 'supplies' | 'exit';
    trigger: 'spider' | 'chest' | 'switch';
    required: boolean;
}
export interface Dungeon {
    quests?: RunQuests;
    id: string;
    seed: number;
    tiles: number[][];
    rooms: Room[];
    cleared: number[];
    visited: number[];
    x: number;
    y: number;
    chests: Reward[];
    chosen: number | null;
    baseline?: RunBaseline;
    pageRewards?: number;
}
export interface Character {
    quests: QuestJournal;
    rp: RpSession | null;
    role?: 'aren';
    id: string;
    name: string;
    race: Race;
    talent: Talent;
    age: number;
    level: number;
    xp: number;
    totalLevel: number;
    ap: number;
    base: Stats;
    growth: Stats;
    stats: Stats;
    hp: number;
    mana: number;
    stamina: number;
    gold: number;
    bankGold: number;
    inventory: Item[];
    bank: Item[];
    equipment: EquipmentLoadout;
    placements: Record<string, InventoryAnchor>;
    inventoryRecovery: Item[];
    skills: Record<string, SkillProgress>;
    collection: number[];
    cooldowns: Record<string, number>;
    effects: CombatEffects;
    createdAt: number;
    rebornAt: number;
    agedAt: number;
    run: Dungeon | null;
    battle: Battle | null;
    reward: Reward | null;
    checkpoint: Phase;
    tutorial: number;
    statuses: StatusInstance[];
    titleModifiers: { first?: ModifierSource; second?: ModifierSource };
}
export interface RunBaseline {
    contentVersion: 2;
    statSnapshot?: StatSnapshot;
    skills: Record<string, SkillProgress>;
    stats: Stats;
    equipment: EquipmentLoadout;
}
export interface CombatEffects {
    defense?: { defense: number; protection: number };
    manaShield?: { efficiency: number; upkeep: number; remaining: number };
    final?: { magnitude: number; remaining: number };
    counter?: {
        power: number;
        opponentMultiplier?: number;
        multiplier: number;
        source: Pick<ActionSnapshot, 'skill' | 'melee' | 'sword' | 'dual'>;
    };
    shield?: number;
}
export interface ActionSnapshot {
    id: string;
    combatVersion: 2;
    statsVersion?: 1;
    skill: string;
    rank: RankDefinition;
    attack: number;
    melee: boolean;
    sword: boolean;
    dual: boolean;
    targets: { id: string; defense: number; protection: number }[];
    criticalChance: number;
    criticalBonus: number;
    costs: { hp: number; mana: number; stamina: number };
}
export interface Settings {
    music: number;
    effects: number;
    reducedMotion: boolean;
    hudScale: number;
}
export interface GameData {
    version: 4;
    statsVersion: 1;
    revision: number;
    rng: number;
    activeId: string | null;
    characters: Character[];
    settings: Settings;
    operations: string[];
}
export interface Checkpoint {
    version: 1;
    screen: Screen;
    phase: Phase;
}
export interface SaveData {
    version: 4;
    migrationNotice?: boolean;
    data: GameData;
    checkpoint: Checkpoint;
}
export interface CreateInput {
    name: string;
    race: Race;
    talent: Talent;
    age: number;
}
export const races: Race[] = ['Human', 'Elf', 'Giant'];
export const talents: Talent[] = ['Close Combat', 'Archery', 'Magic', 'Dual Gun'];
export const zeroStats = (): Stats => ({
    hp: 0,
    mana: 0,
    stamina: 0,
    str: 0,
    int: 0,
    dex: 0,
    will: 0,
    luck: 0,
});
export const initialData = (): GameData => ({
    version: 4,
    statsVersion: 1,
    revision: 0,
    rng: 0x7c813ea,
    activeId: null,
    characters: [],
    settings: { music: 0.25, effects: 0.4, reducedMotion: false, hudScale: 1 },
    operations: [],
});
