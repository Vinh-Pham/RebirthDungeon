import { define } from './define';
import { withWiki } from './wiki';
import wiki from './handicraft.wiki.json';

export default withWiki(
    define('Handicraft', 'any', 0, 0, 0, 0, {
        description: 'Use a handicraft kit and materials to create useful items.',
        effect: 'passive',
        category: 'Life',
        resource: 'stamina',
        type: 'passive',
        route: 'reference',
    }),
    wiki,
    {
        slug: 'handicraft',
        category: 'Life',
        note: 'Reference only. Crafting, gathering, camping, fishing, and wound-treatment gameplay are not implemented.',
    },
);