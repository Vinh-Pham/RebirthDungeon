import { define } from './define';
import { withWiki } from './wiki';
import wiki from './ice-spear.wiki.json';

export default withWiki(
    define('Ice Spear', 'magic', 0, 0, 0.2, 0, {
        description: 'Send a spear of ice through enemies, followed by an area explosion.',
        effect: 'attack',
        category: 'Magic',
        talent: 'Magic',
        resource: 'mana',
        target: 'all',
    }),
    wiki,
    {
        slug: 'ice-spear',
        category: 'Magic',
        note: 'Wiki rank costs and effects; six seconds per turn. Dice and training use Rebirth Dungeon rules. One charge per cast; area spells hit every living enemy. Real-time stun, charge storage, and secondary explosions are not simulated.',
        damage: ['Minimum Magic Attack Modifier', 'Maximum Magic Attack Modifier'],
    },
);