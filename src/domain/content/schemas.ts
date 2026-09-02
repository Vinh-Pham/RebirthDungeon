/**
 * Content schemas. Each matches one bundled file under `assets/data/`:
 * `{ version, <collection>: [...] }`. Zod validates at the trust boundary
 * (load time / tests), and the inferred types are what engines consume.
 */

import { z } from 'zod';
import {
  abilityIdSchema,
  bannerIdSchema,
  dieIdSchema,
  dungeonIdSchema,
  encounterIdSchema,
  experienceCurveIdSchema,
  heroIdSchema,
  itemIdSchema,
  lootTableIdSchema,
  monsterIdSchema,
  rarityTableIdSchema,
  statusEffectIdSchema,
} from './ids';

export const CONTENT_VERSION = 1;
const contentVersion = z.literal(CONTENT_VERSION);

const nonnegativeInt = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();
const name = z.string().min(1).max(48);
const weight = z.number().positive().max(1_000_000);

// --- dice -------------------------------------------------------------------

export const dieSchema = z.object({
  id: dieIdSchema,
  name,
  sides: z.number().int().min(2).max(20),
});
export type DieDefinition = z.infer<typeof dieSchema>;

// --- status effects ----------------------------------------------------------

export const statusEffectSchema = z.object({
  id: statusEffectIdSchema,
  name,
  kind: z.enum(['buff', 'debuff']),
  maxStacks: positiveInt.max(20),
  damagePerTurnPerStack: nonnegativeInt.optional(),
  defensePerStack: nonnegativeInt.optional(),
  attackPerStack: nonnegativeInt.optional(),
});
export type StatusEffectDefinition = z.infer<typeof statusEffectSchema>;

// --- abilities ---------------------------------------------------------------

export const abilitySchema = z.object({
  id: abilityIdSchema,
  name,
  description: z.string().min(1).max(200),
  kind: z.enum(['attack', 'heal', 'shield', 'status']),
  target: z.enum(['enemy', 'self']),
  /** How many assigned dice the ability consumes when used. */
  diceCost: positiveInt.max(6),
  /** Base effect magnitude (damage, heal amount, or shield strength). */
  power: nonnegativeInt,
  critBonus: nonnegativeInt.optional(),
  appliesStatus: z
    .object({
      statusId: statusEffectIdSchema,
      stacks: positiveInt.max(20),
    })
    .optional(),
});
export type AbilityDefinition = z.infer<typeof abilitySchema>;

// --- heroes ------------------------------------------------------------------

export const heroSchema = z.object({
  id: heroIdSchema,
  name,
  maxHp: positiveInt,
  baseAttack: nonnegativeInt,
  baseDefense: nonnegativeInt,
  dice: z.array(dieIdSchema).min(1).max(6),
  abilities: z.array(abilityIdSchema).min(1).max(6),
});
export type HeroDefinition = z.infer<typeof heroSchema>;

// --- monsters ----------------------------------------------------------------

export const monsterSchema = z.object({
  id: monsterIdSchema,
  name,
  hp: positiveInt,
  attack: nonnegativeInt,
  defense: nonnegativeInt.default(0),
  dice: z.array(dieIdSchema).min(1).max(4),
  abilities: z.array(abilityIdSchema).min(1).max(4),
  lootTableId: lootTableIdSchema.optional(),
  /** Status id -> chance (0..1) to apply per relevant action. */
  resistances: z
    .record(statusEffectIdSchema, z.number().min(0).max(1))
    .optional(),
});
export type MonsterDefinition = z.infer<typeof monsterSchema>;

// --- items -------------------------------------------------------------------

export const itemSlotSchema = z.enum(['weapon', 'armor', 'trinket']);
export const itemRaritySchema = z.enum(['common', 'rare', 'epic', 'legendary']);

const equipmentDetails = z.object({
  slot: itemSlotSchema,
  attackBonus: nonnegativeInt.default(0),
  defenseBonus: nonnegativeInt.default(0),
  maxHpBonus: nonnegativeInt.default(0),
});

const consumableDetails = z
  .object({
    healAmount: nonnegativeInt.optional(),
    statusId: statusEffectIdSchema.optional(),
    statusStacks: positiveInt.max(20).optional(),
  })
  .refine(
    (value) => value.healAmount !== undefined || value.statusId !== undefined,
    { message: 'consumable items need healAmount or a statusId' },
  );

export const itemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('equipment'),
    id: itemIdSchema,
    name,
    rarity: itemRaritySchema,
    value: nonnegativeInt,
    equipment: equipmentDetails,
  }),
  z.object({
    kind: z.literal('consumable'),
    id: itemIdSchema,
    name,
    rarity: itemRaritySchema,
    value: nonnegativeInt,
    consumable: consumableDetails,
  }),
  z.object({
    kind: z.literal('material'),
    id: itemIdSchema,
    name,
    rarity: itemRaritySchema,
    value: nonnegativeInt,
  }),
]);
export type ItemDefinition = z.infer<typeof itemSchema>;

// --- loot tables ---------------------------------------------------------------

export const lootTableSchema = z
  .object({
    id: lootTableIdSchema,
    name,
    rolls: positiveInt.max(10),
    entries: z
      .array(z.object({ itemId: itemIdSchema, weight }))
      .min(1)
      .max(50),
  })
  .refine(
    (table) =>
      new Set(table.entries.map((entry) => entry.itemId)).size ===
      table.entries.length,
    {
      message: 'loot table has duplicate itemId entries',
    },
  );
