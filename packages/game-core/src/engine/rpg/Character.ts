import { readPlain, type Immutable } from '../immutableState';
import { MAX_LEVEL, STARTING_STATS, experienceToNextLevel } from './Leveling';
import { TitleProgressionSchema, emptyTitleProgression } from './TitleState';
import { selectedTitleEffects, validateTitleProgression } from './Titles';
import {
  EquipmentEnchantFields,
  EnchantProgressionSchema,
  emptyEnchantProgression,
} from './EnchantState';
import { equipmentEnchantEffects } from './EnchantEffects';
import { cloneData } from '../cloneData';
import { SkillProgressionSchema, starterProgression, validateSkillProgression } from './Skills';
import { z } from 'zod';
import { QuestProgressionSchema, emptyQuestProgression } from './QuestState';
import { validateQuestProgression } from './Quests';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { Entity } from '../ecs/Entity';
import type { GameRandom } from '../Random';
import { calculateCharacterStats, TALENTS, type GrowthTalent, type StatSource } from './Stats';
import { resourceTick } from './Resources';
import { validateItemHotbar } from './Inventory';

export { MAX_LEVEL, experienceToNextLevel } from './Leveling';
export { consumeItem } from './Inventory';

const amount = z.number().int().min(0).max(1000000);
export const LegacyHeroSchema = z.strictObject({
  classId: z.string().min(1),
  level: z.number().int().min(1).max(99),
  experience: amount,
  gold: amount,
  health: amount.min(1),
  mana: amount,
  inventory: z.record(z.string().min(1), z.number().int().min(1).max(999)),
  equipment: z.strictObject({ weapon: z.string().optional(), armor: z.string().optional() }),
});
export const LegacyWeaponSchema = z.strictObject({
  itemId: z.string().min(1),
  durability: z.number().int().min(0).max(10000),
});
export const WeaponSchema = LegacyWeaponSchema.extend(EquipmentEnchantFields);
export const ArmorSchema = z.strictObject({ itemId: z.string().min(1), ...EquipmentEnchantFields });
export type Weapon = z.infer<typeof WeaponSchema>;
export const VersionFourHeroSchema = LegacyHeroSchema.extend({
  weapons: z.record(z.string().regex(/^weapon-[1-9]\d*$/), LegacyWeaponSchema),
  nextWeaponId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});
