import { z } from 'zod';
import { CharacterDetailsSchema } from '../persistence/CharacterProfile';
import { ContentSchema, ItemSchema, MapSchema } from '../data/schemas/content';
import { EnchantSchema, EnchantRulesSchema, EnchantStatSchema } from '../data/schemas/enchants';
import { InstalledEnchantSchema } from '../engine/rpg/EnchantState';
import { LearnedSkillSchema } from '../engine/rpg/Skills';
import { HeroSchema, WeaponSchema, ArmorSchema } from '../engine/rpg/Character';
import { WorldMapSchema } from '../data/schemas/world';

export const GAME_CONTENT_VERSION = 'rebirth-13.1';
const id = z.string().min(1).max(300);
const integer = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const quantity = z.number().int().min(1).max(999);
const equipment = z.union([z.strictObject({ weaponId: id }), z.strictObject({ armorId: id })]);
const owned = z.union([equipment, z.strictObject({ itemId: id })]);
const enchant = { target: equipment, scrollId: id, powderId: id };
const type = <T extends string>(value: T) => ({ type: z.literal(value) });
export const BattleActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('attack') }),
  z.strictObject({ action: z.literal('defend') }),
  z.strictObject({ action: z.literal('rest') }),
  z.strictObject({ action: z.literal('skill'), skillId: id }),
  z.strictObject({ action: z.literal('item'), itemId: id }),
]);
export const CommandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...type('MOVE'),
    dx: z.number().int().min(-1).max(1),
    dy: z.number().int().min(-1).max(1),
  }),
  z.strictObject({ ...type('TRAVEL_TO'), x: integer, y: integer }),
  z.strictObject({ ...type('INTERACT'), objectId: id }),
  z.strictObject(type('CLOSE_SERVICE')),
  z.strictObject({ ...type('USE_ITEM'), itemId: id }),
  z.strictObject(type('EXIT_DUNGEON')),
  z.strictObject(type('START_REST')),
  z.strictObject(type('STOP_REST')),
  z.strictObject(type('REST_PULSE')),
  z.strictObject({
    ...type('BUY_ITEM'),
    objectId: id,
    itemId: id,
    quantity,
    bundleSize: quantity.optional(),
  }),
  z.strictObject({ ...type('SELL_ITEM'), objectId: id, item: owned, quantity }),
  z.strictObject({ ...type('DROP_ITEM'), item: owned, quantity }),
  z.strictObject({ ...type('REPAIR_WEAPON'), objectId: id, weaponId: id }),
  z.strictObject({ ...type('HEAL'), objectId: id }),
  z.strictObject({ ...type('OFFER_ITEM'), objectId: id, item: owned }),
  z.strictObject({ ...type('APPLY_ENCHANT'), objectId: id, ...enchant }),
  z.strictObject({ ...type('BURN_EQUIPMENT'), objectId: id, target: equipment }),
  z.strictObject({ ...type('LOCK_EQUIPMENT'), target: equipment, locked: z.boolean() }),
  z.strictObject({ ...type('EQUIP_WEAPON'), weaponId: id }),
  z.strictObject({ ...type('EQUIP_ARMOR'), armorId: id }),
  z.strictObject({ ...type('EQUIP_AMMUNITION'), itemId: id }),
  z.strictObject({ ...type('UNEQUIP_ITEM'), slot: z.enum(['weapon', 'armor', 'secondaryHand']) }),
  z.strictObject({ ...type('SET_ITEM_HOTBAR'), itemId: id, assigned: z.boolean() }),
  z.strictObject({
    ...type('SELECT_TITLE'),
    slot: z.enum(['first', 'second']),
    titleId: id.optional(),
  }),
  z.strictObject({ ...type('UNLOCK_TITLE_COUPON'), itemId: id }),
  z.strictObject({ ...type('ACCEPT_QUEST'), questId: id, objectId: id.optional() }),
  z.strictObject({ ...type('CLAIM_QUEST'), questId: id, objectId: id.optional() }),
  z.strictObject({ ...type('TRACK_QUEST_OBJECTIVE'), questId: id, objectiveId: id }),
  z.strictObject({ ...type('LEARN_SKILL'), objectId: id, skillId: id }),
  z.strictObject({ ...type('READ_SKILL_BOOK'), itemId: id }),
  z.strictObject({ ...type('INSERT_SKILL_PAGE'), recipeId: id, pageId: id }),
  z.strictObject({ ...type('RANK_UP_SKILL'), skillId: id }),
  z.strictObject({ ...type('BATTLE_ACTION'), action: BattleActionSchema, targetId: id }),
  z.strictObject({ ...type('SETTLE_ENCOUNTER'), selectedItemIds: z.array(id).max(100).optional() }),
]);
export type OnlineCommand = z.infer<typeof CommandSchema>;
export const CreationRequestSchema = CharacterDetailsSchema.extend({
  commandId: z.string().uuid(),
});
export const CommandRequestSchema = z.strictObject({
  commandId: z.string().uuid(),
  expectedRevision: integer,
  command: CommandSchema,
});
export const PreviewRequestSchema = z.strictObject({
  expectedRevision: integer,
  selection: z.discriminatedUnion('type', [
    z.strictObject({
      ...type('EQUIPMENT'),
      item: z.union([
        owned,
        z.strictObject({ slot: z.enum(['weapon', 'armor', 'secondaryHand']) }),
      ]),
    }),
    z.strictObject({ ...type('ENCHANT'), ...enchant }),
    z.strictObject({ ...type('BURN'), target: equipment }),
  ]),
});
export const MetadataSchema = CharacterDetailsSchema.extend({
  id,
  revision: integer,
  contentVersion: id,
  createdAt: integer,
  updatedAt: integer,
});
export const PresentationBatchSchema = z.strictObject({
  id: integer,
  sourceId: id,
  targetId: id,
  animation: z.enum(['attack', 'skill', 'defend']),
  skillId: id.optional(),
  impacts: z
    .array(
      z.strictObject({
        targetId: id,
        amount: integer,
        healing: z.boolean(),
        critical: z.boolean(),
        healthAfter: integer,
        maxHealth: integer,
      }),
    )
    .max(64),
  deaths: z.array(id).max(64),
  missed: z.boolean(),
});
export const ResolvedPresentationSchema = z.strictObject({
  version: z.literal(1),
  encounterId: id,
  fromActionSequence: integer,
  toActionSequence: integer,
  batches: z.array(PresentationBatchSchema).max(512),
});
export type ResolvedPresentation = z.infer<typeof ResolvedPresentationSchema>;
export const BattlePreviewSchema = z.strictObject({
  healing: z.boolean(),
  area: z.boolean(),
  manaCost: integer,
  staminaCost: integer,
  ammunitionCost: integer.optional(),
  fallbackReason: z.string().optional(),
  targets: z
    .array(
      z.strictObject({
        targetId: id,
        min: integer,
        max: integer,
        criticalMin: integer,
        criticalMax: integer,
        hitChance: z.number().min(0).max(1),
        criticalChance: z.number().min(0).max(1),
        balance: z.number().min(0).max(1).optional(),
      }),
    )
    .max(64),
});
export const BattleAvailabilitySchema = z.strictObject({
  action: BattleActionSchema,
  targets: z.array(id).max(64),
  reason: z.string().optional(),
  previews: z.array(BattlePreviewSchema).max(64),
});
export type BattleAvailability = z.infer<typeof BattleAvailabilitySchema>;
export const ReceiptSchema = z.strictObject({
  commandId: z.string().uuid(),
  characterId: id,
  baseRevision: integer,
  committedRevision: integer,
  createdAt: integer,
  outcome: z.strictObject({
    message: z.string(),
    events: z.array(z.string()).max(100),
    presentation: ResolvedPresentationSchema.optional(),
  }),
});
// Public hero state deliberately excludes the private enchant RNG and operation counter.
export const PublicHeroSchema = HeroSchema.omit({ enchanting: true });
const attributes = z.strictObject({
  strength: z.number().finite(),
  intelligence: z.number().finite(),
  dexterity: z.number().finite(),
  will: z.number().finite(),
  luck: z.number().finite(),
});
export const DerivedCombatStatsSchema = z.strictObject({
  attack: integer,
  defense: integer,
  speed: integer,
  minDamage: z.number().finite().nonnegative().optional(),
  maxDamage: z.number().finite().nonnegative().optional(),
  balance: z.number().finite().nonnegative().optional(),
  magicAttack: z.number().finite().nonnegative().optional(),
  magicDefense: z.number().finite().nonnegative().optional(),
  protection: z.number().finite().nonnegative().optional(),
  magicProtection: z.number().finite().nonnegative().optional(),
  magicBalance: z.number().finite().nonnegative().optional(),
  criticalRating: z.number().finite().nonnegative().optional(),
  magicCriticalChance: z.number().finite().nonnegative().optional(),
  minInjury: z.number().finite().nonnegative().optional(),
  maxInjury: z.number().finite().nonnegative().optional(),
  armorPierce: z.number().finite().nonnegative().optional(),
  hitChance: z.number().finite().nonnegative().optional(),
  evasion: z.number().finite().nonnegative().optional(),
  criticalChance: z.number().finite().nonnegative().optional(),
  criticalMultiplier: z.number().finite().nonnegative().optional(),
});
export const CharacterStatsSchema = z.strictObject({
  base: attributes,
  equipment: attributes,
  effective: attributes,
  attributeSources: z.strictObject({
    starting: attributes,
    talent: attributes,
    levels: attributes,
    skills: attributes,
    titles: attributes,
  }),
  combatant: DerivedCombatStatsSchema,
  maxHealth: integer,
  maxMana: integer,
  maxStamina: integer,
  modifiers: z.array(z.strictObject({ name: z.string(), description: z.string() })),
});
export const ContentResponseSchema = z.strictObject({ contentVersion: id, catalog: ContentSchema });
const costs = z.strictObject({
  scrollCount: z.literal(1),
  powderCount: z.literal(1),
  manaCost: integer,
  burnManaCost: integer,
  burnChanceBp: integer,
});
const ownedEquipment = z.union([WeaponSchema, ArmorSchema]);
export const PreviewResponseSchema = z.strictObject({
  revision: integer,
  preview: z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('EQUIPMENT'),
      before: CharacterStatsSchema,
      after: CharacterStatsSchema,
    }),
    z.strictObject({
      type: z.literal('ENCHANT'),
      ...enchant,
      enchant: EnchantSchema,
      item: ItemSchema,
      equipment: ownedEquipment,
      costs,
      intelligence: z.number().finite().nonnegative(),
      chanceBp: integer,
      overwritten: InstalledEnchantSchema.optional(),
      opposite: InstalledEnchantSchema.optional(),
    }),
    z.strictObject({
      type: z.literal('BURN'),
      target: equipment,
      item: ItemSchema,
      equipment: ownedEquipment,
      outputs: z.array(
        z.strictObject({ slot: z.enum(['prefix', 'suffix']), scrollId: id, enchantId: id }),
      ),
      costs,
      rules: EnchantRulesSchema,
      chanceBp: integer,
    }),
  ]),
});
export const StatSourceSchema = z.strictObject({
  classId: id,
  level: z.number().int().min(1).max(200),
  growthTalent: z.enum(['warrior', 'archery', 'mage']),
  weaponItemId: id.optional(),
  ammunitionItemId: id.optional(),
  armorItemId: id.optional(),
  enchantments: z
    .array(
      z.strictObject({
        sourceId: id,
        name: id,
        stat: EnchantStatSchema,
        value: z.number().int().min(-1000).max(1000),
        active: z.boolean(),
        condition: z.string(),
      }),
    )
    .optional(),
  titles: z
    .array(
      z.strictObject({
        sourceId: id,
        name: id,
        stat: EnchantStatSchema,
        value: z.number().int().min(-1000).max(1000),
        active: z.boolean(),
        condition: z.string(),
      }),
    )
    .optional(),
  effects: z.array(z.strictObject({ statusId: id, stacks: z.number().int().min(1).max(10) })),
  learnedSkills: z.record(id, LearnedSkillSchema),
});
export const PublicActorSchema = z.strictObject({
  id,
  name: z.string().optional(),
  player: z.boolean(),
  enemy: z.boolean(),
  health: z.strictObject({ current: integer, max: integer }).optional(),
  mana: z.strictObject({ current: integer, max: integer }).optional(),
  stamina: z.strictObject({ current: integer, max: integer }).optional(),
  wounds: integer.optional(),
  fullness: z.number().min(50).max(100).optional(),
  ammunitionItemId: id.optional(),
  defending: z.boolean(),
  dead: z.boolean(),
  statuses: z.array(z.strictObject({ id, sourceId: id, remainingTurns: integer, stacks: integer })),
  cooldowns: z.record(id, integer),
  inventory: z.record(id, integer),
  stats: DerivedCombatStatsSchema.optional(),
  statSource: StatSourceSchema.optional(),
  weapon: WeaponSchema.extend({ id }).optional(),
  learnedSkills: z.record(id, LearnedSkillSchema).optional(),
  itemHotbar: z.array(id),
  position: z.strictObject({ x: integer, y: integer }).optional(),
});
export const LootSchema = z.strictObject({
  gold: integer,
  experience: integer,
  items: z.array(z.strictObject({ itemId: id, quantity: integer, collectable: integer })),
});
export const PublicViewSchema = z.strictObject({
  version: z.literal(1),
  character: MetadataSchema,
  hero: PublicHeroSchema,
  stats: CharacterStatsSchema,
  worldId: id,
  position: z.strictObject({ x: integer, y: integer }),
  map: WorldMapSchema,
  opened: z.array(id),
  cleared: z.array(id),
  activeService: id.optional(),
  resting: z.boolean(),
  claimedObjectIds: z.array(id).default([]),
  dungeon: z
    .strictObject({
      definitionId: id,
      bossDoorOpened: z.boolean(),
      selectedChest: id.optional(),
      currentRoomKind: z.string(),
      remainingEnemies: integer,
      bossCleared: z.boolean(),
      effects: z.array(z.strictObject({ statusId: id, stacks: integer })),
      bossKey: z.enum(['absent', 'dropped', 'held', 'spent']),
      treasureKey: z.enum(['absent', 'dropped', 'held', 'spent']),
    })
    .optional(),
  encounter: z
    .strictObject({
      id,
      phase: z.enum(['selectingAction', 'victory', 'defeat']),
      map: MapSchema,
      actionSequence: integer,
      turnId: id.optional(),
      actors: z.array(PublicActorSchema),
      actions: z.array(BattleAvailabilitySchema).max(128),
      rewards: LootSchema.optional(),
    })
    .optional(),
});
export const CommandResponseSchema = z.strictObject({
  receipt: ReceiptSchema,
  view: PublicViewSchema,
});
export const ListResponseSchema = z.strictObject({ characters: z.array(MetadataSchema) });
export type CharacterMetadata = z.infer<typeof MetadataSchema>;
export type CommandReceipt = z.infer<typeof ReceiptSchema>;
export type PublicView = z.infer<typeof PublicViewSchema>;
