import { define } from './define';
import { withWiki } from './wiki';
import wiki from './potion-making.wiki.json';

export default withWiki(
    define('Potion Making', 'any', 0, 0, 0, 0, {
        description: 'Combine herbs and bottles to produce restorative potions.',
        effect: 'passive',
        category: 'Life',
        resource: 'stamina',
        type: 'passive',
        route: 'reference',
    }),
    wiki,
    {
        slug: 'potion-making',
        category: 'Life',
        note: 'Reference only. Crafting, gathering, camping, fishing, and wound-treatment gameplay are not implemented.',
    },
);