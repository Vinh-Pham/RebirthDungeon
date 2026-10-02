import { MAX_LEVEL, STARTING_STATS } from './Leveling';
import type { EnchantContribution } from './EnchantEffects';
import { gameRank, type LearnedSkills } from './Skills';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { CombatStats } from '../ecs/components/CombatStats';
import { validateCombatStats } from '../ecs/components/CombatStats';
export const TALENTS = ['warrior', 'archery', 'mage'] as const;
export type GrowthTalent = typeof TALENTS[number];
export const ATTRIBUTE_KEYS = ['strength', 'intelligence', 'dexterity', 'will', 'luck'] as const;
export type Attributes = Record<typeof ATTRIBUTE_KEYS[number], number>;
export type StatEffect = { statusId: string; stacks: number };
export interface StatSource { classId: string; level: number; growthTalent: GrowthTalent; weaponItemId?: string; armorItemId?: string; enchantments?: readonly EnchantContribution[]; titles?: readonly EnchantContribution[]; effects: readonly StatEffect[]; learnedSkills: LearnedSkills }
export interface CharacterStats {
  base: Attributes; equipment: Attributes; effective: Attributes;
  attributeSources: { starting: Attributes; talent: Attributes; levels: Attributes; skills: Attributes; titles: Attributes };
  combatant: CombatStats; maxHealth: number; maxMana: number; maxStamina: number;
  modifiers: { name: string; description: string }[];
}
const zero = (): Attributes => ({ strength: 0, intelligence: 0, dexterity: 0, will: 0, luck: 0 });
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));
/** Exact protection curve; keep unrounded values for damage and critical reduction. */
export function protectionReduction(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid protection');
  return clamp((100 / Math.sqrt(2)) * Math.log10((value + 10 * Math.sqrt(2)) / (10 * Math.sqrt(2))), 90) / 100;
}
export function calculateCharacterStats(source: StatSource, content: ContentRegistry): CharacterStats {
  if (!Number.isInteger(source.level) || source.level < 1 || source.level > MAX_LEVEL || !TALENTS.includes(source.growthTalent)) throw new Error('Invalid character growth');
  const attributeSources = { starting: { strength: STARTING_STATS.strength, intelligence: STARTING_STATS.intelligence, dexterity: STARTING_STATS.dexterity, will: STARTING_STATS.will, luck: STARTING_STATS.luck }, talent: zero(), levels: zero(), skills: zero(), titles: zero() };
  const base: Attributes = { ...attributeSources.starting };
  let maxHealth: number = STARTING_STATS.maxHealth, maxMana: number = STARTING_STATS.maxMana, maxStamina: number = STARTING_STATS.maxStamina;
  const attribute = source.growthTalent === 'warrior' ? 'strength' : source.growthTalent === 'mage' ? 'intelligence' : 'dexterity';
  attributeSources.talent[attribute] = source.growthTalent === 'warrior' ? 20 : 10;
  attributeSources.levels[attribute] = (source.level - 1) * 0.5;
  base[attribute] += attributeSources.talent[attribute] + attributeSources.levels[attribute];
  if (source.growthTalent === 'mage') maxMana += 10;
  if (source.growthTalent === 'archery') { maxHealth += 5; maxStamina += 5; }
  // Rank totals derive once from explicit ownership; class skills are starter grants only.
  const definition = content.data.classes.find((entry) => entry.id === source.classId);
  if (!definition) throw new Error('Unknown character class');
  const learned = source.learnedSkills;
  for (const [id, record] of Object.entries(learned)) {
    const rank = gameRank(content.skill(id), record.rank);
    for (const key of ATTRIBUTE_KEYS) {
      const bonus = rank.statBonuses?.[key] ?? 0;
      attributeSources.skills[key] += bonus; base[key] += bonus;
    }
    maxHealth += rank.maxHealth;
  }
  const equipment = zero(); const modifiers: CharacterStats['modifiers'] = [];
  const weapon = source.weaponItemId ? content.item(source.weaponItemId) : undefined;
  const armor = source.armorItemId ? content.item(source.armorItemId) : undefined;
  if ((weapon && weapon.kind !== 'weapon') || (armor && armor.kind !== 'armor')) throw new Error('Invalid equipment stat source');
  for (const item of [weapon, armor]) if (item) {
    for (const key of ATTRIBUTE_KEYS) equipment[key] += item.statBonuses?.[key] ?? 0;
    modifiers.push({ name: item.name, description: item.description });
  }
  const enchantTotals: Partial<Record<EnchantContribution['stat'], number>> = {};
  const seen = new Set<string>();
  for (const clause of [...(source.enchantments ?? []), ...(source.titles ?? [])]) {
    if (seen.has(clause.sourceId)) continue; seen.add(clause.sourceId);
    modifiers.push({ name: clause.name, description: `${clause.value >= 0 ? '+' : ''}${clause.value} ${clause.stat}${clause.condition ? ` · ${clause.active ? 'Active' : 'Inactive'}: ${clause.condition}` : ''}` });
    if (clause.active) enchantTotals[clause.stat] = (enchantTotals[clause.stat] ?? 0) + clause.value;
  }
  for (const key of ATTRIBUTE_KEYS) {
    const titleBonus = (source.titles ?? []).filter((c) => c.active && c.stat === key).reduce((sum, c) => sum + c.value, 0);
    attributeSources.titles[key] = titleBonus;
    equipment[key] += (enchantTotals[key] ?? 0) - titleBonus;
  }
  maxHealth = Math.max(1, maxHealth + (enchantTotals.maxHealth ?? 0)); maxMana = Math.max(0, maxMana + (enchantTotals.maxMana ?? 0)); maxStamina = Math.max(0, maxStamina + (enchantTotals.maxStamina ?? 0));
  const physicalAttack = enchantTotals.physicalAttack ?? 0;
  const effective = zero();
  for (const key of ATTRIBUTE_KEYS) { base[key] = clamp(base[key], 1500); effective[key] = clamp(base[key] + attributeSources.titles[key] + equipment[key], 1500); }
  const str = Math.max(0, effective.strength - 10), dex = Math.max(0, effective.dexterity - 10), int = Math.max(0, effective.intelligence - 10);
  const will = Math.max(0, effective.will - 10);
  const w = weapon?.weaponStats;
  const equipmentDamage = weapon && !w && (!weapon.stat || weapon.stat === 'attack') ? weapon.power : 0;
  let meleeMin = 0, meleeMax = 0, swordBalance = 0;
  for (const [id, record] of Object.entries(learned)) {
    const rank = gameRank(content.skill(id), record.rank);
    meleeMin += rank.meleeMin; meleeMax += rank.meleeMax;
    if (weapon?.weaponTags.includes('sword')) { meleeMin += rank.swordMin; meleeMax += rank.swordMax; swordBalance += rank.swordBalance; }
  }
  const minDamage = Math.floor(str / 3) + (w?.minDamage ?? 0) + equipmentDamage + meleeMin + physicalAttack;
  const maxDamage = Math.floor(str / 2.5) + 8 + (w?.maxDamage ?? 0) + equipmentDamage + meleeMax + physicalAttack;
  const balance = clamp(8.728944 * Math.log2((dex + 9.814582) / 20.34565), 50) / 100;
  const rating = clamp((effective.will - 10) / 1000 + (effective.luck - 10) / 500, 9.999);
  const combatant: CombatStats = { attack: maxDamage, minDamage, maxDamage,
    balance: Math.min(0.8, balance + (w?.balance ?? 0.3) + swordBalance), magicBalance: Math.min(1, 0.3 + int / 400),
    defense: Math.floor(str / 10) + (armor?.stat === 'defense' || (armor && !armor.stat) ? armor.power : 0),
    magicDefense: Math.floor(will / 10) + (armor?.magicDefense ?? 0), magicAttack: Math.floor(int / 5),
    protection: armor?.protection ?? 0, magicProtection: Math.floor(int / 20) + (armor?.magicProtection ?? 0),
    armorPierce: Math.floor(dex / 15), speed: definition.combatant.speed + (armor?.stat === 'speed' ? armor.power : 0) + (weapon?.stat === 'speed' ? weapon.power : 0),
    hitChance: definition.combatant.hitChance, evasion: definition.combatant.evasion,
    criticalRating: clamp(rating + (w?.critical ?? 0.1), 9.999), magicCriticalChance: rating,
    criticalChance: Math.min(0.3, rating + (w?.critical ?? 0.1)), criticalMultiplier: 1.5,
    minInjury: clamp((w?.minInjury ?? 0) + dex / 2000 + will / 2000, 1),
    maxInjury: clamp((w?.maxInjury ?? 0) + dex / 1000 + will / 500, 1) };
  for (const key of ['magicAttack', 'defense', 'protection', 'magicDefense', 'magicProtection'] as const) combatant[key] = Math.max(0, (combatant[key] ?? 0) + (enchantTotals[key] ?? 0));
  combatant.attack = Math.max(0, combatant.attack); combatant.minDamage = Math.max(0, combatant.minDamage!); combatant.maxDamage = Math.max(0, combatant.maxDamage!);
  const totals = { attack: 0, defense: 0, speed: 0 };
  for (const effect of [...source.effects].sort((a, b) => a.statusId.localeCompare(b.statusId))) {
    const status = content.status(effect.statusId);
    if (status.effect !== 'stat' || !status.stat) continue;
    const amount = status.modifier * effect.stacks;
    totals[status.stat] += amount;
    modifiers.push({ name: status.name, description: `${amount > 0 ? '+' : ''}${amount} ${status.stat} · ${effect.stacks} stacks` });
  }
  for (const key of ['attack', 'defense', 'speed'] as const) combatant[key] = Math.max(0, combatant[key] + totals[key]);
  combatant.minDamage = Math.max(0, combatant.minDamage! + totals.attack);
  combatant.maxDamage = combatant.attack;
  validateCombatStats(combatant);
  return { base, equipment, effective, attributeSources, combatant, maxHealth, maxMana, maxStamina, modifiers };
}

/** Compare source stages using the same derivation, including live weapon eligibility. */
export function characterStatBreakdown(source: StatSource, content: ContentRegistry) {
  return {
    base: calculateCharacterStats({ ...source, weaponItemId: undefined, armorItemId: undefined, enchantments: [], titles: [], effects: [] }, content).combatant,
    titles: calculateCharacterStats({ ...source, weaponItemId: undefined, armorItemId: undefined, enchantments: [], effects: [] }, content).combatant,
    equipment: calculateCharacterStats({ ...source, effects: [] }, content).combatant,
    dungeon: calculateCharacterStats(source, content).combatant,
  };
}
