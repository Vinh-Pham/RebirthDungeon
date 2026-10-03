import type { GameContent } from '../../data/schemas/content';
import type { ContentRegistry } from '../data/ContentRegistry';

type Shop = GameContent['shops'][number];

/** A stock row's price buys its complete quantity, including authored bundles. */
export function shopOffers(shop: Shop, content: ContentRegistry) {
  return [
    ...shop.items.map((itemId) => ({ itemId, quantity: 1, price: content.item(itemId).price })),
    ...shop.bundles,
  ];
}

/** Command quantity is always item units; bundles must be purchased whole. */
export function purchasePrice(
  shop: Shop,
  content: ContentRegistry,
  itemId: string,
  quantity: number,
  bundleSize = 1,
) {
  const offer = shopOffers(shop, content).find(
    (offer) => offer.itemId === itemId && offer.quantity === bundleSize,
  );
  if (!offer) throw new Error('This merchant does not sell that item or bundle');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999 || quantity % bundleSize)
    throw new Error('Purchase quantity must contain whole bundles within the inventory limit');
  return offer.price * (quantity / bundleSize);
}
