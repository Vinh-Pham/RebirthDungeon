import { define } from './define';
import { withWiki } from './wiki';
import wiki from './mana-regeneration.wiki.json';

const skill = withWiki(
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

// Resource recovery still pays an upfront cost; it cannot finance its own activation.
for (const rows of Object.values(skill.ranksByRace!))
    for (const rank of rows) rank.costs.stamina = 5;
skill.adaptation += ' Activation costs 5 SP in Rebirth Dungeon.';
export default skill;
