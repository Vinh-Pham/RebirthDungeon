import { define } from './define';
import { withWiki } from './wiki';
import wiki from './carpentry.wiki.json';

export default withWiki(
    define('Carpentry', 'any', 0, 0, 0, 0, {
        description: 'Gather wood and craft bows, with better success and quality at higher ranks.',
        effect: 'passive',
        category: 'Life',
        resource: 'stamina',
        type: 'passive',
        route: 'reference',
    }),
    wiki,
    {
        slug: 'carpentry',
        category: 'Life',
        note: 'Reference only. Crafting, gathering, camping, fishing, and wound-treatment gameplay are not implemented.',
    },
);
