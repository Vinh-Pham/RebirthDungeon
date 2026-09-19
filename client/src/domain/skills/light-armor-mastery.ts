import { define } from './define';
import { withWiki } from './wiki';
import wiki from './light-armor-mastery.wiki.json';

export default withWiki(
    define('Light Armor Mastery', 'light', 0, 0, 0, 0, {
        description: 'Improve physical and magical defenses while wearing light armor.',
        effect: 'passive',
        category: 'Combat',
        talent: 'Close Combat',
        resource: 'stamina',
        type: 'passive',
    }),
    wiki,
    {
        slug: 'light-armor-mastery',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules.',
    },
);