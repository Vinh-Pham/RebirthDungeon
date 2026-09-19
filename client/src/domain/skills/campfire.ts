import { define } from './define';
import { withWiki } from './wiki';
import wiki from './campfire.wiki.json';

export default withWiki(
    define('Campfire', 'any', 0, 0, 0, {
        description: 'Build a temporary fire that improves nearby resting recovery.',
        effect: 'passive',
        category: 'Life',
        resource: 'stamina',
        type: 'passive',
        route: 'reference',
    }),
    wiki,
    {
        slug: 'campfire',
        category: 'Life',
        note: 'Reference only. Crafting, gathering, camping, fishing, and wound-treatment gameplay are not implemented.',
    },
);