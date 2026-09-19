import { define } from './define';
import { withWiki } from './wiki';
import wiki from './herbalism.wiki.json';

export default withWiki(
    define('Herbalism', 'any', 0, 0, 0, {
        description: 'Identify and gather herbs; ranking reduces gathering time.',
        effect: 'passive',
        category: 'Life',
        resource: 'stamina',
        type: 'passive',
        route: 'reference',
    }),
    wiki,
    {
        slug: 'herbalism',
        category: 'Life',
        note: 'Reference only. Crafting, gathering, camping, fishing, and wound-treatment gameplay are not implemented.',
    },
);