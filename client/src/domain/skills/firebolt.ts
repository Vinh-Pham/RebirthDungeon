import { define } from './define';
import { withWiki } from './wiki';
import wiki from './firebolt.wiki.json';

export default withWiki(
    define('Firebolt', 'magic', 0, 0, 0, {
        description:
            'Launch a fire bolt. In Mabinogi, up to five charges combine into a stronger blast.',
        effect: 'attack',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'one',
    }),
    wiki,
    {
        slug: 'firebolt',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Turns and training use Rebirth Dungeon rules. One charge per cast; area spells hit every living enemy. Real-time stun, charge storage, and secondary explosions are not simulated.',
        damage: ['Minimum Magic Attack Modifier', 'Maximum Magic Attack Modifier'],
    },
);