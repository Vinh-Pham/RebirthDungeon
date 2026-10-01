import { emptyEnchantProgression } from '../engine/rpg/EnchantState';
import { emptyQuestProgression } from '../engine/rpg/Quests';
import { starterProgression } from '../engine/rpg/Skills';
import { z } from 'zod';
import { HeroSchema, LegacyHeroSchema, VersionFourHeroSchema, VersionFiveHeroSchema, VersionSixHeroSchema, VersionSevenHeroSchema, migrateEquipmentHero, migrateHero, restoreHero, validateHero } from '../engine/rpg/Character';
import type { GrowthTalent } from '../engine/rpg/Stats';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { isWalkable } from '../engine/world/TileMap';
import { DungeonRunSchema, inRoom, projectDungeonMap, reachableTiles, validateDungeon } from '../engine/dungeon/Dungeon';
const point = z.strictObject({ x: z.number().int().min(0), y: z.number().int().min(0) });
const id = z.string().min(1);
export const CampaignSchema = z.strictObject({
  seed: z.number().int().min(-2147483648).max(2147483647),
  randomState: z.array(z.number().int().min(-2147483648).max(2147483647)).length(4).refine((s) => s.some((v) => v !== 0)),
  hero: HeroSchema, worldId: id, position: point, opened: z.array(id).max(10000), cleared: z.array(id).max(10000),
  encounterCount: z.number().int().min(0).max(1000000),
  pending: z.strictObject({ objectId: id, worldId: id, mapId: id, seed: z.number().int().min(-2147483648).max(2147483647) }).optional(),
  audio: z.strictObject({ music: z.number().min(0).max(1), sfx: z.number().min(0).max(1), enabled: z.boolean() }),
  dungeon: DungeonRunSchema.optional(),
});
export const SaveSchema = z.strictObject({ version: z.literal(8), savedAt: z.string().datetime(), campaign: CampaignSchema });
const VersionSevenSchema = z.strictObject({ version: z.literal(7), savedAt: z.string().datetime(), campaign: CampaignSchema.extend({ hero: VersionSevenHeroSchema }) });
const VersionSixSchema = z.strictObject({ version: z.literal(6), savedAt: z.string().datetime(), campaign: CampaignSchema.extend({ hero: VersionSixHeroSchema }) });
const VersionFiveSchema = z.strictObject({ version: z.literal(5), savedAt: z.string().datetime(), campaign: CampaignSchema.extend({ hero: VersionFiveHeroSchema }) });
const VersionFourSchema = z.strictObject({ version: z.literal(4), savedAt: z.string().datetime(), campaign: CampaignSchema.extend({ hero: VersionFourHeroSchema }) });
const LegacyCampaignSchema = CampaignSchema.extend({ hero: LegacyHeroSchema });
const VersionThreeSchema = z.strictObject({ version: z.literal(3), savedAt: z.string().datetime(), campaign: LegacyCampaignSchema });
const VersionTwoSchema = z.strictObject({ version: z.literal(2), savedAt: z.string().datetime(), campaign: LegacyCampaignSchema.omit({ dungeon: true }) });
const LegacySaveSchema = z.strictObject({ version: z.literal(1), savedAt: z.string().datetime(),
  campaign: LegacyCampaignSchema.omit({ audio: true, dungeon: true }) });
