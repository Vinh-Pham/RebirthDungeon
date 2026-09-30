import { z } from 'zod';
import { HeroSchema, validateHero } from '../engine/rpg/Character';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { isWalkable } from '../engine/world/TileMap';
const point = z.strictObject({ x: z.number().int().min(0), y: z.number().int().min(0) });
const id = z.string().min(1);
export const CampaignSchema = z.strictObject({
  seed: z.number().int().min(-2147483648).max(2147483647),
  randomState: z.array(z.number().int().min(-2147483648).max(2147483647)).length(4).refine((s) => s.some((v) => v !== 0)),
  hero: HeroSchema, worldId: id, position: point, opened: z.array(id).max(10000), cleared: z.array(id).max(10000),
  encounterCount: z.number().int().min(0).max(1000000),
  pending: z.strictObject({ objectId: id, worldId: id, mapId: id, seed: z.number().int().min(-2147483648).max(2147483647) }).optional(),
  audio: z.strictObject({ music: z.number().min(0).max(1), sfx: z.number().min(0).max(1), enabled: z.boolean() }),
});
export const SaveSchema = z.strictObject({ version: z.literal(2), savedAt: z.string().datetime(), campaign: CampaignSchema });
const LegacySaveSchema = z.strictObject({ version: z.literal(1), savedAt: z.string().datetime(),
  campaign: CampaignSchema.omit({ audio: true }) });
export type CampaignState = z.infer<typeof CampaignSchema>;
export type SaveGame = z.infer<typeof SaveSchema>;
export function validateCampaign(raw: unknown, content: ContentRegistry): CampaignState {
  const state = CampaignSchema.parse(raw);
  validateHero(state.hero, content);
  const map = content.data.worlds.find((map) => map.id === state.worldId);
  if (!map || !isWalkable(map, state.position)) throw new Error('Save has an invalid map or position');
  for (const [keys, kind] of [[state.opened, 'chest'], [state.cleared, 'encounter']] as const) {
    if (new Set(keys).size !== keys.length) throw new Error('Duplicate saved world flags');
    for (const key of keys) if (!content.data.worlds.some((map) => map.objects.some((obj) => `${map.id}/${obj.id}` === key && obj.kind === kind))) throw new Error('Unknown saved world object');
  }
  if (state.pending) {
    const pending = state.pending;
    const object = map.objects.find((obj) => obj.id === pending.objectId && obj.kind === 'encounter');
    if (pending.worldId !== state.worldId || !object || object.encounterMap !== pending.mapId ||
      state.cleared.includes(`${map.id}/${object.id}`) || state.position.x !== object.x || state.position.y !== object.y) throw new Error('Invalid encounter checkpoint');
  }
  return state;
}
export function parseSave(raw: unknown, content: ContentRegistry): SaveGame {
  const version = (raw as { version?: unknown } | null)?.version;
  const migrated = version === 1 ? (() => {
    const legacy = LegacySaveSchema.parse(raw);
    return { ...legacy, version: 2, campaign: { ...legacy.campaign, audio: { music: 0.3, sfx: 0.7, enabled: false } } };
  })() : raw;
  const save = SaveSchema.parse(migrated);
  return { ...save, campaign: validateCampaign(save.campaign, content) };
}
export function encodeSave(state: CampaignState, content: ContentRegistry, savedAt = new Date().toISOString()): string {
  return JSON.stringify(parseSave({ version: 2, savedAt, campaign: state }, content));
}
