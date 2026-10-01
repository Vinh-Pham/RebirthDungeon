import { z } from 'zod';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { Entity } from '../ecs/Entity';
import type { GameRandom } from '../Random';
import { calculateCharacterStats, TALENTS, type GrowthTalent, type StatSource } from './Stats';
import { resourceTick } from './Resources';

const amount = z.number().int().min(0).max(1000000);
export const LegacyHeroSchema = z.strictObject({
  classId: z.string().min(1), level: z.number().int().min(1).max(99), experience: amount, gold: amount,
  health: amount.min(1), mana: amount,
  inventory: z.record(z.string().min(1), z.number().int().min(1).max(999)),
  equipment: z.strictObject({ weapon: z.string().optional(), armor: z.string().optional() }),
});
export const WeaponSchema = z.strictObject({ itemId: z.string().min(1), durability: z.number().int().min(0).max(10000) });
export type Weapon = z.infer<typeof WeaponSchema>;
export const VersionFourHeroSchema = LegacyHeroSchema.extend({
  weapons: z.record(z.string().regex(/^weapon-[1-9]\d*$/), WeaponSchema),
  nextWeaponId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});
export const HeroSchema = VersionFourHeroSchema.extend({ growthTalent: z.enum(TALENTS), stamina: amount, wounds: amount, fullness: z.number().min(50).max(100).refine((n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-8) });
export type Hero = z.infer<typeof HeroSchema>;
export type OwnedItem = { itemId: string } | { weaponId: string };
export const experienceToNextLevel = (level: number) => level * 20;
export function heroStatSource(hero: Hero, effects: readonly { statusId: string; stacks: number }[] = []): StatSource {
  const weapon = hero.equipment.weapon ? hero.weapons[hero.equipment.weapon] : undefined;
  return { classId: hero.classId, level: hero.level, growthTalent: hero.growthTalent, weaponItemId: weapon && weapon.durability > 0 ? weapon.itemId : undefined, armorItemId: hero.equipment.armor, effects };
}
export function heroStats(hero: Hero, content: ContentRegistry, effects: readonly { statusId: string; stacks: number }[] = []) {
  for (const [slot, reference] of Object.entries(hero.equipment)) {
    if (!reference) continue;
    const weapon = slot === 'weapon' ? hero.weapons[reference] : undefined;
    const item = content.item(slot === 'weapon' ? weapon?.itemId ?? '' : reference);
    if (item.kind !== slot || (slot === 'weapon' ? !weapon : !hero.inventory[reference])) throw new Error('Invalid equipped item');
  }
  return calculateCharacterStats(heroStatSource(hero, effects), content);
}
export function restoreHero(hero: Hero, content: ContentRegistry) {
  const stats = heroStats(hero, content); hero.health = stats.maxHealth; hero.mana = stats.maxMana; hero.stamina = stats.maxStamina; hero.wounds = 0; hero.fullness = 100;
}
export function tickHero(hero: Hero, content: ContentRegistry, rest = false) {
  const entity: Entity = { id: 'player', player: true }; applyHero(entity, hero, content); const events = resourceTick(entity, rest);
  hero.health = entity.health!.current; hero.mana = entity.mana!.current; hero.stamina = entity.stamina!.current; hero.fullness = entity.fullness!;
  return events;
}
export function validateHero(raw: unknown, content: ContentRegistry): Hero {
  const hero = HeroSchema.parse(raw);
  const stats = heroStats(hero, content);
  if (hero.health > stats.maxHealth - hero.wounds || hero.wounds >= stats.maxHealth || hero.mana > stats.maxMana || hero.stamina > stats.maxStamina ||
      (hero.level < 99 && hero.experience >= experienceToNextLevel(hero.level)) || (hero.level === 99 && hero.experience !== 0)) throw new Error('Invalid character resources or experience');
  Object.keys(hero.inventory).forEach((id) => { if (content.item(id).kind === 'weapon') throw new Error('Weapons require individual instances'); });
  const counts = new Map<string, number>();
  for (const [id, weapon] of Object.entries(hero.weapons)) {
    const item = content.item(weapon.itemId);
    const count = (counts.get(item.id) ?? 0) + 1; counts.set(item.id, count);
    if (item.kind !== 'weapon' || weapon.durability > item.maxDurability! || count > 999 || Number(id.slice(7)) >= hero.nextWeaponId) throw new Error('Invalid weapon instance or allocation counter');
  }
  return hero;
}
export function createHero(content: ContentRegistry, growthTalent: GrowthTalent = 'warrior'): Hero {
  const definition = content.data.classes[0];
  if (!definition) throw new Error('A character class is required');
  const hero: Hero = { growthTalent, stamina: 0, wounds: 0, fullness: 100, classId: definition.id, level: 1, experience: 0, gold: 0, health: definition.maxHealth,
    mana: definition.maxMana, inventory: { potion: 2 }, equipment: {}, weapons: {}, nextWeaponId: 1 };
  restoreHero(hero, content); return hero;
}
export function itemCount(hero: Hero, itemId: string) {
  return (hero.inventory[itemId] ?? 0) + Object.values(hero.weapons).filter((weapon) => weapon.itemId === itemId).length;
}
export function addItem(hero: Hero, itemId: string, quantity: number, content: ContentRegistry) {
  const item = content.item(itemId);
  if (!Number.isInteger(quantity) || quantity < 1 || itemCount(hero, itemId) + quantity > 999) throw new Error('Inventory stack is full or quantity is invalid');
  if (item.kind === 'weapon') {
    if (!Number.isSafeInteger(hero.nextWeaponId + quantity)) throw new Error('Weapon allocation limit reached');
    for (let i = 0; i < quantity; i++) hero.weapons[`weapon-${hero.nextWeaponId++}`] = { itemId, durability: item.maxDurability! };
  } else hero.inventory[itemId] = (hero.inventory[itemId] ?? 0) + quantity;
}
export function ownedDefinition(hero: Hero, reference: OwnedItem, content: ContentRegistry) {
  return content.item('weaponId' in reference ? hero.weapons[reference.weaponId]?.itemId ?? '' : reference.itemId);
}
export function removableCount(hero: Hero, reference: OwnedItem) {
  return 'weaponId' in reference ? (hero.weapons[reference.weaponId] && hero.equipment.weapon !== reference.weaponId ? 1 : 0)
    : Math.max(0, (hero.inventory[reference.itemId] ?? 0) - (hero.equipment.armor === reference.itemId ? 1 : 0));
}
export function removeOwnedItem(hero: Hero, reference: OwnedItem, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > removableCount(hero, reference)) throw new Error('Only owned, unequipped items may be sold or offered');
  if ('weaponId' in reference) delete hero.weapons[reference.weaponId];
  else {
    const left = hero.inventory[reference.itemId] - quantity;
    if (left) hero.inventory[reference.itemId] = left; else delete hero.inventory[reference.itemId];
  }
}
export function repairPrice(weapon: Weapon, content: ContentRegistry) {
  const item = content.item(weapon.itemId);
  return Math.ceil(item.price * 0.5 * (item.maxDurability! - weapon.durability) / item.maxDurability!);
}
export function migrateHero(raw: unknown, content: ContentRegistry, growthTalent: GrowthTalent = 'warrior'): Hero {
  const legacy = LegacyHeroSchema.parse(raw);
  const hero: Hero = { growthTalent, stamina: 0, wounds: 0, fullness: 100, ...legacy, inventory: { ...legacy.inventory }, equipment: { ...legacy.equipment }, weapons: {}, nextWeaponId: 1 };
  for (const itemId of Object.keys(legacy.inventory).sort()) {
    if (content.item(itemId).kind !== 'weapon') continue;
    delete hero.inventory[itemId];
    const firstId = `weapon-${hero.nextWeaponId}`;
    addItem(hero, itemId, legacy.inventory[itemId], content);
    if (legacy.equipment.weapon === itemId) hero.equipment.weapon = firstId;
  }
  restoreHero(hero, content); return validateHero(hero, content);
}
export function consumeItem(inventory: Record<string, number>, itemId: string) {
  if (!inventory[itemId]) throw new Error('Item is not in inventory');
  if (--inventory[itemId] === 0) delete inventory[itemId];
}
export function grantExperience(hero: Hero, amount: number, content: ContentRegistry) {
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(hero.experience + amount)) throw new Error('Invalid experience reward');
  hero.experience += amount;
  while (hero.level < 99 && hero.experience >= experienceToNextLevel(hero.level)) {
    hero.experience -= experienceToNextLevel(hero.level); hero.level++;
    restoreHero(hero, content);
  }
  if (hero.level === 99) hero.experience = 0;
}
export function rollLoot(enemyId: string, content: ContentRegistry, random: GameRandom) {
  const enemy = content.data.enemies.find((entry) => entry.id === enemyId);
  if (!enemy) throw new Error('Unknown defeated enemy');
  return { experience: enemy.experience, gold: enemy.gold,
    items: enemy.loot.filter((drop) => random.chance(drop.chance)).map((drop) => ({ itemId: drop.itemId, quantity: random.int(drop.min, drop.max) })) };
}
export function applyHero(entity: Entity, hero: Hero, content: ContentRegistry, effects: readonly { statusId: string; stacks: number }[] = []) {
  const stats = heroStats(hero, content, effects);
  entity.statSource = heroStatSource(hero, effects);
  entity.stamina = { current: hero.stamina, max: stats.maxStamina }; entity.wounds = hero.wounds; entity.fullness = hero.fullness;
  entity.health = { current: hero.health, max: stats.maxHealth };
  entity.mana = { current: hero.mana, max: stats.maxMana };
  entity.combatant = { ...stats.combatant }; entity.inventory = { ...hero.inventory };
  const weaponId = hero.equipment.weapon;
  entity.weapon = weaponId ? { ...hero.weapons[weaponId], id: weaponId } : undefined;
}
