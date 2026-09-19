import { define } from './define';
import { withWiki } from './wiki';
import wiki from './arrow-revolver.wiki.json';

export default withWiki(
    define('Arrow Revolver', 'bow', 0, 0, 0.2, 0, {
        description: 'Fire a sequence of five arrows at one enemy.',
        effect: 'attack',
        category: 'Combat',
        talent: 'Archery',
        resource: 'stamina',
        races: ['Human'],
        hits: 5,
        target: 'one',
    }),
    wiki,
    {
        slug: 'arrow-revolver',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules. Five arrows resolve together using the mean shot multiplier.',
        damage: [
            'Damage [%] · 1st shot',
            'Damage [%] · 2nd shot',
            'Damage [%] · 3rd shot',
            'Damage [%] · 4th shot',
            'Damage [%] · 5th shot',
        ],
    },
);