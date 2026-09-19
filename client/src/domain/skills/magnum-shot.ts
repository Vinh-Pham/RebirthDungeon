import { define } from './define';
import { withWiki } from './wiki';
import wiki from './magnum-shot.wiki.json';

export default withWiki(
    define('Magnum Shot', 'bow', 0, 0, 0, {
        description: 'Fire a high-damage arrow that knocks back its target.',
        effect: 'attack',
        category: 'Combat',
        talent: 'Archery',
        resource: 'stamina',
        races: ['Human', 'Elf'],
        target: 'one',
    }),
    wiki,
    {
        slug: 'magnum-shot',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Turns and training use Rebirth Dungeon rules.',
        damage: ['Damage [%]'],
    },
);