export type CampaignState = z.infer<typeof CampaignSchema>;
export type SaveGame = z.infer<typeof SaveSchema>;
export function validateCampaign(raw: unknown, content: ContentRegistry): CampaignState {
  const state = CampaignSchema.parse(raw);
  validateHero(state.hero, content);
  if (state.dungeon) validateDungeon(state.dungeon, content);
  const map = state.dungeon ? projectDungeonMap(state.dungeon) : content.data.worlds.find((map) => map.id === state.worldId);
  if (state.dungeon && state.worldId !== state.dungeon.blueprint.world.id) throw new Error('Save has an invalid dungeon world');
  if (!map || !isWalkable(map, state.position)) throw new Error('Save has an invalid map or position');
  if (state.dungeon && !reachableTiles(map).has(state.position.x + ',' + state.position.y)) throw new Error('Save position bypasses a dungeon gate');
  for (const [keys, kind] of [[state.opened, 'chest'], [state.cleared, 'encounter']] as const) {
    if (new Set(keys).size !== keys.length) throw new Error('Duplicate saved world flags');
    for (const key of keys) if (!content.data.worlds.some((map) => map.objects.some((obj) => `${map.id}/${obj.id}` === key && obj.kind === kind))) throw new Error('Unknown saved world object');
  }
  if (state.pending) {
    const pending = state.pending;
    if (state.dungeon) {
      const encounter = state.dungeon.blueprint.encounters.find((entry) => entry.objectId === pending.objectId);
      const object = state.dungeon.blueprint.world.objects.find((entry) => entry.id === pending.objectId);
      const room = state.dungeon.blueprint.rooms.find((room) => room.id === encounter?.roomId);
      const atEncounter = encounter?.kind === 'boss' ? !!room && inRoom(room, state.position)
        : encounter?.kind === 'mimic' ? !!object && Math.abs(object.x - state.position.x) + Math.abs(object.y - state.position.y) <= 1 && state.dungeon.revealedMimics.includes(object.id)
        : !!object && object.x === state.position.x && object.y === state.position.y;
      if (!encounter || !atEncounter || pending.worldId !== state.worldId || pending.mapId !== encounter.map.id || pending.seed !== encounter.seed || state.dungeon.cleared.includes(pending.objectId)) throw new Error('Invalid dungeon encounter checkpoint');
    } else {
      const object = map.objects.find((obj) => obj.id === pending.objectId && obj.kind === 'encounter');
      if (pending.worldId !== state.worldId || !object || object.encounterMap !== pending.mapId ||
        state.cleared.includes(`${map.id}/${object.id}`) || state.position.x !== object.x || state.position.y !== object.y) throw new Error('Invalid encounter checkpoint');
    }
  }
  if (state.dungeon?.revealedMimics.some((id) => !state.dungeon!.cleared.includes(id) && state.pending?.objectId !== id)) throw new Error('Invalid unresolved mimic');
  return state;
}
export function parseSave(raw: unknown, content: ContentRegistry, growthTalent?: GrowthTalent): SaveGame {
  const version = (raw as { version?: unknown } | null)?.version;
  let migrated = raw;
  if (version === 1 || version === 2 || version === 3 || version === 4 || version === 5 || version === 6 || version === 7) {
    const legacy = version === 1 ? LegacySaveSchema.parse(raw) : version === 2 ? VersionTwoSchema.parse(raw) : version === 3 ? VersionThreeSchema.parse(raw) : version === 4 ? VersionFourSchema.parse(raw) : version === 5 ? VersionFiveSchema.parse(raw) : version === 6 ? VersionSixSchema.parse(raw) : VersionSevenSchema.parse(raw);
    const talent = growthTalent ?? 'warrior';
    // Preserve the original wire contract before restoring into the new stat system.
    const old = legacy.campaign.hero;
    const definition = content.data.classes.find((entry) => entry.id === old.classId);
    if (!definition || (version < 5 && (old.health > definition.maxHealth + (old.level - 1) * 5 || old.mana > definition.maxMana + (old.level - 1) * 2))) throw new Error('Invalid legacy character resources');
    const olderHero = version === 7 ? VersionSevenHeroSchema.parse(old) : version === 6 ? { ...VersionSixHeroSchema.parse(old), ...emptyQuestProgression() } : version === 5 ? { ...VersionFiveHeroSchema.parse(old), ...emptyQuestProgression(), ...starterProgression(old.classId, content) } : version === 4 ? { ...emptyQuestProgression(), ...starterProgression(old.classId, content), ...VersionFourHeroSchema.parse(old), growthTalent: talent, stamina: 0, wounds: 0, fullness: 100 } : migrateHero(old, content, talent);
    const hero = version >= 4 ? migrateEquipmentHero(olderHero as z.infer<typeof VersionSevenHeroSchema>, content, legacy.campaign.seed) : olderHero as z.infer<typeof HeroSchema>;
    if (version < 4) hero.enchanting = emptyEnchantProgression(legacy.campaign.seed).enchanting;
    if (version < 5) restoreHero(hero, content);
    migrated = { ...legacy, version: 8, campaign: { ...legacy.campaign,
      audio: 'audio' in legacy.campaign ? legacy.campaign.audio : { music: 0.3, sfx: 0.7, enabled: false },
      hero,
    } };
  }
  const save = SaveSchema.parse(migrated);
  if (growthTalent && save.campaign.hero.growthTalent !== growthTalent) throw new Error('Saved talent does not match this character');
  return { ...save, campaign: validateCampaign(save.campaign, content) };
}
export function encodeSave(state: CampaignState, content: ContentRegistry, savedAt = new Date().toISOString()): string {
  return JSON.stringify(parseSave({ version: 8, savedAt, campaign: state }, content));
}
