import type { Resource, Stats } from '../model';

export const primaryIds = ['hp', 'mana', 'stamina', 'str', 'int', 'dex', 'will', 'luck'] as const;
export const statIds = [
    ...primaryIds,
    'meleeAttack',
    'rangedAttack',
    'magicAttack',
    'dualGunAttack',
    'defense',
    'magicDefense',
    'protection',
    'magicProtection',
    'hpRegen',
    'manaRegen',
    'staminaRegen',
] as const;
export type StatId = (typeof statIds)[number];
export interface StatModifier {
    stat: StatId;
    flat?: number;
    /** Integer basis points: 2000 = +20%; percentages add within a stage. */
    percentBp?: number;
}
export interface CostModifier {
    pool: Resource;
    skill?: string;
    flat?: number;
    percentBp?: number;
}
export interface ModifierSource {
    id: string;
    name: string;
    kind: 'equipment' | 'skill' | 'title' | 'status';
    modifiers: StatModifier[];
    costs?: CostModifier[];
}
export interface StatSnapshot {
    version: 1;
    base: Stats;
    sources: ModifierSource[];
}
export interface PeriodicEffect {
    kind: 'damage' | 'restore';
    pool: Resource;
    amount: number;
    damageType?: 'physical' | 'magic' | 'true';
}
export interface StatusDefinition {
    id: string;
    version: 1;
    name: string;
    icon: string;
    group: string;
    priority: number;
    duration: number;
    tags: ('buff' | 'harmful' | 'poison')[];
    removable: boolean;
    modifiers: StatModifier[];
    costs?: CostModifier[];
    periodic?: PeriodicEffect[];
}
export interface StatusInstance {
    definition: StatusDefinition;
    sourceId: string;
    sourceName: string;
    targetId: string;
    remaining: number;
    /** A self-application skips the activation-end boundary that applied it. */
    skipNext: boolean;
}