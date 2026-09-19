import { define } from './define';
import { withWiki } from './wiki';
import wiki from './bow-mastery.wiki.json';

export default withWiki(
    define('Bow Mastery', 'bow', 0, 0, 0, 0, {
        description: 'Increase minimum and maximum damage while using a bow.',
        effect: 'passive',
        category: 'Combat',
        talent: 'Archery',
        resource: 'stamina',
        type: 'passive',
        races: ['Human', 'Elf'],
    }),
    wiki,
    {
        slug: 'bow-mastery',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules.',
    },
);