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
export interface Item {
    id: string;
    kind: string;
    count: number;
    durability?: number;
}
export interface ItemDefinition {
    name: string;
    icon: string;
    type: 'weapon' | 'armor' | 'consumable' | 'material';
    price: number;
    power?: number;
    talent?: Talent;
    resource?: Resource;
    restore?: number;
    defense?: number;
}
export interface Enemy {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    boss: boolean;
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
    kind: 'entry' | 'encounter' | 'boss' | 'supplies';
    trigger: 'spider' | 'chest' | 'switch';
    required: boolean;
}
export interface Dungeon {
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
}
export interface Character {
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
    weapon: string | null;
    armor: string | null;
    skills: string[];
    createdAt: number;
    rebornAt: number;
    agedAt: number;
    run: Dungeon | null;
    battle: Battle | null;
    reward: Reward | null;
    checkpoint: Phase;
    tutorial: number;
}
export interface Settings {
    music: number;
    effects: number;
    reducedMotion: boolean;
    hudScale: number;
}
export interface GameData {
    version: 1;
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
    version: 1;
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
    version: 1,
    revision: 0,
    rng: 0x7c813ea,
    activeId: null,
    characters: [],
    settings: { music: 0.25, effects: 0.4, reducedMotion: false, hudScale: 1 },
    operations: [],
});
