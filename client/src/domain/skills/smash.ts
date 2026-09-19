import { define } from './define';
import { withWiki } from './wiki';
import wiki from './smash.wiki.json';

export default withWiki(
    define('Smash', 'melee', 0, 0, 0, {
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
        note: 'Wiki rank costs and effects; six seconds per turn. Turns and training use Rebirth Dungeon rules.',
        damage: ['Damage'],
    },
);