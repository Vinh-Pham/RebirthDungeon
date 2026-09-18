export const locations = [
    {
        id: 'Trainer',
        name: 'Combat instructor',
        npc: 'Aren',
        x: 475,
        y: 870,
        icon: '⚔',
        text: 'Train your skills, and let experience become mastery.',
    },
    {
        id: 'Healer',
        name: 'Healer House',
        npc: 'Elara',
        x: 300,
        y: 348,
        icon: '✚',
        text: 'A little rest, a little kindness. Let me tend to your wounds.',
    },
    {
        id: 'Grocery',
        name: 'Grocery Store',
        npc: 'Mara',
        x: 1110,
        y: 373,
        icon: '◒',
        text: 'Fresh from the oven. Nothing sends you on your way like warm bread.',
    },
    {
        id: 'Bank',
        name: 'Bank',
        npc: 'Orin',
        x: 1260,
        y: 786,
        icon: '◇',
        text: 'Every adventure deserves a safe place for its treasures.',
    },
    {
        id: 'Blacksmith',
        name: 'Blacksmith',
        npc: 'Bram',
        x: 300,
        y: 870,
        icon: '⚒',
        text: 'Even a good blade needs care. What can I make ready for you?',
    },
    {
        id: 'General',
        name: 'General Shop',
        npc: 'Nell',
        x: 850,
        y: 920,
        icon: '⚑',
        text: 'Potions, provisions, a coat for the road. Take a look.',
    },
    {
        id: 'Alby',
        name: 'Alby Dungeon',
        npc: 'The northern gate',
        x: 746,
        y: 210,
        icon: '♜',
        text: 'Beyond these old stones, the spiders keep their secrets.',
    },
];
export function townGrid() {
    const grid = Array.from({ length: 32 }, () => Array(50).fill(1));
    for (const [x, y, w, h] of [
        [200, 120, 210, 180],
        [990, 120, 235, 185],
        [1150, 530, 230, 180],
        [160, 610, 280, 175],
        [740, 680, 220, 175],
    ])
        for (let yy = Math.floor(y / 32); yy < Math.ceil((y + h) / 32); yy++)
            for (let xx = Math.floor(x / 32); xx < Math.ceil((x + w) / 32); xx++) grid[yy][xx] = 0;
    return grid;
}
