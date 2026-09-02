/**
 * Branded content IDs. Parsing content through these schemas produces
 * compile-time-distinct ID types, so a MonsterId cannot be passed where a
 * HeroId is expected. At runtime they are plain strings.
 */

import { z } from 'zod';

const brandedId = <Brand extends string>(brand: Brand) =>
  z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/)
    .brand<Brand>();

export const dieIdSchema = brandedId('DieId');
export const abilityIdSchema = brandedId('AbilityId');
export const statusEffectIdSchema = brandedId('StatusEffectId');
export const heroIdSchema = brandedId('HeroId');
export const monsterIdSchema = brandedId('MonsterId');
export const itemIdSchema = brandedId('ItemId');
export const lootTableIdSchema = brandedId('LootTableId');
export const rarityTableIdSchema = brandedId('RarityTableId');
export const encounterIdSchema = brandedId('EncounterId');
export const dungeonIdSchema = brandedId('DungeonId');
export const bannerIdSchema = brandedId('BannerId');
export const experienceCurveIdSchema = brandedId('ExperienceCurveId');
export const generationProfileIdSchema = brandedId('GenerationProfileId');
export const pityRuleIdSchema = brandedId('PityRuleId');

export type DieId = z.infer<typeof dieIdSchema>;
export type AbilityId = z.infer<typeof abilityIdSchema>;
export type StatusEffectId = z.infer<typeof statusEffectIdSchema>;
export type HeroId = z.infer<typeof heroIdSchema>;
export type MonsterId = z.infer<typeof monsterIdSchema>;
export type ItemId = z.infer<typeof itemIdSchema>;
export type LootTableId = z.infer<typeof lootTableIdSchema>;
export type RarityTableId = z.infer<typeof rarityTableIdSchema>;
export type EncounterId = z.infer<typeof encounterIdSchema>;
export type DungeonId = z.infer<typeof dungeonIdSchema>;
export type BannerId = z.infer<typeof bannerIdSchema>;
export type ExperienceCurveId = z.infer<typeof experienceCurveIdSchema>;
export type GenerationProfileId = z.infer<typeof generationProfileIdSchema>;
export type PityRuleId = z.infer<typeof pityRuleIdSchema>;
