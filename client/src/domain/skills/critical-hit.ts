import { define } from './define';
import { withWiki } from './wiki';
import wiki from './critical-hit.wiki.json';

export default withWiki(
    define('Critical Hit', 'any', 0, 0, 0, 0, {
        training: [
            { id: 'critical', label: 'Critical actions', points: 5, cap: 20 },
            { id: 'criticalKill', label: 'Critical defeats', points: 10, cap: 5 },
        ],
        description: 'Increase the bonus damage of a critical hit.',
        effect: 'passive',
        category: 'Combat',
        talent: 'Close Combat',
        resource: 'stamina',
        type: 'passive',
        route: 'book',
    }),
    wiki,
    {
        slug: 'critical-hit',
        category: 'Combat',
        note: 'Critical damage follows the wiki. Critical chance remains 10% in this game. Training uses Rebirth Dungeon rules.',
    },
);