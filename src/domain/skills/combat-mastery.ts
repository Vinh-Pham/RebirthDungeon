import { define } from './define';
import { withWiki } from './wiki';
import wiki from './combat-mastery.wiki.json';

export default withWiki(
    define('Combat Mastery', 'melee', 0, 0, 0, 0, {
        description: 'Increase maximum health and improve melee damage and balance.',
        effect: 'passive',
        category: 'Combat',
        talent: 'Close Combat',
        resource: 'stamina',
        type: 'passive',
    }),
    wiki,
    {
        slug: 'combat-mastery',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules.',
    },
);
