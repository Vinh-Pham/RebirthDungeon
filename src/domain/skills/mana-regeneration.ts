import { define } from './define';
import { withWiki } from './wiki';
import wiki from './mana-regeneration.wiki.json';

export default withWiki(
    define('Mana Recovery', 'magic', 0, 0, 0, 0, {
        description: 'Channel magic to restore a percentage of maximum mana.',
        effect: 'restoreMana',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'self',
    }),
    wiki,
    {
        slug: 'mana-regeneration',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules. Restores the wiki percentage instantly; channeling is one action.',
        power: 'Mana Recovery',
    },
);
