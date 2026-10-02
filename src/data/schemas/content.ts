import { z } from 'zod';
import { validateTitleReferences } from './titles';
import { EnchantSchema, EnchantRulesSchema } from './enchants';
import { WorldMapSchema, validateWorldReferences } from './world';
import { DungeonDefinitionSchema } from './dungeon';
import { ShopSchema } from './town';
import { SkillRankSchema, SKILL_RANKS } from './skillRank';
import { QuestSchema, TitleAwardSchema, validateQuestReferences } from './quests';
export { SkillRankSchema } from './skillRank';

const id = z.string().trim().min(1);
const uint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const positive = uint.min(1);
const probability = z.number().min(0).max(1);
const SkillReferenceSchema = z.strictObject({
  url: z.url(),
  retrievedAt: z.iso.date(),
  ranks: z.array(SkillRankSchema).length(15),
  rows: z.array(z.strictObject({ label: id, values: z.array(z.string()).length(15) })),
  effects: z.record(SkillRankSchema, z.array(z.string())),
});
export const SpriteSchema = z.strictObject({
  atlas: id,
  frame: uint,
  idleFrames: z.array(uint).min(1).optional(),
});
export const AttributeBonusesSchema = z.strictObject({
  strength: z.number().min(-1500).max(1500).optional(),
  intelligence: z.number().min(-1500).max(1500).optional(),
  dexterity: z.number().min(-1500).max(1500).optional(),
  will: z.number().min(-1500).max(1500).optional(),
  luck: z.number().min(-1500).max(1500).optional(),
});
export const CombatStatsSchema = z
  .strictObject({
    attack: uint.max(1000000),
    defense: uint.max(1000000),
    speed: uint.max(1000000),
    minDamage: uint.max(1000000).optional(),
    maxDamage: uint.max(1000000).optional(),
    balance: probability.optional(),
    magicAttack: uint.max(1000000).optional(),
    magicDefense: uint.max(1000000).optional(),
    protection: uint.max(1000000).optional(),
    magicProtection: uint.max(1000000).optional(),
    magicBalance: probability.optional(),
    magicCriticalChance: z.number().min(0).max(9.999).optional(),
    criticalRating: z.number().min(0).max(9.999).optional(),
    minInjury: probability.optional(),
    maxInjury: probability.optional(),
    armorPierce: uint.max(1000000).optional(),
    hitChance: probability.default(0.95),
    evasion: probability.default(0),
    criticalChance: probability.default(0.1),
    criticalMultiplier: z.number().min(1).max(10).default(1.5),
  })
  .refine(
    (stats) =>
      (stats.minDamage === undefined) === (stats.maxDamage === undefined) &&
      (stats.minDamage ?? 0) <= (stats.maxDamage ?? 0) &&
      (stats.minInjury ?? 0) <= (stats.maxInjury ?? 0),
    { message: 'Invalid combat range' },
  )
  .refine(
    (stats) =>
      Number.isSafeInteger(Math.floor(Math.max(1, stats.attack) * stats.criticalMultiplier)),
    { message: 'Combat damage must fit within safe integer range' },
  );
