import type { Character, Item, Talent } from '../model';
import type { Rank } from '../skills/types';

export const questCategories = [
    'Mainstream Quests',
    'Collecting Quests',
    'Hunting Quests',
    'Part-Time Job',
    'Sidequests',
    'Skills',
] as const;
export type QuestCategory = (typeof questCategories)[number];
export type QuestNpc = 'Trainer' | 'General' | 'Blacksmith' | 'Healer';
export const questNpcs: Record<QuestNpc, string> = {
    Trainer: 'Aren',
    General: 'Nell',
    Blacksmith: 'Bram',
    Healer: 'Elara',
};
export type Prerequisite =
    | { kind: 'claimed'; quest: string }
    | { kind: 'rank'; skill: string; rank: Rank }
    | { kind: 'sword' }
    | { kind: 'rebirth'; talent: Talent };
export type Objective = { id: string; label: string; target: number } & (
    | { kind: 'talk'; npc: QuestNpc }
    | { kind: 'defeat'; species: 'spider'; sword?: boolean }
    | { kind: 'clear'; dungeon: 'alby' }
    | { kind: 'deliver'; npc: QuestNpc; item: string }
    | { kind: 'rp'; scenario: 'aren-memory' }
);
export interface QuestDefinition {
    id: string;
    title: string;
    description: string;
    notes: string;
    category: QuestCategory;
    chapter?: string;
    generation?: string;
    prerequisites: Prerequisite[];
    delivery: { kind: 'automatic' } | { kind: 'npc'; npc: QuestNpc };
    stages: { id: string; notes: string; objectives: Objective[] }[];
    rewards: {
        gold?: number;
        xp?: number;
        ap?: number;
        skill?: string;
        items?: { kind: string; count: number }[];
    };
}
export interface QuestRecord {
    status: 'available' | 'active' | 'ready' | 'completed';
    stage: number;
    counts: Record<string, number>;
    claimId?: string;
}
export interface QuestJournal {
    version: 1;
    records: Record<string, QuestRecord>;
    tracked: string[];
    overflow: Item[];
    rebirths: { id: string; talent: Talent }[];
    chapters: string[];
    generations: string[];
    notices: { id: string; text: string }[];
}
export interface RunQuests {
    version: 1;
    stages: Record<string, number>;
    counts: Record<string, Record<string, number>>;
    defeats: string[];
}
export interface RpSession {
    version: 1;
    scenario: 'aren-memory';
    attemptId: string;
    rng: number;
    actor: Character;
}
export const emptyJournal = (): QuestJournal => ({
    version: 1,
    records: {},
    tracked: [],
    overflow: [],
    rebirths: [],
    chapters: [],
    generations: [],
    notices: [],
});
export const emptyRunQuests = (): RunQuests => ({
    version: 1,
    stages: {},
    counts: {},
    defeats: [],
});