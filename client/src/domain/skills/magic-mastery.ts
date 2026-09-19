import { define } from './define';
import { withWiki } from './wiki';
import wiki from './magic-mastery.wiki.json';

export default withWiki(
    define('Magic Mastery', 'magic', 0, 0, 0, 0, {
        description: 'Increase maximum mana, intelligence, and magic balance.',
        effect: 'passive',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        type: 'passive',
    }),
    wiki,
    {
        slug: 'magic-mastery',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules.',
    },
);