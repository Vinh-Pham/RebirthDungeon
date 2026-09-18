import { define } from './define';
import { withWiki } from './wiki';
import wiki from './heavy-armor-mastery.wiki.json';

export default withWiki(
    define('Heavy Armor Mastery', 'heavy', 0, 0, 0, 0, {
        description: 'Improve physical and magical defenses while wearing heavy armor.',
        effect: 'passive',
        category: 'Combat',
        talent: 'Close Combat',
        resource: 'stamina',
        type: 'passive',
    }),
    wiki,
    {
        slug: 'heavy-armor-mastery',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules.',
    },
);
