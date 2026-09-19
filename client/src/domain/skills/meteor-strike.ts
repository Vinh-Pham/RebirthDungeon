import { define } from './define';
import { withWiki } from './wiki';
import wiki from './meteor-strike.wiki.json';

export default withWiki(
    define('Meteor Strike', 'magic', 0, 0, 0.2, 0, {
        description: 'Call a meteor for a large area impact with a long recovery time.',
        effect: 'attack',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'all',
    }),
    wiki,
    {
        slug: 'meteor-strike',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules. One magical impact per enemy; lingering fire and physical impact are not simulated.',
        damage: ['Min Magic Damage [%]', 'Max Magic Damage [%]'],
        cost: 'Mana Use (Loading)',
    },
);