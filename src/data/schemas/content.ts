import { z } from 'zod';
import { WorldMapSchema, validateWorldReferences } from './world';

const id = z.string().trim().min(1);
const uint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const positive = uint.min(1);
const probability = z.number().min(0).max(1);
export const SkillRankSchema = z.enum(['F', 'E', 'D', 'C', 'B', 'A', '9', '8', '7', '6', '5', '4', '3', '2', '1']);
const SkillReferenceSchema = z.strictObject({
  url: z.url(), retrievedAt: z.iso.date(),
  ranks: z.array(SkillRankSchema).length(15),
  rows: z.array(z.strictObject({ label: id, values: z.array(z.string()).length(15) })),
  effects: z.record(SkillRankSchema, z.array(z.string())),
});
export const SpriteSchema = z.strictObject({ atlas: id, frame: uint, idleFrames: z.array(uint).min(1).optional() });
export const CombatStatsSchema = z.strictObject({
  attack: uint.max(1000000), defense: uint.max(1000000), speed: uint.max(1000000),
  hitChance: probability.default(0.95), evasion: probability.default(0),
  criticalChance: probability.default(0.1), criticalMultiplier: z.number().min(1).max(10).default(1.5),
}).refine((stats) => Number.isSafeInteger(Math.floor(Math.max(1, stats.attack) * stats.criticalMultiplier)),
  { message: 'Combat damage must fit within safe integer range' });
export const SkillSchema = z.strictObject({
  id, name: id, manaCost: uint, power: uint.max(1000000),
  element: z.enum(['physical', 'fire', 'ice', 'lightning']),
  target: z.enum(['self', 'ally', 'enemy', 'allEnemies']),
  effect: z.enum(['damage', 'heal', 'buff']).default('damage'),
  statuses: z.array(id).default([]),
  hitChance: probability.default(1), criticalChance: probability.default(0),
  category: z.enum(['combat', 'magic', 'life']).optional(),
  kind: z.enum(['active', 'passive', 'life']).optional(),
  battleUsable: z.boolean().optional(),
  rank: SkillRankSchema.optional(), description: z.string().optional(),
  reference: SkillReferenceSchema.optional(),
}).refine((skill) => skill.effect === 'damage'
  ? ['enemy', 'allEnemies'].includes(skill.target) : ['self', 'ally'].includes(skill.target),
{ message: 'Damage skills target enemies; healing skills target self or allies' });
const actor = { id, name: id, maxHealth: positive.max(100000), maxMana: uint.max(100000),
  combatant: CombatStatsSchema, skills: z.array(id), sprite: SpriteSchema };
export const EnemySchema = z.strictObject({ ...actor, experience: uint.max(10000).default(0), gold: uint.max(10000).default(0),
  loot: z.array(z.strictObject({ itemId: id, chance: probability, min: positive.max(99), max: positive.max(99) })
    .refine((drop) => drop.min <= drop.max)).default([]) });
export const ClassSchema = z.strictObject(actor);
export const ItemSchema = z.strictObject({ id, name: id, kind: z.enum(['consumable', 'weapon', 'armor']),
  price: uint.max(100000), power: uint.max(10000), description: z.string(),
  stat: z.enum(['attack', 'defense', 'speed']).optional() });
export const StatusEffectSchema = z.strictObject({ id, name: id, duration: positive.max(100),
  tickTiming: z.enum(['turnStart', 'turnEnd']), stacking: z.enum(['refresh', 'stack', 'ignore']),
  effect: z.enum(['damage', 'heal', 'stat']), power: uint.max(10000),
  stat: z.enum(['attack', 'defense', 'speed']).optional(), modifier: z.number().int().min(-1000).max(1000).default(0),
}).refine((status) => status.effect !== 'stat' || !!status.stat, { message: 'Stat effects require a stat' });
export const AtlasSchema = z.strictObject({ id, columns: positive, rows: positive, frameWidth: positive, frameHeight: positive });
export const MapSchema = z.strictObject({ id, name: id, width: positive.max(128), height: positive.max(128),
  tileSize: positive.max(128), tiles: z.array(z.number().int().min(0).max(2)),
  spawns: z.array(z.strictObject({ entityId: id, kind: z.enum(['player', 'enemy']), definitionId: id, x: uint, y: uint })),
}).superRefine((map, ctx) => {
  if (map.tiles.length !== map.width * map.height) ctx.addIssue({ code: 'custom', message: 'Tile count must match map dimensions', path: ['tiles'] });
  const seen = new Set<string>();
  map.spawns.forEach((spawn, index) => {
    if (seen.has(spawn.entityId) || spawn.x >= map.width || spawn.y >= map.height || map.tiles[spawn.y * map.width + spawn.x] === 1) {
      ctx.addIssue({ code: 'custom', message: 'Spawns require unique IDs and walkable in-bounds tiles', path: ['spawns', index] });
    }
    seen.add(spawn.entityId);
  });
  if (!map.spawns.some((spawn) => spawn.kind === 'player') || !map.spawns.some((spawn) => spawn.kind === 'enemy')) {
    ctx.addIssue({ code: 'custom', message: 'Encounter maps need both sides', path: ['spawns'] });
  }
});