export type LootTableDefinition = z.infer<typeof lootTableSchema>;

// --- rarity tables -------------------------------------------------------------

export const rarityTableSchema = z.object({
  id: rarityTableIdSchema,
  name,
  entries: z
    .array(z.object({ rarity: itemRaritySchema, weight }))
    .min(1)
    .max(4),
});
export type RarityTableDefinition = z.infer<typeof rarityTableSchema>;

// --- encounters ----------------------------------------------------------------

export const encounterSchema = z.object({
  id: encounterIdSchema,
  name,
  monsterIds: z.array(monsterIdSchema).min(1).max(4),
  lootTableId: lootTableIdSchema.optional(),
});
export type EncounterDefinition = z.infer<typeof encounterSchema>;

// --- dungeons ------------------------------------------------------------------

export const dungeonSchema = z.object({
  id: dungeonIdSchema,
  name,
  description: z.string().min(1).max(200),
  floorCount: positiveInt.max(10),
  encountersPerFloor: positiveInt.max(8),
  encounterIds: z.array(encounterIdSchema).min(1),
  bossEncounterId: encounterIdSchema,
  rewardLootTableId: lootTableIdSchema.optional(),
});
export type DungeonDefinition = z.infer<typeof dungeonSchema>;

// --- banners ---------------------------------------------------------------------

export const bannerSchema = z
  .object({
    id: bannerIdSchema,
    name,
    kind: z.enum(['standard', 'featured']),
    currency: z.enum(['gems', 'tickets']),
    costPerPull: positiveInt,
    costPerTenPull: positiveInt,
    rarityTableId: rarityTableIdSchema,
    featuredHeroId: heroIdSchema.optional(),
  })
  .refine(
    (banner) =>
      banner.kind === 'standard' || banner.featuredHeroId !== undefined,
    {
      message: 'featured banners must declare featuredHeroId',
    },
  );
export type BannerDefinition = z.infer<typeof bannerSchema>;

// --- experience curves ------------------------------------------------------------

export const experienceCurveSchema = z
  .object({
    id: experienceCurveIdSchema,
    name,
    levels: z
      .array(z.object({ level: positiveInt, totalXp: nonnegativeInt }))
      .min(2)
      .max(100),
  })
  .refine(
    (curve) => curve.levels[0].level === 1 && curve.levels[0].totalXp === 0,
    { message: 'experience curves must start at level 1 with 0 total xp' },
  )
  .refine(
    (curve) =>
      curve.levels.every(
        (entry, index) =>
          index === 0 ||
          (entry.level === curve.levels[index - 1].level + 1 &&
            entry.totalXp > curve.levels[index - 1].totalXp),
      ),
    {
      message:
        'experience curve levels must be consecutive with strictly increasing xp',
    },
  );
export type ExperienceCurveDefinition = z.infer<typeof experienceCurveSchema>;

// --- file wrappers ------------------------------------------------------------------

/**
 * Each bundled file is `{ version, <collectionName>: [...] }`. Keys mirror the
 * JSON files exactly; `contentFileSchemas` is keyed by the file base name so
 * the catalog loader can validate raw JSON with actionable per-file paths.
 */
export const contentFileSchemas = {
  heroes: z.object({ version: contentVersion, heroes: z.array(heroSchema) }),
  monsters: z.object({
    version: contentVersion,
    monsters: z.array(monsterSchema),
  }),
  dice: z.object({ version: contentVersion, dice: z.array(dieSchema) }),
  abilities: z.object({
    version: contentVersion,
    abilities: z.array(abilitySchema),
  }),
  'status-effects': z.object({
    version: contentVersion,
    statusEffects: z.array(statusEffectSchema),
  }),
  items: z.object({ version: contentVersion, items: z.array(itemSchema) }),
  'loot-tables': z.object({
    version: contentVersion,
    lootTables: z.array(lootTableSchema),
  }),
  'rarity-tables': z.object({
    version: contentVersion,
    rarityTables: z.array(rarityTableSchema),
  }),
  encounters: z.object({
    version: contentVersion,
    encounters: z.array(encounterSchema),
  }),
  dungeons: z.object({
    version: contentVersion,
    dungeons: z.array(dungeonSchema),
  }),
  banners: z.object({
    version: contentVersion,
    banners: z.array(bannerSchema),
  }),
  'experience-curves': z.object({
    version: contentVersion,
    experienceCurves: z.array(experienceCurveSchema),
  }),
} as const;

export type ContentFileName = keyof typeof contentFileSchemas;
export type ContentFilesInput = { readonly [K in ContentFileName]: unknown };

export const heroesFileSchema = contentFileSchemas.heroes;
export const monstersFileSchema = contentFileSchemas.monsters;
export const diceFileSchema = contentFileSchemas.dice;
export const abilitiesFileSchema = contentFileSchemas.abilities;
export const statusEffectsFileSchema = contentFileSchemas['status-effects'];
export const itemsFileSchema = contentFileSchemas.items;
export const lootTablesFileSchema = contentFileSchemas['loot-tables'];
export const rarityTablesFileSchema = contentFileSchemas['rarity-tables'];
export const encountersFileSchema = contentFileSchemas.encounters;
export const dungeonsFileSchema = contentFileSchemas.dungeons;
export const bannersFileSchema = contentFileSchemas.banners;
export const experienceCurvesFileSchema =
  contentFileSchemas['experience-curves'];
