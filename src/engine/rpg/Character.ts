import { z } from 'zod';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { Entity } from '../ecs/Entity';
import type { GameRandom } from '../Random';

const amount = z.number().int().min(0).max(1000000);
export const HeroSchema = z.strictObject({
  classId: z.string().min(1), level: z.number().int().min(1).max(99), experience: amount, gold: amount,
  health: amount.min(1), mana: amount,
  inventory: z.record(z.string().min(1), z.number().int().min(1).max(999)),
  equipment: z.strictObject({ weapon: z.string().optional(), armor: z.string().optional() }),
});
export type Hero = z.infer<typeof HeroSchema>;
export const experienceToNextLevel = (level: number) => level * 20;
export function heroStats(hero: Hero, content: ContentRegistry) {
  const definition = content.data.classes.find((entry) => entry.id === hero.classId);
  if (!definition) throw new Error('Unknown character class');
  const growth = hero.level - 1;
  const combatant = { ...definition.combatant, attack: definition.combatant.attack + growth * 2,
    defense: definition.combatant.defense + growth };
  for (const [slot, itemId] of Object.entries(hero.equipment)) {
    if (!itemId) continue;
    const item = content.item(itemId);
    if (item.kind !== slot || !hero.inventory[itemId]) throw new Error('Invalid equipped item');
    const stat = item.stat ?? (slot === 'weapon' ? 'attack' : 'defense');
    combatant[stat] += item.power;
  }
  return { combatant, maxHealth: definition.maxHealth + growth * 5, maxMana: definition.maxMana + growth * 2 };
}
export function validateHero(raw: unknown, content: ContentRegistry): Hero {
  const hero = HeroSchema.parse(raw);
  const stats = heroStats(hero, content);
  if (hero.health > stats.maxHealth || hero.mana > stats.maxMana ||
      (hero.level < 99 && hero.experience >= experienceToNextLevel(hero.level)) || (hero.level === 99 && hero.experience !== 0)) throw new Error('Invalid character resources or experience');
  Object.keys(hero.inventory).forEach((id) => content.item(id));
  return hero;
}
export function createHero(content: ContentRegistry): Hero {
  const definition = content.data.classes[0];
  if (!definition) throw new Error('A character class is required');
  return { classId: definition.id, level: 1, experience: 0, gold: 0, health: definition.maxHealth,
    mana: definition.maxMana, inventory: { potion: 2 }, equipment: {} };
}
export function addItem(hero: Hero, itemId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || (hero.inventory[itemId] ?? 0) + quantity > 999) throw new Error('Inventory stack is full or quantity is invalid');
  hero.inventory[itemId] = (hero.inventory[itemId] ?? 0) + quantity;
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
    const stats = heroStats(hero, content); hero.health = stats.maxHealth; hero.mana = stats.maxMana;
  }
  if (hero.level === 99) hero.experience = 0;
}
export function rollLoot(enemyId: string, content: ContentRegistry, random: GameRandom) {
  const enemy = content.data.enemies.find((entry) => entry.id === enemyId);
  if (!enemy) throw new Error('Unknown defeated enemy');
  return { experience: enemy.experience, gold: enemy.gold,
    items: enemy.loot.filter((drop) => random.chance(drop.chance)).map((drop) => ({ itemId: drop.itemId, quantity: random.int(drop.min, drop.max) })) };
}
export function applyHero(entity: Entity, hero: Hero, content: ContentRegistry) {
  const stats = heroStats(hero, content);
  entity.health = { current: hero.health, max: stats.maxHealth };
  entity.mana = { current: hero.mana, max: stats.maxMana };
  entity.combatant = { ...stats.combatant }; entity.inventory = { ...hero.inventory };
}
