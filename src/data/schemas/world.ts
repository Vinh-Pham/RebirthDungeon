import { z } from 'zod';
const id = z.string().min(1);
const point = { x: z.number().int().min(0), y: z.number().int().min(0) };
export const WorldMapSchema = z.strictObject({
  id, name: id, width: z.number().int().min(3).max(128), height: z.number().int().min(3).max(128),
  tileSize: z.number().int().min(16).max(128), tiles: z.array(z.number().int().min(0).max(2)),
  entry: z.strictObject(point),
  objects: z.array(z.strictObject({ id, ...point, name: id,
    kind: z.enum(['npc', 'chest', 'rest', 'portal', 'encounter', 'dungeonEntrance', 'statue', 'mimic', 'fountain', 'gate', 'key', 'finalChest']),
    dialogue: z.string().default(''), itemId: id.optional(), quantity: z.number().int().min(1).max(99).default(1),
    destination: id.optional(), encounterMap: id.optional(),
    dungeonId: id.optional(), gateType: z.enum(['boss', 'treasure']).optional(), keyType: z.enum(['boss', 'treasure']).optional(), blocked: z.boolean().default(false),
  })),
}).superRefine((map, ctx) => {
  const valid = (p: { x: number; y: number }) => p.x < map.width && p.y < map.height && map.tiles[p.y * map.width + p.x] !== 1;
  if (map.tiles.length !== map.width * map.height || !valid(map.entry)) ctx.addIssue({ code: 'custom', message: 'Invalid world tiles or entry' });
  if (map.objects.some((obj) => obj.x === map.entry.x && obj.y === map.entry.y && ['npc', 'chest'].includes(obj.kind))) ctx.addIssue({ code: 'custom', message: 'World entry must be walkable' });
  const seen = new Set<string>();
  const positions = new Set<string>();
  for (const obj of map.objects) {
    const pos = `${obj.x},${obj.y}`;
    if (seen.has(obj.id) || positions.has(pos) || !valid(obj)) ctx.addIssue({ code: 'custom', message: 'Invalid or duplicate world object' });
    if ((obj.kind === 'portal' && !obj.destination) || (['encounter', 'mimic'].includes(obj.kind) && !obj.encounterMap) ||
        (['chest', 'finalChest'].includes(obj.kind) && !obj.itemId) || (obj.kind === 'dungeonEntrance' && !obj.dungeonId) ||
        (obj.kind === 'gate' && !obj.gateType) || (obj.kind === 'key' && !obj.keyType)) {
      ctx.addIssue({ code: 'custom', message: 'World object is missing its content reference' });
    }
    seen.add(obj.id); positions.add(pos);
  }
});
export type WorldMap = z.infer<typeof WorldMapSchema>;
export function validateWorldReferences(content: { worlds: WorldMap[]; maps: { id: string }[]; items: { id: string }[]; dungeons: { id: string }[] }, ctx: z.RefinementCtx) {
  for (const map of content.worlds) for (const obj of map.objects) {
    if ((obj.destination && !content.worlds.some((m) => m.id === obj.destination)) ||
        (obj.encounterMap && !content.maps.some((m) => m.id === obj.encounterMap)) ||
        (obj.itemId && !content.items.some((m) => m.id === obj.itemId)) ||
        (obj.dungeonId && !content.dungeons.some((d) => d.id === obj.dungeonId))) ctx.addIssue({ code: 'custom', message: 'Unknown world reference' });
  }
}