export const TrainingObjectiveSchema = z.strictObject({
  id,
  label: id,
  event: z.enum([
    'use',
    'damage',
    'defeat',
    'heal',
    'enchantSuccess',
    'enchantFailure',
    'burnUse',
    'recovery',
  ]),
  scope: z.enum(['action', 'target', 'encounter']),
  points: positive.max(100),
  maximum: positive.max(1000),
});
export const GameRankSchema = z
  .strictObject({
    minPower: uint.max(1000000),
    maxPower: uint.max(1000000),
    manaCost: uint.max(10000),
    staminaCost: uint.max(10000),
    physicalMultiplier: z.number().min(0).max(10).default(1),
    bypassDefend: z.boolean().default(false),
    cooldown: uint.max(100).default(0),
    nextRank: SkillRankSchema.optional(),
    apCost: uint.max(10000).optional(),
    objectives: z.array(TrainingObjectiveSchema).max(20),
    statBonuses: AttributeBonusesSchema.optional(),
    maxHealth: uint.max(10000).default(0),
    meleeMin: uint.max(10000).default(0),
    meleeMax: uint.max(10000).default(0),
    swordMin: uint.max(10000).default(0),
    swordMax: uint.max(10000).default(0),
    swordBalance: probability.default(0),
  })
  .superRefine((rank, ctx) => {
    if (
      rank.minPower > rank.maxPower ||
      rank.meleeMin > rank.meleeMax ||
      rank.swordMin > rank.swordMax ||
      (rank.nextRank === undefined) !== (rank.apCost === undefined) ||
      new Set(rank.objectives.map((o) => o.id)).size !== rank.objectives.length ||
      (rank.nextRank && rank.objectives.reduce((sum, o) => sum + o.points * o.maximum, 0) < 100)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid game rank or unreachable training gate' });
  });
export const SkillBookRecipeSchema = z.strictObject({
  id,
  skillId: id,
  incompleteItemId: id,
  completeItemId: id,
  pages: z
    .array(z.strictObject({ itemId: id, hint: id }))
    .min(1)
    .max(20),
});
export const SkillSchema = z
  .strictObject({
    id,
    name: id,
    manaCost: uint,
    power: uint.max(1000000),
    element: z.enum(['physical', 'fire', 'ice', 'lightning']),
    target: z.enum(['self', 'ally', 'enemy', 'allEnemies']),
    effect: z.enum(['damage', 'heal', 'buff']).default('damage'),
    statuses: z.array(id).default([]),
    hitChance: probability.default(1),
    criticalChance: probability.default(0),
    staminaCost: uint.max(10000).default(0),
    physicalMultiplier: z.number().min(0).max(10).default(1),
    bypassDefend: z.boolean().default(false),
    statBonuses: AttributeBonusesSchema.optional(),
    minPower: uint.max(1000000).optional(),
    maxPower: uint.max(1000000).optional(),
    minMagicModifier: z.number().min(0).max(10).default(0),
    maxMagicModifier: z.number().min(0).max(10).default(0),
    category: z.enum(['combat', 'magic', 'life']).optional(),
    kind: z.enum(['active', 'passive', 'life']).optional(),
    battleUsable: z.boolean().optional(),
    rank: SkillRankSchema.optional(),
    description: z.string().optional(),
    reference: SkillReferenceSchema.optional(),
    gameRanks: z.partialRecord(SkillRankSchema, GameRankSchema).optional(),
    requiresWeapon: z.enum(['melee', 'sword']).optional(),
    acquisitionHint: z.string().optional(),
  })
  .refine(
    (skill) =>
      (skill.minPower === undefined) === (skill.maxPower === undefined) &&
      (skill.minPower ?? 0) <= (skill.maxPower ?? 0) &&
      skill.minMagicModifier <= skill.maxMagicModifier,
    { message: 'Invalid skill range' },
  )
  .refine(
    (skill) =>
      skill.effect === 'damage'
        ? ['enemy', 'allEnemies'].includes(skill.target)
        : ['self', 'ally'].includes(skill.target),
    { message: 'Damage skills target enemies; healing skills target self or allies' },
  );
const actor = {
  id,
  name: id,
  maxHealth: positive.max(100000),
  maxMana: uint.max(100000),
  combatant: CombatStatsSchema,
  maxStamina: uint.max(100000).default(0),
  skills: z.array(id),
  sprite: SpriteSchema,
};
export const EnemySchema = z.strictObject({
  ...actor,
  experience: uint.max(10000).default(0),
  gold: uint.max(10000).default(0),
  loot: z
    .array(
      z
        .strictObject({
          itemId: id,
          chance: probability,
          min: positive.max(99),
          max: positive.max(99),
        })
        .refine((drop) => drop.min <= drop.max),
    )
    .default([]),
});
export const ClassSchema = z.strictObject(actor);
export const ItemSchema = z
  .strictObject({
    id,
    name: id,
    kind: z.enum([
      'consumable',
      'weapon',
      'armor',
      'skillBook',
      'incompleteBook',
      'skillPage',
      'enchantScroll',
      'material',
      'titleCoupon',
    ]),
    enchantId: id.optional(),
    titleId: id.optional(),
    price: uint.max(100000),
    power: uint.max(10000),
    description: z.string(),
    weaponTags: z.array(z.enum(['melee', 'sword'])).default([]),
    skillId: id.optional(),
    recipeId: id.optional(),
    stat: z.enum(['attack', 'defense', 'speed']).optional(),
    maxDurability: positive.max(10000).optional(),
    restores: z.enum(['health', 'mana', 'stamina']).default('health'),
    battleUsable: z.boolean().default(true),
    weaponStats: z
      .strictObject({
        minDamage: uint.max(10000),
        maxDamage: uint.max(10000),
        balance: probability,
        critical: probability,
        minInjury: probability,
        maxInjury: probability,
      })
      .refine(
        (weapon) => weapon.minDamage <= weapon.maxDamage && weapon.minInjury <= weapon.maxInjury,
        { message: 'Invalid weapon range' },
      )
      .optional(),
    protection: uint.max(10000).default(0),
    magicDefense: uint.max(10000).default(0),
    magicProtection: uint.max(10000).default(0),
    statBonuses: AttributeBonusesSchema.optional(),
    staminaRecovery: uint.max(10000).default(0),
    fullnessRecovery: z.number().min(0).max(50).default(0),
  })
  .refine(
    (item) =>
      item.kind === 'weapon' ? item.maxDurability !== undefined : item.maxDurability === undefined,
    { message: 'Only weapons require maximum durability' },
  )
  .refine(
    (item) =>
      (item.kind === 'titleCoupon') === !!item.titleId &&
      (item.kind !== 'titleCoupon' || !item.battleUsable) &&
      (item.kind === 'enchantScroll') === !!item.enchantId &&
      (!['enchantScroll', 'material'].includes(item.kind) || !item.battleUsable) &&
      (item.kind === 'skillBook') === !!item.skillId &&
      ['incompleteBook', 'skillPage'].includes(item.kind) === !!item.recipeId &&
      (item.kind !== 'skillBook' || (!!item.skillId && !item.battleUsable)) &&
      (!['incompleteBook', 'skillPage'].includes(item.kind) ||
        (!!item.recipeId && !item.battleUsable)) &&
      new Set(item.weaponTags).size === item.weaponTags.length &&
      (!item.weaponTags.length || item.kind === 'weapon') &&
      (!item.weaponTags.includes('sword') || item.weaponTags.includes('melee')),
    { message: 'Invalid skill item or equipment tags' },
  );
export const StatusEffectSchema = z
  .strictObject({
    id,
    name: id,
    duration: positive.max(100),
    tickTiming: z.enum(['turnStart', 'turnEnd']),
    stacking: z.enum(['refresh', 'stack', 'ignore']),
    effect: z.enum(['damage', 'heal', 'stat']),
    power: uint.max(10000),
    stat: z.enum(['attack', 'defense', 'speed']).optional(),
    modifier: z.number().int().min(-1000).max(1000).default(0),
  })
  .refine((status) => status.effect !== 'stat' || !!status.stat, {
    message: 'Stat effects require a stat',
  });
export const AtlasSchema = z.strictObject({
  id,
  columns: positive,
  rows: positive,
  frameWidth: positive,
  frameHeight: positive,
});
export const MapSchema = z
  .strictObject({
    id,
    name: id,
    width: positive.max(128),
    height: positive.max(128),
    tileSize: positive.max(128),
    tiles: z.array(z.number().int().min(0).max(2)),
    spawns: z.array(
      z.strictObject({
        entityId: id,
        kind: z.enum(['player', 'enemy']),
        definitionId: id,
        x: uint,
        y: uint,
      }),
    ),
  })
  .superRefine((map, ctx) => {
    if (map.tiles.length !== map.width * map.height)
      ctx.addIssue({
        code: 'custom',
        message: 'Tile count must match map dimensions',
        path: ['tiles'],
      });
    const seen = new Set<string>();
    map.spawns.forEach((spawn, index) => {
      if (
        seen.has(spawn.entityId) ||
        spawn.x >= map.width ||
        spawn.y >= map.height ||
        map.tiles[spawn.y * map.width + spawn.x] === 1
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Spawns require unique IDs and walkable in-bounds tiles',
          path: ['spawns', index],
        });
      }
      seen.add(spawn.entityId);
    });
    if (
      !map.spawns.some((spawn) => spawn.kind === 'player') ||
      !map.spawns.some((spawn) => spawn.kind === 'enemy')
    ) {
      ctx.addIssue({ code: 'custom', message: 'Encounter maps need both sides', path: ['spawns'] });
    }
  });

