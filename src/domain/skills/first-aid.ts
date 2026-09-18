import { define } from './define';
import { withWiki } from './wiki';
import wiki from './first-aid.wiki.json';

export default withWiki(
    define('First Aid', 'any', 0, 0, 0, 0, {
        description: 'Treat wounds with bandages and restore a portion of wounded health.',
        effect: 'passive',
        category: 'Life',
        resource: 'stamina',
        type: 'passive',
        route: 'reference',
    }),
    wiki,
    {
        slug: 'first-aid',
        category: 'Life',
        note: 'Reference only. Crafting, gathering, camping, fishing, and wound-treatment gameplay are not implemented.',
    },
);
