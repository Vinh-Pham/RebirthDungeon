import { z } from 'zod';

export const ShopSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['grocery', 'blacksmith', 'general']),
    items: z.array(z.string().min(1)).min(1),
    bundles: z
      .array(
        z.strictObject({
          itemId: z.string().min(1),
          quantity: z.number().int().min(2).max(999),
          price: z.number().int().min(0).max(100000),
        }),
      )
      .default([]),
    buysItems: z.boolean().default(false),
  })
  .refine((shop) => new Set(shop.items).size === shop.items.length, {
    message: 'Duplicate shop item',
  })
  .refine(
    (shop) =>
      new Set(shop.bundles.map((bundle) => `${bundle.itemId}:${bundle.quantity}`)).size ===
        shop.bundles.length && shop.bundles.every((bundle) => !shop.items.includes(bundle.itemId)),
    { message: 'Duplicate or ambiguous shop bundle' },
  );
