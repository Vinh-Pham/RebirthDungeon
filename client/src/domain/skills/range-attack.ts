import { define } from './define';
import { withWiki } from './wiki';
import wiki from './range-attack.wiki.json';

export default withWiki(
    define('Ranged Attack', 'bow', 0, 0, 0, {
        description: 'Attack with a bow. Human and Elf rank values are tracked separately.',
        effect: 'attack',
        category: 'Combat',
        talent: 'Archery',
        resource: 'stamina',
        races: ['Human', 'Elf'],
        target: 'one',
    }),
    wiki,
    {
        slug: 'range-attack',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Turns and training use Rebirth Dungeon rules.',
    },
);