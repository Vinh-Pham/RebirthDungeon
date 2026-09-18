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
export { skills } from './Skills';
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

Object.assign(items, {
    shield: {
        name: 'Round shield',
        icon: '◈',
        type: 'shield',
        price: 40,
        defense: 2,
        magicDefense: 2,
    },
    lightArmor: {
        name: 'Leather armor',
        icon: '♜',
        type: 'armor',
        armorCategory: 'light',
        price: 60,
        defense: 3,
        magicDefense: 1,
    },
    heavyArmor: {
        name: 'Iron armor',
        icon: '♜',
        type: 'armor',
        armorCategory: 'heavy',
        price: 100,
        defense: 5,
        magicDefense: 2,
    },
    criticalBook: {
        name: 'Critical Hit manual',
        icon: '▤',
        type: 'book',
        price: 60,
        skill: 'critical',
    },
    finalCollection: {
        name: 'Incomplete Final Hit manual',
        icon: '▤',
        type: 'collection',
        price: 30,
    },
    finalBook: { name: 'Final Hit manual', icon: '▤', type: 'book', price: 180, skill: 'final' },
});
for (let page = 1; page <= 5; page++)
    items[`finalPage${page}`] = {
        name: `Final Hit page ${page}`,
        icon: '▱',
        type: 'page',
        price: 30,
        page,
    };
shops.General.push(
    'criticalBook',
    'finalCollection',
    ...Array.from({ length: 5 }, (_, i) => `finalPage${i + 1}`),
);
shops.Blacksmith.push('shield', 'lightArmor', 'heavyArmor');

// Original stat-system items; these are game balance data, not wiki values.
Object.assign(items, {
    strengthDraught: {
        name: 'Strength draught',
        icon: '⚔',
        type: 'consumable',
        price: 18,
        statuses: ['strengthDraught'],
        requiresRun: true,
        description: '+10 STR for 3 subsequent activations. Refreshes, does not stack.',
    },
    unstableElixir: {
        name: 'Unstable elixir',
        icon: '▽',
        type: 'consumable',
        price: 12,
        resource: 'mana',
        restore: 45,
        statuses: ['unstableWeakness'],
        requiresRun: true,
        description: 'Restore 45 MP; suffer -15 Will for 3 subsequent activations.',
    },
    antidote: {
        name: 'Antidote',
        icon: '✚',
        type: 'consumable',
        price: 12,
        cleanse: 'poison',
        description: 'Remove poison. Does not undo damage already taken.',
    },
    cleansingTonic: {
        name: 'Cleansing tonic',
        icon: '✦',
        type: 'consumable',
        price: 25,
        cleanse: 'harmful',
        description: 'Remove dispellable harmful statuses. Equipment penalties remain.',
    },
    renewalTonic: {
        name: 'Renewal tonic',
        icon: '♥',
        type: 'consumable',
        price: 20,
        statuses: ['regeneration'],
        requiresRun: true,
        description: 'Restore 5 HP at the end of each of your next 3 activations.',
    },
    vigorCoat: {
        name: 'Vigor coat',
        icon: '♜',
        type: 'armor',
        price: 95,
        defense: 2,
        modifiers: [
            { stat: 'hp', flat: 10 },
            { stat: 'staminaRegen', flat: 2 },
        ],
        description:
            '+10 Max HP, +2 Defense, +2 SP regeneration per activation. Capacity does not heal.',
    },
    focusWand: {
        name: 'Focus wand',
        icon: '✧',
        type: 'weapon',
        price: 120,
        talent: 'Magic',
        power: 10,
        modifiers: [{ stat: 'int', flat: 10 }],
        costModifiers: [{ pool: 'mana', percentBp: -2000 }],
        description: '+10 INT; mana costs -20%, minimum 1 MP for positive costs.',
    },
});
shops.General.push(
    'strengthDraught',
    'unstableElixir',
    'antidote',
    'cleansingTonic',
    'renewalTonic',
    'vigorCoat',
);
shops.Blacksmith.push('focusWand');
