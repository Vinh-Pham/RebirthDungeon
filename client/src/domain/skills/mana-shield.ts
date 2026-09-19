import { define } from './define';
import { withWiki } from './wiki';
import wiki from './mana-shield.wiki.json';

export default withWiki(
    define('Mana Shield', 'magic', 0, 0, 0, {
        description: 'Spend mana to absorb incoming damage before it reaches health.',
        effect: 'manaShield',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'self',
    }),
    wiki,
    {
        slug: 'mana-shield',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Turns and training use Rebirth Dungeon rules. Absorbs damage using the wiki base efficiency until the third subsequent owner turn begins. Upkeep rounds up once at each owner turn start.',
        power: 'Base Mana Efficiency',
    },
);