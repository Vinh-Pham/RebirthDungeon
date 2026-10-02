import { z } from 'zod';
const id = z.string().min(1);
const point = { x: z.number().int().min(0), y: z.number().int().min(0) };
const WorldSpriteSchema = z.strictObject({ atlas: id, frame: z.number().int().min(0) });
export const WorldDecorationSchema = z.strictObject({
  id, ...point, sprite: WorldSpriteSchema,
  size: z.number().int().min(1).max(5).default(1), blocking: z.boolean().default(false),
  objectId: id.optional(),
});
export type WorldDecoration = z.infer<typeof WorldDecorationSchema>;
export function decorationContains(decoration: WorldDecoration, p: { x: number; y: number }) {
  return p.x >= decoration.x && p.x < decoration.x + decoration.size && p.y >= decoration.y && p.y < decoration.y + decoration.size;
}
export const WorldMapSchema = z.strictObject({
  id, name: id, width: z.number().int().min(3).max(128), height: z.number().int().min(3).max(128),
  tileSize: z.number().int().min(16).max(128), tiles: z.array(z.number().int().min(0).max(2)),
  entry: z.strictObject(point),
  theme: z.enum(['town', 'interior']).optional(),
  decorations: z.array(WorldDecorationSchema).default([]),
  objects: z.array(z.strictObject({ id, ...point, name: id,
    sprite: WorldSpriteSchema.optional(),
    kind: z.enum(['npc', 'chest', 'rest', 'portal', 'encounter', 'dungeonEntrance', 'statue', 'mimic', 'fountain', 'gate', 'key', 'finalChest', 'merchant', 'healer', 'altar']),
    enchanting: z.boolean().default(false),
    lessons: z.array(z.strictObject({ skillId: id, fee: z.number().int().min(0).max(100000) })).default([]),
    dialogue: z.string().default(''), itemId: id.optional(), quantity: z.number().int().min(1).max(99).default(1),
    destination: id.optional(), encounterMap: id.optional(),
    destinationPosition: z.strictObject(point).optional(), shopId: id.optional(),
    healingCost: z.number().int().min(1).max(100000).optional(),
    dungeonId: id.optional(), gateType: z.enum(['boss', 'treasure']).optional(), keyType: z.enum(['boss', 'treasure']).optional(), blocked: z.boolean().default(false),
  })),
}).superRefine((map, ctx) => {
  const valid = (p: { x: number; y: number }) => p.x < map.width && p.y < map.height && map.tiles[p.y * map.width + p.x] !== 1;
  if (map.tiles.length !== map.width * map.height || !valid(map.entry)) ctx.addIssue({ code: 'custom', message: 'Invalid world tiles or entry' });
  if (map.objects.some((obj) => obj.x === map.entry.x && obj.y === map.entry.y && ['npc', 'chest', 'merchant', 'healer'].includes(obj.kind))) ctx.addIssue({ code: 'custom', message: 'World entry must be walkable' });
  const seen = new Set<string>();
  const positions = new Set<string>();
  for (const obj of map.objects) {
    const pos = `${obj.x},${obj.y}`;
    if (seen.has(obj.id) || positions.has(pos) || !valid(obj)) ctx.addIssue({ code: 'custom', message: 'Invalid or duplicate world object' });
    if ((obj.enchanting && (!map.theme || !['npc', 'merchant'].includes(obj.kind))) || (obj.kind === 'portal' && !obj.destination) || (['encounter', 'mimic'].includes(obj.kind) && !obj.encounterMap) ||
        (['chest', 'finalChest'].includes(obj.kind) && !obj.itemId) || (['dungeonEntrance', 'altar'].includes(obj.kind) && !obj.dungeonId) ||
        (obj.kind === 'merchant' && !obj.shopId) || (obj.kind === 'healer' && !obj.healingCost) ||
        (obj.destinationPosition && obj.kind !== 'portal') ||
        (obj.kind === 'gate' && !obj.gateType) || (obj.kind === 'key' && !obj.keyType)) {
      ctx.addIssue({ code: 'custom', message: 'World object is missing its content reference' });
    }
    seen.add(obj.id); positions.add(pos);
  }
  const decorationIds = new Set<string>();
  const decoratedObjects = new Set<string>();
  for (const decoration of map.decorations) {
    const object = map.objects.find((obj) => obj.id === decoration.objectId);
    if (decorationIds.has(decoration.id) || decoration.x + decoration.size > map.width || decoration.y + decoration.size > map.height ||
        (decoration.objectId && (!object || !decorationContains(decoration, object) || decoratedObjects.has(decoration.objectId))) ||
        (decoration.blocking && [map.entry, ...map.objects].some((p) => decorationContains(decoration, p)))) {
      ctx.addIssue({ code: 'custom', message: 'Invalid decoration bounds, object, or blocking footprint' });
    }
    decorationIds.add(decoration.id);
    if (decoration.objectId) decoratedObjects.add(decoration.objectId);
  }
});
export type WorldMap = z.infer<typeof WorldMapSchema>;
export function validateWorldReferences(content: { worlds: WorldMap[]; maps: { id: string }[]; items: { id: string }[]; dungeons: { id: string }[]; shops: { id: string }[]; atlases: { id: string; columns: number; rows: number }[] }, ctx: z.RefinementCtx) {
  for (const map of content.worlds) for (const decoration of map.decorations) {
    const atlas = content.atlases.find((entry) => entry.id === decoration.sprite.atlas);
    if (!atlas || decoration.sprite.frame >= atlas.columns * atlas.rows) ctx.addIssue({ code: 'custom', message: 'Unknown decoration sprite' });
  }
  for (const map of content.worlds) for (const obj of map.objects) {
    if (obj.sprite) {
      const sprite = obj.sprite;
      const atlas = content.atlases.find((entry) => entry.id === sprite.atlas);
      if (!atlas || sprite.frame >= atlas.columns * atlas.rows) ctx.addIssue({ code: 'custom', message: 'Unknown world object sprite' });
    }
    if ((obj.destination && !content.worlds.some((m) => m.id === obj.destination)) ||
        (obj.encounterMap && !content.maps.some((m) => m.id === obj.encounterMap)) ||
        (obj.itemId && !content.items.some((m) => m.id === obj.itemId)) ||
        (obj.dungeonId && !content.dungeons.some((d) => d.id === obj.dungeonId)) ||
        (obj.shopId && !content.shops.some((shop) => shop.id === obj.shopId))) ctx.addIssue({ code: 'custom', message: 'Unknown world reference' });
    if (obj.destinationPosition) {
      const target = content.worlds.find((world) => world.id === obj.destination);
      const p = obj.destinationPosition;
      if (!target || p.x >= target.width || p.y >= target.height || target.tiles[p.y * target.width + p.x] === 1 ||
          target.objects.some((other) => other.x === p.x && other.y === p.y && (other.blocked || ['npc', 'chest', 'merchant', 'healer'].includes(other.kind))) ||
          target.decorations.some((decoration) => decoration.blocking && decorationContains(decoration, p))) {
        ctx.addIssue({ code: 'custom', message: 'Portal arrival must be walkable' });
      }
    }
  }
}
