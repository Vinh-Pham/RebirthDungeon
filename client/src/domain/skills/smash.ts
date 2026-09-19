import { define } from './define';
import { withWiki } from './wiki';
import wiki from './smash.wiki.json';

export default withWiki(
    define('Smash', 'melee', 0, 0, 0.2, 0, {
        rankWeights: (r) => (r >= 6 ? [5, 7, 9, 11, 13, 15] : [1, 1, 1, 1, 1, 1]),
        description: 'Deliver a powerful melee strike; the damage multiplier differs by race.',
        effect: 'attack',
        category: 'Combat',
        talent: 'Close Combat',
        resource: 'stamina',
        target: 'one',
    }),
    wiki,
    {
        slug: 'smash',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules.',
        damage: ['Damage'],
    },
);