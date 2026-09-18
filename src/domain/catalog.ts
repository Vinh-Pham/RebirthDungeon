import type { ItemDefinition, Talent } from './model';
export const items: Record<string, ItemDefinition> = {
    sword: {
        name: 'Ashwood sword',
        icon: '⚔',
        type: 'weapon',
        price: 40,
        power: 8,
        talent: 'Close Combat',
    },
    mace: {
        name: 'Willow mace',
        icon: '⚒',
        type: 'weapon',
        price: 40,
        power: 8,
        talent: 'Close Combat',
    },
    bow: { name: 'Willow bow', icon: '➶', type: 'weapon', price: 40, power: 8, talent: 'Archery' },
    wand: {
        name: 'Apprentice wand',
        icon: '✧',
        type: 'weapon',
        price: 40,
        power: 8,
        talent: 'Magic',
    },
    guns: {
        name: 'Copper dual guns',
        icon: '⌁',
        type: 'weapon',
        price: 40,
        power: 8,
        talent: 'Dual Gun',
    },
    steel: {
        name: 'Steel sword',
        icon: '⚔',
        type: 'weapon',
        price: 160,
        power: 15,
        talent: 'Close Combat',
    },
    longbow: {
        name: 'Hunter bow',
        icon: '➶',
        type: 'weapon',
        price: 160,
        power: 15,
        talent: 'Archery',
    },
    staff: {
        name: 'Moonstone wand',
        icon: '✧',
        type: 'weapon',
        price: 160,
        power: 15,
        talent: 'Magic',
    },
    pistols: {
        name: 'Silver dual guns',
        icon: '⌁',
        type: 'weapon',
        price: 160,
        power: 15,
        talent: 'Dual Gun',
    },
    armor: { name: 'Linen tunic', icon: '♜', type: 'armor', price: 35, defense: 2 },
    coat: { name: 'Traveler coat', icon: '♜', type: 'armor', price: 120, defense: 4 },
    hp: {
        name: 'Health potion',
        icon: '♥',
        type: 'consumable',
        price: 10,
        resource: 'hp',
        restore: 30,
    },
    mana: {
        name: 'Mana potion',
        icon: '✦',
        type: 'consumable',
        price: 10,
        resource: 'mana',
        restore: 30,
    },
    stamina: {
        name: 'Stamina potion',
        icon: 'ϟ',
        type: 'consumable',
        price: 10,
        resource: 'stamina',
        restore: 30,
    },
    bread: {
        name: 'Fresh bread',
        icon: '◒',
        type: 'consumable',
        price: 5,
        resource: 'stamina',
        restore: 20,
    },
    silk: { name: 'Spider silk', icon: '❋', type: 'material', price: 20 },
    gem: { name: 'Moonstone fragment', icon: '◇', type: 'material', price: 80 },
};
export interface Skill {
    name: string;
    talent?: Talent;
    factor: number;
    hits: number;
    cost: number;
    resource: 'mana' | 'stamina';
    icon: string;
}
export const skills: Record<string, Skill> = {
    normal: { name: 'Normal Attack', factor: 1, hits: 1, cost: 2, resource: 'stamina', icon: '⚔' },
    smash: {
        name: 'Smash',
        talent: 'Close Combat',
        factor: 1.8,
        hits: 1,
        cost: 6,
        resource: 'stamina',
        icon: '✹',
    },
    shot: {
        name: 'Power Shot',
        talent: 'Archery',
        factor: 1.8,
        hits: 1,
        cost: 6,
        resource: 'stamina',
        icon: '➶',
    },
    double: {
        name: 'Double Shot',
        talent: 'Dual Gun',
        factor: 0.9,
        hits: 2,
        cost: 6,
        resource: 'stamina',
        icon: '⌁',
    },
    ice: {
        name: 'Icebolt',
        talent: 'Magic',
        factor: 1.6,
        hits: 1,
        cost: 6,
        resource: 'mana',
        icon: '❄',
    },
};
export const talentSkill: Record<Talent, string> = {
    'Close Combat': 'smash',
    Archery: 'shot',
    Magic: 'ice',
    'Dual Gun': 'double',
};
export const talentWeapon: Record<Talent, string> = {
    'Close Combat': 'sword',
    Archery: 'bow',
    Magic: 'wand',
    'Dual Gun': 'guns',
};
export const shops: Record<string, string[]> = {
    Grocery: ['bread'],
    General: ['hp', 'mana', 'stamina', 'armor', 'coat'],
    Blacksmith: ['sword', 'mace', 'bow', 'wand', 'guns', 'steel', 'longbow', 'staff', 'pistols'],
};
