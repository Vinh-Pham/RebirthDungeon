import { define } from './define';
import { withWiki } from './wiki';
import wiki from './lightning-bolt.wiki.json';

export default withWiki(
    define('Lightning Bolt', 'magic', 0, 0, 0, {
        description: 'Strike enemies with lightning; stored charges can spread the attack.',
        effect: 'attack',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'all',
    }),
    wiki,
    {
        slug: 'lightning-bolt',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Turns and training use Rebirth Dungeon rules. One charge per cast; area spells hit every living enemy. Real-time stun, charge storage, and secondary explosions are not simulated.',
        damage: ['Minimum Magic Attack Modifier', 'Maximum Magic Attack Modifier'],
    },
);