import { z } from 'zod';
import { ContentSchema } from '../data/schemas/content';
import { HeroSchema } from '../engine/rpg/Character';
import {
  MetadataSchema,
  CharacterStatsSchema,
  PublicViewSchema,
  ReceiptSchema,
  PreviewResponseSchema,
} from './Contracts';
import { BattleActorSchema } from '../game/BattlePersistence';

export const GAME_API_VERSION = 2;
export const FeatureSchemas = {
  character: MetadataSchema,
  progression: HeroSchema.pick({
    classId: true,
    level: true,
    cumulativeLevel: true,
    experience: true,
    gold: true,
    ap: true,
    growthTalent: true,
    claimedMilestones: true,
  }),
  resources: HeroSchema.pick({
    health: true,
    mana: true,
    stamina: true,
    wounds: true,
    fullness: true,
  }),
  stats: z.strictObject({
    stats: CharacterStatsSchema,
    source: BattleActorSchema.shape.statSource.unwrap(),
    weapon: z
      .strictObject({ name: z.string(), durability: z.number(), maxDurability: z.number() })
      .optional(),
  }),
  inventory: HeroSchema.pick({ inventory: true, weapons: true, armors: true, itemHotbar: true }),
  equipment: HeroSchema.shape.equipment,
  skills: HeroSchema.pick({ discoveredSkills: true, learnedSkills: true, bookCollections: true }),
  quests: HeroSchema.pick({ quests: true, questFlags: true, trackedObjectives: true }),
  titles: HeroSchema.pick({ earnedTitles: true, titleCollection: true }),
  enchanting: z.strictObject({ receipts: HeroSchema.shape.enchanting.shape.receipts }),
  journey: PublicViewSchema.pick({
    worldId: true,
    position: true,
    map: true,
    opened: true,
    cleared: true,
    activeService: true,
    claimedObjectIds: true,
  }),
  rest: z.strictObject({ resting: z.boolean() }),
  dungeon: PublicViewSchema.shape.dungeon.unwrap().nullable(),
  encounter: PublicViewSchema.shape.encounter.unwrap().nullable(),
} as const;
export type GameFeature = keyof typeof FeatureSchemas;
export const GAME_FEATURES = Object.keys(FeatureSchemas) as GameFeature[];
export const FeatureNameSchema = z.enum(GAME_FEATURES);
export type FeatureData = { [K in GameFeature]: z.output<(typeof FeatureSchemas)[K]> };
export const CORE_FEATURES: GameFeature[] = [
  'character',
  'progression',
  'resources',
  'stats',
  'journey',
  'rest',
  'dungeon',
  'encounter',
];
export function featureResponseSchema<K extends GameFeature>(feature: K) {
  return z.strictObject({
    apiVersion: z.literal(2),
    characterId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    contentVersion: z.string(),
    data: FeatureSchemas[feature],
  });
}
export type FeatureResponse<K extends GameFeature = GameFeature> = {
  apiVersion: 2;
  characterId: string;
  revision: number;
  contentVersion: string;
  data: FeatureData[K];
};
export const FeatureUpdatesSchema = z.strictObject({ ...FeatureSchemas }).partial();
export const MutationResponseSchema = z.strictObject({
  apiVersion: z.literal(2),
  receipt: ReceiptSchema,
  snapshotRevision: z.number().int().nonnegative(),
  updates: FeatureUpdatesSchema.required({ character: true }),
});
export const CreationResponseSchema = z.strictObject({
  apiVersion: z.literal(2),
  receipt: ReceiptSchema,
  character: MetadataSchema,
});
export type MutationResponse = z.output<typeof MutationResponseSchema>;
export const FeaturePreviewResponseSchema = PreviewResponseSchema.extend({
  apiVersion: z.literal(2),
  characterId: z.string().uuid(),
});
export const CONTENT_COLLECTIONS = [
  'skills',
  'enemies',
  'classes',
  'items',
  'status-effects',
  'atlases',
  'maps',
  'worlds',
  'dungeons',
  'shops',
  'skill-book-recipes',
  'enchants',
  'enchanting-rules',
  'quests',
  'titles',
  'quest-flags',
] as const;
export const ContentCollectionSchema = z.enum(CONTENT_COLLECTIONS);
export type ContentCollection = z.output<typeof ContentCollectionSchema>;
export const contentProperty = (collection: ContentCollection) =>
  collection.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()) as
    | 'skills'
    | 'enemies'
    | 'classes'
    | 'items'
    | 'statusEffects'
    | 'atlases'
    | 'maps'
    | 'worlds'
    | 'dungeons'
    | 'shops'
    | 'skillBookRecipes'
    | 'enchants'
    | 'enchantingRules'
    | 'quests'
    | 'titles'
    | 'questFlags';
export const ContentManifestSchema = z.strictObject({
  apiVersion: z.literal(2),
  activeVersion: z.string(),
  checksum: z.string(),
  schemaVersion: z.literal(1),
  collections: z.array(ContentCollectionSchema),
});

export function contentCollectionResponseSchema(collection: ContentCollection) {
  return z.strictObject({
    apiVersion: z.literal(2),
    contentVersion: z.string(),
    data: ContentSchema.shape[contentProperty(collection)],
  });
}