export const VersionFiveHeroSchema = VersionFourHeroSchema.extend({
  growthTalent: z.enum(TALENTS),
  stamina: amount,
  wounds: amount,
  fullness: z
    .number()
    .min(50)
    .max(100)
    .refine((n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-8),
});
export const VersionSixHeroSchema = VersionFiveHeroSchema.extend(SkillProgressionSchema.shape);
export const VersionSevenHeroSchema = VersionSixHeroSchema.extend(QuestProgressionSchema.shape);
export const VersionEightHeroSchema = VersionSevenHeroSchema.extend({
  ...EnchantProgressionSchema.shape,
  weapons: z.record(z.string().regex(/^weapon-[1-9]\d*$/), WeaponSchema),
  armors: z.record(z.string().regex(/^armor-[1-9]\d*$/), ArmorSchema),
  nextArmorId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});
export const VersionNineHeroSchema = VersionEightHeroSchema.extend(TitleProgressionSchema.shape);
export const VersionTenHeroSchema = VersionNineHeroSchema.extend({
  level: z.number().int().min(1).max(MAX_LEVEL),
  cumulativeLevel: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  experience: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
export const VersionElevenHeroSchema = VersionTenHeroSchema.extend({
  itemHotbar: z.array(z.string().min(1)).max(100),
});
export const HeroSchema = VersionElevenHeroSchema.extend({
  equipment: LegacyHeroSchema.shape.equipment.extend({
    secondaryHand: z.string().min(1).optional(),
  }),
});
export type Hero = z.infer<typeof HeroSchema>;
export type HeroSnapshot = Immutable<Hero>;
/** Public observations never need the private enchant random stream. */
export type HeroFacts = Omit<HeroSnapshot, 'enchanting'>;
export type EquipmentReference = { weaponId: string } | { armorId: string };
export type OwnedItem = { itemId: string } | EquipmentReference;
export function ownedEquipment(
  hero: Pick<Hero, 'weapons' | 'armors'>,
  reference: EquipmentReference,
): Weapon | z.infer<typeof ArmorSchema>;
export function ownedEquipment(
  hero: Pick<HeroFacts, 'weapons' | 'armors'>,
  reference: EquipmentReference,
): Immutable<Weapon | z.infer<typeof ArmorSchema>>;
export function ownedEquipment(
  hero: Pick<HeroFacts, 'weapons' | 'armors'>,
  reference: EquipmentReference,
) {
  const item =
    'weaponId' in reference ? hero.weapons[reference.weaponId] : hero.armors[reference.armorId];
  if (!item) throw new Error('This equipment is not in your pack');
  return item;
}
export type HeroStatFacts = Pick<
  HeroFacts,
  | 'classId'
  | 'level'
  | 'growthTalent'
  | 'inventory'
  | 'equipment'
  | 'weapons'
  | 'armors'
  | 'learnedSkills'
  | 'earnedTitles'
  | 'titleCollection'
>;
export function heroStatSource(
  hero: HeroStatFacts,
  effects: readonly { statusId: string; stacks: number }[] | undefined,
  content: ContentRegistry,
): StatSource {
  const weapon = hero.equipment.weapon ? hero.weapons[hero.equipment.weapon] : undefined;
  return {
    classId: hero.classId,
    level: hero.level,
    growthTalent: hero.growthTalent,
    weaponItemId: weapon && weapon.durability > 0 ? weapon.itemId : undefined,
    ammunitionItemId: hero.equipment.secondaryHand,
    armorItemId: hero.equipment.armor ? hero.armors[hero.equipment.armor]?.itemId : undefined,
    effects: effects?.map((effect) => ({ ...effect })) ?? [],
    learnedSkills: cloneData(hero.learnedSkills),
    titles: selectedTitleEffects(hero, content),
    enchantments: [
      ...(weapon && weapon.durability > 0
        ? equipmentEnchantEffects(hero.equipment.weapon!, weapon, hero, content)
        : []),
      ...(hero.equipment.armor && hero.armors[hero.equipment.armor]
        ? equipmentEnchantEffects(
            hero.equipment.armor,
            hero.armors[hero.equipment.armor],
            hero,
            content,
          )
        : []),
    ],
  };
}
export function heroStats(
  hero: HeroStatFacts,
  content: ContentRegistry,
  effects: readonly { statusId: string; stacks: number }[] = [],
) {
  hero = readPlain(hero);
  for (const [slot, reference] of Object.entries(hero.equipment)) {
    if (!reference) continue;
    if (slot === 'secondaryHand') {
      const weapon = hero.equipment.weapon ? hero.weapons[hero.equipment.weapon] : undefined;
      if (
        !hero.inventory[reference] ||
        content.item(reference).kind !== 'ammunition' ||
        !weapon ||
        !content.item(weapon.itemId).weaponTags.includes('bow')
      )
        throw new Error('Equip owned arrows with a bow in the secondary hand');
      continue;
    }
    const instance = slot === 'weapon' ? hero.weapons[reference] : hero.armors[reference];
    const item = content.item(instance?.itemId ?? '');
    if (item.kind !== slot || !instance) throw new Error('Invalid equipped item');
  }
  return calculateCharacterStats(heroStatSource(hero, effects, content), content);
}
/** Inspect a loadout without changing ownership, resources, durability or RNG. */
export function previewEquipment(
  hero: HeroFacts,
  reference: OwnedItem | { slot: 'weapon' | 'armor' | 'secondaryHand' },
  content: ContentRegistry,
  effects: readonly { statusId: string; stacks: number }[] = [],
) {
  const equipment = { ...hero.equipment };
  if ('slot' in reference) delete equipment[reference.slot];
  else if ('weaponId' in reference) {
    if (!hero.weapons[reference.weaponId]) throw new Error('This weapon is not in your pack');
    equipment.weapon = reference.weaponId;
  } else if ('armorId' in reference) {
    if (!hero.armors[reference.armorId]) throw new Error('This armor is not in your pack');
    equipment.armor = reference.armorId;
  } else {
    equipment.secondaryHand = reference.itemId;
  }
  const weapon = equipment.weapon ? hero.weapons[equipment.weapon] : undefined;
  if (
    'itemId' in reference &&
    (!hero.inventory[reference.itemId] ||
      content.item(reference.itemId).kind !== 'ammunition' ||
      !weapon ||
      !content.item(weapon.itemId).weaponTags.includes('bow'))
  )
    throw new Error('Equip owned arrows with a bow in the secondary hand');
  if (!weapon || !content.item(weapon.itemId).weaponTags.includes('bow'))
    delete equipment.secondaryHand;
  return {
    before: heroStats(hero, content, effects),
    after: heroStats({ ...hero, equipment }, content, effects),
  };
}
export function restoreHero(hero: Hero, content: ContentRegistry) {
  const stats = heroStats(hero, content);
  hero.health = stats.maxHealth;
  hero.mana = stats.maxMana;
  hero.stamina = stats.maxStamina;
  hero.wounds = 0;
  hero.fullness = 100;
}
export function tickHero(hero: Hero, content: ContentRegistry, rest = false) {
  const entity: Entity = { id: 'player', player: true };
  applyHero(entity, readPlain(hero), content);
  const events = resourceTick(entity, rest);
  hero.health = entity.health!.current;
  hero.mana = entity.mana!.current;
  hero.stamina = entity.stamina!.current;
  hero.fullness = entity.fullness!;
  return events;
}
export function validateHero(raw: unknown, content: ContentRegistry): Hero {
  const hero = HeroSchema.parse(raw);
  validateItemHotbar(hero.itemHotbar, content);
  validateSkillProgression(hero, content);
  validateQuestProgression(hero, content);
  validateTitleProgression(hero, content);
  const stats = heroStats(hero, content);
  if (hero.cumulativeLevel < hero.level) throw new Error('Invalid cumulative level');
  if (
    hero.health > stats.maxHealth - hero.wounds ||
    hero.wounds >= stats.maxHealth ||
    hero.mana > stats.maxMana ||
    hero.stamina > stats.maxStamina ||
    (hero.level < MAX_LEVEL && hero.experience >= experienceToNextLevel(hero.level)) ||
    (hero.level === MAX_LEVEL && hero.experience !== 0)
  )
    throw new Error('Invalid character resources or experience');
  Object.keys(hero.inventory).forEach((id) => {
    if (['weapon', 'armor'].includes(content.item(id).kind))
      throw new Error('Equipment requires individual instances');
  });
  const counts = new Map<string, number>();
  for (const [id, weapon] of Object.entries(hero.weapons)) {
    const item = content.item(weapon.itemId);
    const count = (counts.get(item.id) ?? 0) + 1;
    counts.set(item.id, count);
    if (
      item.kind !== 'weapon' ||
      weapon.durability > item.maxDurability! ||
      count > 999 ||
      Number(id.slice(7)) >= hero.nextWeaponId
    )
      throw new Error('Invalid weapon instance or allocation counter');
  }
  for (const [id, armor] of Object.entries(hero.armors)) {
    const item = content.item(armor.itemId),
      count = (counts.get(item.id) ?? 0) + 1;
    counts.set(item.id, count);
    if (item.kind !== 'armor' || count > 999 || Number(id.slice(6)) >= hero.nextArmorId)
      throw new Error('Invalid armor instance or allocation counter');
  }
  for (const equipment of [...Object.values(hero.weapons), ...Object.values(hero.armors)])
    for (const slot of ['prefix', 'suffix'] as const) {
      const installed = equipment[slot];
      if (!installed) continue;
      const enchant = content.data.enchants.find((e) => e.id === installed.enchantId),
        item = content.item(equipment.itemId);
      if (
        !enchant ||
        enchant.slot !== slot ||
        !enchant.kinds.some((k) => k === item.kind) ||
        enchant.tags.some((t) => !item.weaponTags.includes(t)) ||
        Object.keys(installed.values).length !== enchant.clauses.length ||
        enchant.clauses.some(
          (c) =>
            installed.values[c.id] === undefined ||
            installed.values[c.id] < c.min ||
            installed.values[c.id] > c.max,
        )
      )
        throw new Error('Invalid installed enchant values or compatibility');
    }
  const receipts = hero.enchanting.receipts;
  if (
    receipts.length !== Math.min(100, hero.enchanting.nextOperationId - 1) ||
    new Set(receipts.map((r) => r.id)).size !== receipts.length ||
    receipts.some(
      (r, i) =>
        r.id !== `enchant-${hero.enchanting.nextOperationId - receipts.length + i}` ||
        r.recovered.some((id) => content.item(id).kind !== 'enchantScroll'),
    )
  )
    throw new Error('Invalid enchant operation receipts');
  return hero;
}
export function clampHeroResources(hero: Hero, content: ContentRegistry) {
  const stats = heroStats(hero, content);
  hero.wounds = Math.min(hero.wounds, stats.maxHealth - 1);
  hero.health = Math.min(hero.health, stats.maxHealth - hero.wounds);
  hero.mana = Math.min(hero.mana, stats.maxMana);
  hero.stamina = Math.min(hero.stamina, stats.maxStamina);
}
export function createHero(
  content: ContentRegistry,
  growthTalent: GrowthTalent = 'warrior',
  seed = 12345,
): Hero {
  const definition = content.data.classes[0];
  if (!definition) throw new Error('A character class is required');
  const hero: Hero = {
    ...emptyTitleProgression(),
    ...emptyEnchantProgression(seed),
    armors: {},
    nextArmorId: 1,
    ...emptyQuestProgression(),
    ...starterProgression(definition.id, content),
    growthTalent,
    stamina: 0,
    wounds: 0,
    fullness: 100,
    ap: STARTING_STATS.ap,
    classId: definition.id,
    level: 1,
    cumulativeLevel: 1,
    experience: 0,
    gold: 0,
    health: definition.maxHealth,
    mana: definition.maxMana,
    inventory: { potion: 2 },
    itemHotbar: [],
    equipment: {},
    weapons: {},
    nextWeaponId: 1,
  };
  restoreHero(hero, content);
  return hero;
}
export function itemCount(
  hero: Pick<HeroFacts, 'inventory' | 'weapons' | 'armors'>,
  itemId: string,
) {
  return (
    (hero.inventory[itemId] ?? 0) +
    Object.values(readPlain(hero.weapons)).filter((weapon) => weapon.itemId === itemId).length +
    Object.values(readPlain(hero.armors)).filter((armor) => armor.itemId === itemId).length
  );
}
export function addItem(hero: Hero, itemId: string, quantity: number, content: ContentRegistry) {
  const item = content.item(itemId);
  if (!Number.isInteger(quantity) || quantity < 1 || itemCount(hero, itemId) + quantity > 999)
    throw new Error('Inventory stack is full or quantity is invalid');
  if (item.kind === 'weapon') {
    if (!Number.isSafeInteger(hero.nextWeaponId + quantity))
      throw new Error('Weapon allocation limit reached');
    for (let i = 0; i < quantity; i++)
      hero.weapons[`weapon-${hero.nextWeaponId++}`] = { itemId, durability: item.maxDurability! };
  } else if (item.kind === 'armor') {
    if (!Number.isSafeInteger(hero.nextArmorId + quantity))
      throw new Error('Armor allocation limit reached');
    for (let i = 0; i < quantity; i++) hero.armors[`armor-${hero.nextArmorId++}`] = { itemId };
  } else {
    if (
      item.kind === 'incompleteBook' &&
      (itemCount(hero, itemId) + quantity > 1 || hero.bookCollections[item.recipeId!]?.completed)
    )
      throw new Error('Only one unfinished book per collection is allowed');
    hero.inventory[itemId] = (hero.inventory[itemId] ?? 0) + quantity;
    const discovered =
      item.skillId ?? content.data.skillBookRecipes.find((r) => r.id === item.recipeId)?.skillId;
    if (discovered && !hero.discoveredSkills.includes(discovered))
      hero.discoveredSkills.push(discovered);
  }
}
export function ownedDefinition(
  hero: Pick<HeroFacts, 'weapons' | 'armors'>,
  reference: OwnedItem,
  content: ContentRegistry,
) {
  return content.item(
    'itemId' in reference ? reference.itemId : ownedEquipment(hero, reference).itemId,
  );
}
export function removableCount(
  hero: Pick<HeroFacts, 'inventory' | 'weapons' | 'armors' | 'equipment'>,
  reference: OwnedItem,
): number {
  if ('weaponId' in reference)
    return hero.weapons[reference.weaponId] &&
      !hero.weapons[reference.weaponId].locked &&
      hero.equipment.weapon !== reference.weaponId
      ? 1
      : 0;
  if ('armorId' in reference)
    return hero.armors[reference.armorId] &&
      !hero.armors[reference.armorId].locked &&
      hero.equipment.armor !== reference.armorId
      ? 1
      : 0;
  return (
    (hero.equipment.secondaryHand === reference.itemId
      ? 0
      : (hero.inventory[reference.itemId] ?? 0)) +
    Object.entries(readPlain(hero.armors)).filter(
      ([id, a]) => a.itemId === reference.itemId && !a.locked && hero.equipment.armor !== id,
    ).length
  );
}
export function removeOwnedItem(hero: Hero, reference: OwnedItem, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > removableCount(hero, reference))
    throw new Error('Only owned, unlocked, unequipped items may be sold or offered');
  if ('weaponId' in reference) delete hero.weapons[reference.weaponId];
  else if ('armorId' in reference) delete hero.armors[reference.armorId];
  else if (hero.inventory[reference.itemId]) {
    const left = hero.inventory[reference.itemId] - quantity;
    if (left) hero.inventory[reference.itemId] = left;
    else delete hero.inventory[reference.itemId];
  } else {
    const ids = Object.keys(hero.armors).filter(
      (id) =>
        hero.armors[id].itemId === reference.itemId &&
        !hero.armors[id].locked &&
        hero.equipment.armor !== id,
    );
    ids.slice(0, quantity).forEach((id) => delete hero.armors[id]);
  }
}
/** Discard owned copies without rewards, ticks, or changing other equipment identities. */
export function dropOwnedItem(
  hero: Hero,
  reference: OwnedItem,
  quantity: number,
  content: ContentRegistry,
) {
  const item = ownedDefinition(hero, reference, content);
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 999 ||
    quantity > removableCount(hero, reference)
  )
    throw new Error('Only owned, unlocked, unequipped items may be dropped');
  removeOwnedItem(hero, reference, quantity);
  // Inserted pages belong to the unfinished manual and leave with it.
  if (item.kind === 'incompleteBook') delete hero.bookCollections[item.recipeId!];
}

/** Upgrade stacked armor while preserving the equipped first copy and depleted pools. */
export function migrateEquipmentHero(
  old: z.infer<typeof VersionSevenHeroSchema>,
  content: ContentRegistry,
  seed = 12345,
): Hero {
  const hero: Hero = {
    ...cloneData(old),
    itemHotbar: [],
    cumulativeLevel: old.level,
    ...emptyTitleProgression(),
    ...emptyEnchantProgression(seed),
    armors: {},
    nextArmorId: 1,
  };
  for (const itemId of Object.keys(old.inventory).sort())
    if (content.item(itemId).kind === 'armor') {
      delete hero.inventory[itemId];
      const first = `armor-${hero.nextArmorId}`;
      addItem(hero, itemId, old.inventory[itemId], content);
      if (old.equipment.armor === itemId) hero.equipment.armor = first;
    }
  return hero;
}
export function repairPrice(weapon: Weapon, content: ContentRegistry) {
  const item = content.item(weapon.itemId);
  return Math.ceil(
    (item.price * 0.5 * (item.maxDurability! - weapon.durability)) / item.maxDurability!,
  );
}
export function migrateHero(
  raw: unknown,
  content: ContentRegistry,
  growthTalent: GrowthTalent = 'warrior',
): Hero {
  const legacy = LegacyHeroSchema.parse(raw);
  const hero: Hero = {
    ...emptyTitleProgression(),
    ...emptyEnchantProgression(),
    armors: {},
    nextArmorId: 1,
    ...emptyQuestProgression(),
    ...starterProgression(legacy.classId, content),
    growthTalent,
    stamina: 0,
    wounds: 0,
    fullness: 100,
    ...legacy,
    itemHotbar: [],
    cumulativeLevel: legacy.level,
    inventory: { ...legacy.inventory },
    equipment: { ...legacy.equipment },
    weapons: {},
    nextWeaponId: 1,
  };
  for (const itemId of Object.keys(legacy.inventory).sort()) {
    const kind = content.item(itemId).kind;
    if (!['weapon', 'armor'].includes(kind)) continue;
    delete hero.inventory[itemId];
    const firstId = kind === 'weapon' ? `weapon-${hero.nextWeaponId}` : `armor-${hero.nextArmorId}`;
    addItem(hero, itemId, legacy.inventory[itemId], content);
    if (kind === 'weapon' && legacy.equipment.weapon === itemId) hero.equipment.weapon = firstId;
    if (kind === 'armor' && legacy.equipment.armor === itemId) hero.equipment.armor = firstId;
  }
  restoreHero(hero, content);
  return validateHero(hero, content);
}
export function grantExperience(hero: Hero, amount: number, content: ContentRegistry) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(hero.experience + amount)
  )
    throw new Error('Invalid experience reward');
  let level = hero.level,
    experience = hero.experience + amount;
  while (level < MAX_LEVEL && experience >= experienceToNextLevel(level)) {
    experience -= experienceToNextLevel(level);
    level++;
  }
  const gained = level - hero.level;
  if (!Number.isSafeInteger(hero.cumulativeLevel + gained))
    throw new Error('Cumulative level limit reached');
  hero.level = level;
  hero.experience = level === MAX_LEVEL ? 0 : experience;
  hero.cumulativeLevel += gained;
  hero.ap = Math.min(1000000, hero.ap + gained);
  if (gained > 0) restoreHero(hero, content);
}
export function rollLoot(enemyId: string, content: ContentRegistry, random: GameRandom) {
  const enemy = content.data.enemies.find((entry) => entry.id === enemyId);
  if (!enemy) throw new Error('Unknown defeated enemy');
  return {
    experience: enemy.experience,
    gold: enemy.gold,
    items: enemy.loot
      .filter((drop) => random.chance(drop.chance))
      .map((drop) => ({ itemId: drop.itemId, quantity: random.int(drop.min, drop.max) })),
  };
}
export function applyHero(
  entity: Entity,
  hero: HeroFacts,
  content: ContentRegistry,
  effects: readonly { statusId: string; stacks: number }[] = [],
) {
  const stats = heroStats(hero, content, effects);
  entity.learnedSkills = cloneData(hero.learnedSkills);
  entity.skills = Object.keys(hero.learnedSkills).filter(
    (id) => content.skill(id).kind === 'active' && content.skill(id).battleUsable === true,
  );
  entity.statSource = heroStatSource(hero, effects, content);
  entity.stamina = { current: hero.stamina, max: stats.maxStamina };
  entity.wounds = hero.wounds;
  entity.fullness = hero.fullness;
  entity.health = { current: hero.health, max: stats.maxHealth };
  entity.mana = { current: hero.mana, max: stats.maxMana };
  entity.combatant = { ...stats.combatant };
  entity.inventory = { ...hero.inventory };
  entity.itemHotbar = [...hero.itemHotbar];
  entity.ammunitionItemId = hero.equipment.secondaryHand;
  const weaponId = hero.equipment.weapon;
  entity.weapon = weaponId ? { ...cloneData(hero.weapons[weaponId]), id: weaponId } : undefined;
}
