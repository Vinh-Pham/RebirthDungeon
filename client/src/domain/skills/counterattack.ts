import { define } from './define';
import { withWiki } from './wiki';
import wiki from './counterattack.wiki.json';

export default withWiki(
    define('Counterattack', 'melee', 0, 0, 0, 0, {
        description:
            'Prepare a retaliation against the next melee attack, using both combatants’ attack power.',
        effect: 'counter',
        category: 'Combat',
        talent: 'Close Combat',
        resource: 'stamina',
        target: 'self',
    }),
    wiki,
    {
        slug: 'counterattack',
        category: 'Combat',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules. Retaliates once against melee; opponent damage uses the wiki counter multiplier.',
        damage: ['Damage From Self [%]'],
    },
);