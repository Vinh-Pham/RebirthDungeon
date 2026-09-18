import { define } from './define';

export default define('Wand Mastery', 'magic', 0, 0, 0, 0, {
    icon: '/assets/game/skills/wand-mastery.webp',
    category: 'Magic',
    type: 'passive',
    effect: 'passive',
    route: 'reference',
    description:
        'An unverified skill represented by the supplied wand icon. No rank stats are available from the requested wiki.',
    adaptation: 'Unverified catalog entry. Learning and gameplay effects are unavailable.',
    wiki: {
        url: 'https://wiki.mabinogiworld.com/view/Wand_Mastery',
        retrievedAt: '2026-09-18',
        unavailable: 'The wiki article has no content. No stats have been invented.',
        rows: [],
        effects: {},
    },
});
