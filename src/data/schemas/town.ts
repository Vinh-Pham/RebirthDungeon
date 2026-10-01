import { z } from 'zod';

export const ShopSchema = z.strictObject({
  id: z.string().min(1), name: z.string().min(1),
  kind: z.enum(['grocery', 'blacksmith', 'general']),
  items: z.array(z.string().min(1)).min(1), buysItems: z.boolean().default(false),
}).refine((shop) => new Set(shop.items).size === shop.items.length, { message: 'Duplicate shop item' });