export const ContentSchema = z
  .strictObject({
    skills: z.array(SkillSchema),
    enemies: z.array(EnemySchema),
    classes: z.array(ClassSchema),
    items: z.array(ItemSchema),
    statusEffects: z.array(StatusEffectSchema),
    atlases: z.array(AtlasSchema),
    maps: z.array(MapSchema),
    worlds: z.array(WorldMapSchema).default([]),
    dungeons: z.array(DungeonDefinitionSchema).default([]),
    shops: z.array(ShopSchema).default([]),
    skillBookRecipes: z.array(SkillBookRecipeSchema).default([]),
    enchants: z.array(EnchantSchema).max(1000).default([]),
    enchantingRules: EnchantRulesSchema.optional(),
    quests: z.array(QuestSchema).max(1000).default([]),
    titles: z.array(TitleAwardSchema).max(1000).default([]),
    questFlags: z.array(id).max(1000).default([]),
  })
  .superRefine((content, ctx) => {
    for (const key of [
      'skills',
      'enemies',
      'classes',
      'items',
      'statusEffects',
      'atlases',
      'maps',
      'worlds',
      'dungeons',
      'shops',
      'skillBookRecipes',
      'quests',
      'titles',
      'enchants',
    ] as const) {
      const seen = new Set<string>();
      content[key].forEach((entry, index) => {
        if (seen.has(entry.id))
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate ${key} ID: ${entry.id}`,
            path: [key, index, 'id'],
          });
        seen.add(entry.id);
      });
    }
    for (const key of ['enemies', 'classes'] as const)
      content[key].forEach((entry, index) => {
        for (const skillId of entry.skills) {
          const skill = content.skills.find((skill) => skill.id === skillId);
          if (!skill)
            ctx.addIssue({
              code: 'custom',
              message: `Unknown skill: ${skillId}`,
              path: [key, index, 'skills'],
            });
          else if (
            skill.effect === 'damage' &&
            !Number.isSafeInteger(
              Math.floor(
                Math.max(1, entry.combatant.attack + skill.power) *
                  entry.combatant.criticalMultiplier,
              ),
            )
          ) {
            ctx.addIssue({
              code: 'custom',
              message: 'Skill damage must fit within safe integer range',
              path: [key, index, 'skills'],
            });
          }
        }
        const atlas = content.atlases.find((atlas) => atlas.id === entry.sprite.atlas);
        if (
          !atlas ||
          [entry.sprite.frame, ...(entry.sprite.idleFrames ?? [])].some(
            (frame) => frame >= atlas.columns * atlas.rows,
          )
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'Unknown atlas or invalid sprite frame',
            path: [key, index, 'sprite'],
          });
        }
      });
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const rankOrder = SKILL_RANKS;
    for (const skill of content.skills)
      if (skill.gameRanks) {
        if (!skill.gameRanks.F || !['active', 'passive', 'life'].includes(skill.kind ?? ''))
          issue('Implemented skills need F and an explicit kind');
        if ((skill.kind === 'passive' || skill.kind === 'life') && skill.battleUsable !== false)
          issue('Passives cannot be battle actions');
        for (const [name, rank] of Object.entries(skill.gameRanks)) {
          if (
            rank.nextRank &&
            (rankOrder[rankOrder.indexOf(name as (typeof rankOrder)[number]) + 1] !==
              rank.nextRank ||
              !skill.gameRanks[rank.nextRank])
          )
            issue('Missing or invalid next game rank');
          if (name === '1' && rank.nextRank) issue('Final rank cannot advance');
          if (
            skill.kind === 'active' &&
            rank.objectives.some((o) =>
              o.event === 'heal' ? skill.effect !== 'heal' : skill.effect !== 'damage',
            )
          )
            issue('Objective cannot be produced by this skill');
          if (rank.objectives.some((o) => o.event === 'use' && o.scope !== 'action'))
            issue('Use objectives count once per action');
          if (skill.kind === 'active' && skill.effect === 'buff' && !skill.statuses.length)
            issue('Implemented buffs need a supported status effect');
          if (skill.kind === 'passive' && (rank.manaCost || rank.staminaCost || rank.cooldown))
            issue('Passives cannot have action costs');
          if (
            (rank.swordMin || rank.swordMax || rank.swordBalance) &&
            skill.requiresWeapon !== 'sword'
          )
            issue('Sword bonuses require sword equipment');
        }
      }
    const rules = content.enchantingRules;
    const enchanting = content.skills.find((s) => s.id === 'enchant');
    if (rules) {
      if (
        enchanting?.kind !== 'life' ||
        !enchanting.gameRanks?.F ||
        !Object.keys(rules.powderBonusBp).length
      )
        issue('Enchant requires a town skill and powder');
      for (const rank of Object.keys(enchanting?.gameRanks ?? {}))
        if (!rules.recipes[rank as (typeof rankOrder)[number]]) issue('Missing enchant recipe');
      for (const material of [
        rules.manaHerbId,
        rules.holyWaterId,
        ...Object.keys(rules.powderBonusBp),
      ])
        if (!content.items.some((i) => i.id === material && i.kind === 'material'))
          issue('Unknown enchanting material');
    }
    for (const enchant of content.enchants) {
      if (
        !rules ||
        !['F', 'E'].includes(enchant.rank) ||
        rules.baseChanceBp[enchant.rank] === undefined ||
        !content.items.some((i) => i.kind === 'enchantScroll' && i.enchantId === enchant.id)
      )
        issue('Unsupported enchant or missing scroll/chance');
      for (const clause of enchant.clauses)
        for (const condition of clause.conditions)
          if (
            condition.kind === 'skill' &&
            !content.skills.find((s) => s.id === condition.skillId)?.gameRanks?.[condition.rank]
          )
            issue('Unsupported enchant condition');
    }
    for (const item of content.items)
      if (item.enchantId && !content.enchants.some((e) => e.id === item.enchantId))
        issue('Unknown enchant scroll');
    for (const skill of content.skills)
      if (skill.gameRanks)
        for (const rank of Object.values(skill.gameRanks)) {
          if (
            skill.kind === 'life' &&
            (skill.id !== 'enchant' ||
              rank.objectives.some(
                (o) =>
                  !['enchantSuccess', 'enchantFailure', 'burnUse', 'recovery'].includes(o.event) ||
                  (o.event !== 'recovery' && o.scope !== 'action'),
              ))
          )
            issue('Unsupported town training objective');
          if (
            skill.kind !== 'life' &&
            rank.objectives.some((o) =>
              ['enchantSuccess', 'enchantFailure', 'burnUse', 'recovery'].includes(o.event),
            )
          )
            issue('Town objectives require a town skill');
        }
    for (const recipe of content.skillBookRecipes) {
      if (
        !content.skills.find((s) => s.id === recipe.skillId)?.gameRanks?.F ||
        !content.items.some(
          (i) =>
            i.id === recipe.incompleteItemId &&
            i.kind === 'incompleteBook' &&
            i.recipeId === recipe.id,
        ) ||
        !content.items.some(
          (i) =>
            i.id === recipe.completeItemId &&
            i.kind === 'skillBook' &&
            i.skillId === recipe.skillId,
        ) ||
        new Set(recipe.pages.map((p) => p.itemId)).size !== recipe.pages.length ||
        recipe.pages.some(
          (p) =>
            !content.items.some(
              (i) => i.id === p.itemId && i.kind === 'skillPage' && i.recipeId === recipe.id,
            ),
        )
      )
        issue('Invalid skill book recipe');
    }
    for (const item of content.items) {
      if (
        (item.skillId && !content.skills.find((s) => s.id === item.skillId)?.gameRanks?.F) ||
        (item.recipeId &&
          !content.skillBookRecipes.some(
            (r) =>
              r.id === item.recipeId &&
              (r.incompleteItemId === item.id || r.pages.some((p) => p.itemId === item.id)),
          ))
      )
        issue('Unknown skill item reference');
    }
    for (const world of content.worlds)
      for (const object of world.objects)
        if (
          object.lessons.some(
            (offer) => !content.skills.find((s) => s.id === offer.skillId)?.gameRanks?.F,
          ) ||
          (object.lessons.length && (object.kind !== 'npc' || !world.theme))
        )
          issue('Invalid instructor lesson');
    validateWorldReferences(content, ctx);
    validateQuestReferences(content, ctx);
    validateTitleReferences(content, ctx);
    content.shops.forEach((shop) => {
      if (
        shop.items.some((itemId) => !content.items.some((item) => item.id === itemId)) ||
        (shop.buysItems && shop.kind !== 'general')
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid shop catalog' });
    });
    content.dungeons.forEach((dungeon, index) => {
      const validEnemies = [
        ...dungeon.monsterIds,
        dungeon.mimicId,
        dungeon.bossId,
        ...dungeon.companionIds,
      ].every((id) => content.enemies.some((enemy) => enemy.id === id));
      const validRewards = [...dungeon.ordinaryRewards, ...dungeon.finalRewards].every((reward) =>
        content.items.some((item) => item.id === reward.itemId),
      );
      const validFountains = dungeon.fountainIds.every((id) =>
        content.statusEffects.some((effect) => effect.id === id && effect.effect === 'stat'),
      );
      if (!validEnemies || !validRewards || !validFountains)
        ctx.addIssue({
          code: 'custom',
          message: 'Unknown dungeon content reference',
          path: ['dungeons', index],
        });
    });
    content.skills.forEach((skill, index) =>
      skill.statuses.forEach((statusId) => {
        if (!content.statusEffects.some((status) => status.id === statusId))
          ctx.addIssue({
            code: 'custom',
            message: 'Unknown skill status',
            path: ['skills', index, 'statuses'],
          });
      }),
    );
    content.enemies.forEach((enemy, index) =>
      enemy.loot.forEach((drop) => {
        if (!content.items.some((item) => item.id === drop.itemId))
          ctx.addIssue({
            code: 'custom',
            message: 'Unknown loot item',
            path: ['enemies', index, 'loot'],
          });
      }),
    );
    content.maps.forEach((map, index) =>
      map.spawns.forEach((spawn, spawnIndex) => {
        const definitions = spawn.kind === 'player' ? content.classes : content.enemies;
        if (!definitions.some((entry) => entry.id === spawn.definitionId)) {
          ctx.addIssue({
            code: 'custom',
            message: `Unknown spawn definition: ${spawn.definitionId}`,
            path: ['maps', index, 'spawns', spawnIndex],
          });
        }
      }),
    );
  });

export type GameContent = z.infer<typeof ContentSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type ActorDefinition = z.infer<typeof ClassSchema>;
export type ItemDefinition = z.infer<typeof ItemSchema>;
export type StatusDefinition = z.infer<typeof StatusEffectSchema>;
export type TileMap = z.infer<typeof MapSchema>;
export type SpriteAtlas = z.infer<typeof AtlasSchema>;
