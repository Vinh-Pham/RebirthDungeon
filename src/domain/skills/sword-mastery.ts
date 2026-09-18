import { define } from './define';
import { withWiki } from './wiki';
import wiki from './sword-mastery.wiki.json';

export default withWiki(
    define('Sword Mastery', 'sword', 0, 0, 0, 0, {
        description: 'Increase minimum and maximum sword damage and balance.',
        effect: 'passive',
        category: 'Combat',
        talent: 'Close Combat',
        resource: 'stamina',
        type: 'passive',
    }),
    wiki,
    {
        slug: 'sword-mastery',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules.',
    },
);
