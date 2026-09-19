import { define } from './define';
import { withWiki } from './wiki';
import wiki from './healing.wiki.json';

export default withWiki(
    define('Healing', 'magic', 0, 0, 0, {
        description: 'Restore health with healing magic. The wiki lists healing per charge.',
        effect: 'heal',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'self',
    }),
    wiki,
    {
        slug: 'healing',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Turns and training use Rebirth Dungeon rules. Five charges heal the caster together; wounds are not simulated.',
        power: 'Minimum Healing',
    },
);