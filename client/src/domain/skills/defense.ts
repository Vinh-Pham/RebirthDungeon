import { define } from './define';
import { withWiki } from './wiki';
import wiki from './defense.wiki.json';

export default withWiki(
    define('Defense', 'any', 0, 0, 0, 0, {
        description: 'Brace against incoming attacks with additional defense and protection.',
        effect: 'defend',
        category: 'Combat',
        talent: 'Close Combat',
        resource: 'stamina',
        target: 'self',
    }),
    wiki,
    {
        slug: 'defense',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules. Defense and protection bonuses last through the next enemy response.',
        power: 'Defense Bonus',
    },
);