import { define } from './define';
import { withWiki } from './wiki';
import wiki from './blacksmithing.wiki.json';

export default withWiki(
    define('Blacksmithing', 'any', 0, 0, 0, 0, {
        description: 'Forge equipment from metal using a hammer and anvil.',
        effect: 'passive',
        category: 'Life',
        resource: 'stamina',
        type: 'passive',
        route: 'reference',
    }),
    wiki,
    {
        slug: 'blacksmithing',
        category: 'Life',
        note: 'Reference only. Crafting, gathering, camping, fishing, and wound-treatment gameplay are not implemented.',
    },
);