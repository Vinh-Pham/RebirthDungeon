import { define } from './define';
import { withWiki } from './wiki';
import wiki from './shockwave.wiki.json';

export default withWiki(
    define('Shockwave', 'magic', 0, 0, 0, {
        description: 'Release a burst of magic around the caster at a percentage mana cost.',
        effect: 'attack',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'all',
    }),
    wiki,
    {
        slug: 'shockwave',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Turns and training use Rebirth Dungeon rules. One charge per cast; area spells hit every living enemy. Real-time stun, charge storage, and secondary explosions are not simulated. Mana cost is a percentage of maximum mana; cooldown resets are not simulated.',
        damage: ['Minimum Magic Attack Modifier', 'Maximum Magic Attack Modifier'],
        cost: 'Mana Usage',
    },
);