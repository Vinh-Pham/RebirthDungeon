import { define } from './define';
import { withWiki } from './wiki';
import wiki from './hailstorm.wiki.json';

export default withWiki(
    define('Hailstorm', 'magic', 0, 0, 0.2, 0, {
        description: 'Launch ice crystals that can be charged for greater damage and splash area.',
        effect: 'attack',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'all',
    }),
    wiki,
    {
        slug: 'hailstorm',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules. One charge per cast; splash hits every living enemy.',
        damage: ['Min Damage [%] (/Charge)', 'Max Damage [%] (/Charge)'],
        cost: 'Mana Use (Loading)',
    },
);