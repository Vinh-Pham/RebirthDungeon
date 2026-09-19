import { define } from './define';
import { withWiki } from './wiki';
import wiki from './fishing.wiki.json';

export default withWiki(
    define('Fishing', 'any', 0, 0, 0, {
        description: 'Catch fish and items; higher ranks improve automatic fishing and catch size.',
        effect: 'passive',
        category: 'Life',
        resource: 'stamina',
        type: 'passive',
        route: 'reference',
    }),
    wiki,
    {
        slug: 'fishing',
        category: 'Life',
        note: 'Reference only. Crafting, gathering, camping, fishing, and wound-treatment gameplay are not implemented.',
    },
);