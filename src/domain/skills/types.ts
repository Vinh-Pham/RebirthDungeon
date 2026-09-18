import type { Talent, Race } from '../model';
export const ranks = [
    'F',
    'E',
    'D',
    'C',
    'B',
    'A',
    '9',
    '8',
    '7',
    '6',
    '5',
    '4',
    '3',
    '2',
    '1',
] as const;
export type Rank = (typeof ranks)[number];
export interface SkillProgress {
    rank: Rank;
    counts: Record<string, number>;
}
export interface Objective {
    id: string;
    label: string;
    points: number;
    cap: number;
}
export interface RankDefinition {
    rank: Rank;
    base: number;
    attackMultiplier?: number;
    counterMultiplier?: number;
    pip: number;
    costs: { hp: number; mana: number; stamina: number };
    cooldown: number;
    weights: number[];
    ap: number;
    duration: number;
    objectives: Objective[];
}
export interface Skill {
    name: string;
    description: string;
    icon: string;
    talent?: Talent;
    resource: 'mana' | 'stamina';
    type: 'active' | 'passive';
    effect:
        | 'attack'
        | 'counter'
        | 'buff'
        | 'passive'
        | 'heal'
        | 'defend'
        | 'manaShield'
        | 'restoreMana'
        | 'status';
    appliedStatuses?: { id: string; target: 'self' | 'targets' }[];
    category?: 'Combat' | 'Magic' | 'Life';
    wiki?: WikiReference;
    adaptation?: string;
    ranksByRace?: Record<Race, RankDefinition[]>;
    races?: Race[];
    requirement:
        | 'any'
        | 'melee'
        | 'sword'
        | 'shield'
        | 'light'
        | 'heavy'
        | 'dual'
        | 'bow'
        | 'guns'
        | 'magic';
    route: 'starter' | 'lesson' | 'book' | 'collection' | 'reference';
    hits: number;
    target: 'one' | 'all' | 'self';
    ranks: RankDefinition[];
}

export interface WikiReference {
    url: string;
    retrievedAt: string;
    additionalUrls?: string[];
    unavailable?: string;
    rows: { label: string; values: string[] }[];
    effects: Record<string, string[]>;
}
