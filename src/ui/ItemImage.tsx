import { items } from '../domain/catalog';

/** Shared category art for shop stock; resource potions reuse the reward illustrations. */
export function ItemImage({ kind }: { kind: string }) {
    const def = items[kind];
    let image: string;
    if (kind === 'bread') image = '/assets/game/items/bread.svg';
    else if (def.type === 'consumable')
        image = `/assets/game/rewards/${def.resource === 'mana' ? 'mana' : def.resource === 'stamina' ? 'stamina' : 'hp'}.svg`;
    else if (['book', 'collection', 'page'].includes(def.type))
        image = '/assets/game/items/book.svg';
    else if (def.type === 'weapon') {
        const weapon =
            kind === 'mace'
                ? 'mace'
                : def.talent === 'Archery'
                  ? 'bow'
                  : def.talent === 'Magic'
                    ? 'wand'
                    : def.talent === 'Dual Gun'
                      ? 'guns'
                      : 'main';
        image = `/assets/game/items/${weapon}.svg`;
    } else image = `/assets/game/items/${def.slots?.[0] ?? 'accessory1'}.svg`;
    return (
        <img
            src={image}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 object-contain"
        />
    );
}