export const ContentSchema = z.strictObject({ skills: z.array(SkillSchema), enemies: z.array(EnemySchema),
  classes: z.array(ClassSchema), items: z.array(ItemSchema), statusEffects: z.array(StatusEffectSchema),
  atlases: z.array(AtlasSchema), maps: z.array(MapSchema), worlds: z.array(WorldMapSchema).default([]),
}).superRefine((content, ctx) => {
  for (const key of ['skills', 'enemies', 'classes', 'items', 'statusEffects', 'atlases', 'maps', 'worlds'] as const) {
    const seen = new Set<string>();
    content[key].forEach((entry, index) => {
      if (seen.has(entry.id)) ctx.addIssue({ code: 'custom', message: `Duplicate ${key} ID: ${entry.id}`, path: [key, index, 'id'] });
      seen.add(entry.id);
    });
  }
  for (const key of ['enemies', 'classes'] as const) content[key].forEach((entry, index) => {
    for (const skillId of entry.skills) {
      const skill = content.skills.find((skill) => skill.id === skillId);
      if (!skill) ctx.addIssue({ code: 'custom', message: `Unknown skill: ${skillId}`, path: [key, index, 'skills'] });
      else if (skill.effect === 'damage' && !Number.isSafeInteger(Math.floor(
        Math.max(1, entry.combatant.attack + skill.power) * entry.combatant.criticalMultiplier))) {
        ctx.addIssue({ code: 'custom', message: 'Skill damage must fit within safe integer range', path: [key, index, 'skills'] });
      }
    }
    const atlas = content.atlases.find((atlas) => atlas.id === entry.sprite.atlas);
    if (!atlas || [entry.sprite.frame, ...(entry.sprite.idleFrames ?? [])].some((frame) => frame >= atlas.columns * atlas.rows)) {
      ctx.addIssue({ code: 'custom', message: 'Unknown atlas or invalid sprite frame', path: [key, index, 'sprite'] });
    }
  });
  validateWorldReferences(content, ctx);
  content.skills.forEach((skill, index) => skill.statuses.forEach((statusId) => {
    if (!content.statusEffects.some((status) => status.id === statusId)) ctx.addIssue({ code: 'custom', message: 'Unknown skill status', path: ['skills', index, 'statuses'] });
  }));
  content.enemies.forEach((enemy, index) => enemy.loot.forEach((drop) => {
    if (!content.items.some((item) => item.id === drop.itemId)) ctx.addIssue({ code: 'custom', message: 'Unknown loot item', path: ['enemies', index, 'loot'] });
  }));
  content.maps.forEach((map, index) => map.spawns.forEach((spawn, spawnIndex) => {
    const definitions = spawn.kind === 'player' ? content.classes : content.enemies;
    if (!definitions.some((entry) => entry.id === spawn.definitionId)) {
      ctx.addIssue({ code: 'custom', message: `Unknown spawn definition: ${spawn.definitionId}`, path: ['maps', index, 'spawns', spawnIndex] });
    }
  }));
});

export type GameContent = z.infer<typeof ContentSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type ActorDefinition = z.infer<typeof ClassSchema>;
export type ItemDefinition = z.infer<typeof ItemSchema>;
export type StatusDefinition = z.infer<typeof StatusEffectSchema>;
export type TileMap = z.infer<typeof MapSchema>;
export type SpriteAtlas = z.infer<typeof AtlasSchema>;
