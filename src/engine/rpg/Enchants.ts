import { cloneData } from '../cloneData';
import type { ContentRegistry } from '../data/ContentRegistry';
import { createGameRandom } from '../Random';
import { SKILL_RANKS } from '../../data/schemas/skillRank';
import type { EnchantDefinition } from '../../data/schemas/enchants';
import { addItem, clampHeroResources, heroStats, itemCount, ownedEquipment, type EquipmentReference, type Hero } from './Character';
import { consumeItem } from './Inventory';
import { gameRank } from './Skills';
import type { InstalledEnchant } from './EnchantState';

export interface EnchantSelection { target: EquipmentReference; scrollId: string; powderId: string }
export interface EnchantRequest extends EnchantSelection { revision: number; operationId: string }
export interface BurnRequest { target: EquipmentReference; revision: number; operationId: string }
export function applicationChance(intelligence: number, base: number, powder: number, intCap: number, perPoint: number) {
  return Math.max(0, Math.min(9000, base + Math.min(intCap, Math.max(0, Math.floor(intelligence))) * perPoint + powder));
}
export const rollSucceeds = (roll: number, chanceBp: number) => roll < chanceBp;
export function compatibleEnchant(enchant: EnchantDefinition, item: ReturnType<ContentRegistry['item']>) {
  return enchant.kinds.some((kind) => kind === item.kind) && enchant.tags.every((tag) => item.weaponTags.includes(tag));
}
function recipe(hero: Hero, content: ContentRegistry) {
  const learned = hero.learnedSkills.enchant, rules = content.data.enchantingRules;
  if (!learned || !rules) throw new Error('Learn Enchant from the refuge keeper first');
  gameRank(content.skill('enchant'), learned.rank);
  const recipe = rules.recipes[learned.rank]; if (!recipe) throw new Error('Enchant is unsupported at this rank');
  return { learned, rules, recipe };
}
function targetEquipment(hero: Hero, target: EquipmentReference, content: ContentRegistry) {
  const equipment = ownedEquipment(hero, target);
  if (equipment.locked) throw new Error('Unlock this equipment before enchanting or burning');
  return { equipment, item: content.item(equipment.itemId) };
}
export function previewEnchant(hero: Hero, selection: EnchantSelection, content: ContentRegistry) {
  const { learned, rules, recipe: costs } = recipe(hero, content);
  const { equipment, item } = targetEquipment(hero, selection.target, content);
  const scroll = content.item(selection.scrollId), powder = content.item(selection.powderId);
  const enchant = content.data.enchants.find((e) => e.id === scroll.enchantId);
  if (scroll.kind !== 'enchantScroll' || !enchant || !compatibleEnchant(enchant, item)) throw new Error('This scroll is incompatible with the selected equipment');
  if (SKILL_RANKS.indexOf(enchant.rank) >= SKILL_RANKS.indexOf('5') && SKILL_RANKS.indexOf(learned.rank) < SKILL_RANKS.indexOf('5')) throw new Error('This scroll requires Enchant rank 5 or better');
  const base = rules.baseChanceBp[enchant.rank], bonus = rules.powderBonusBp[powder.id];
  if (base === undefined || powder.kind !== 'material' || bonus === undefined) throw new Error('Unsupported scroll or powder');
  if ((hero.inventory[scroll.id] ?? 0) < costs.scrollCount || (hero.inventory[powder.id] ?? 0) < costs.powderCount) throw new Error('Own one scroll and one powder for this attempt');
  if (hero.mana < costs.manaCost) throw new Error(`Requires ${costs.manaCost} MP. Use a mana potion or visit the healer.`);
  const intelligence = heroStats(hero, content).effective.intelligence;
  return { ...selection, enchant, item, equipment: cloneData(equipment), costs, intelligence, chanceBp: applicationChance(intelligence, base, bonus, rules.intCap, rules.intBonusBpPerPoint), overwritten: equipment[enchant.slot] ? cloneData(equipment[enchant.slot]) : undefined, opposite: equipment[enchant.slot === 'prefix' ? 'suffix' : 'prefix'] ? cloneData(equipment[enchant.slot === 'prefix' ? 'suffix' : 'prefix']) : undefined };
}
export function previewBurn(hero: Hero, target: EquipmentReference, content: ContentRegistry) {
  const { recipe: costs, rules } = recipe(hero, content), { equipment, item } = targetEquipment(hero, target, content);
  const outputs = (['prefix', 'suffix'] as const).flatMap((slot) => {
    const installed = equipment[slot]; if (!installed) return [];
    const scroll = content.data.items.find((i) => i.kind === 'enchantScroll' && i.enchantId === installed.enchantId);
    if (!scroll) throw new Error('No supported recovery scroll');
    return [{ slot, scrollId: scroll.id, enchantId: installed.enchantId }];
  });
  if (!outputs.length) throw new Error('Choose equipment with at least one enchant to burn');
  if (!hero.inventory[rules.manaHerbId] || !hero.inventory[rules.holyWaterId]) throw new Error('Burning requires one mana herb and one holy water');
  if (hero.mana < costs.burnManaCost) throw new Error(`Burning requires ${costs.burnManaCost} MP`);
  // Reserve every possible output after input consumption, before any draw or destruction.
  const after = cloneData(hero); consumeItem(after.inventory, rules.manaHerbId); consumeItem(after.inventory, rules.holyWaterId);
  if ('weaponId' in target) delete after.weapons[target.weaponId]; else delete after.armors[target.armorId];
  const reserved: Record<string, number> = {};
  for (const output of outputs) { reserved[output.scrollId] = (reserved[output.scrollId] ?? 0) + 1; if (itemCount(after, output.scrollId) + reserved[output.scrollId] > 999) throw new Error('Make room for every possible recovered scroll before burning'); }
  return { target, item, equipment: cloneData(equipment), outputs, costs, rules, chanceBp: costs.burnChanceBp };
}
function awardTraining(hero: Hero, events: Partial<Record<'enchantSuccess' | 'enchantFailure' | 'burnUse' | 'recovery', number>>, content: ContentRegistry) {
  const learned = hero.learnedSkills.enchant;
  for (const objective of gameRank(content.skill('enchant'), learned.rank).objectives) {
    const count = events[objective.event as keyof typeof events] ?? 0;
    if (count) learned.objectiveCounts[objective.id] = Math.min(objective.maximum, (learned.objectiveCounts[objective.id] ?? 0) + count);
  }
}
export function operationReceipt(hero: Hero, operationId: string) {
  return hero.enchanting.receipts.find((r) => r.id === operationId);
}
function requireNewOperation(hero: Hero, operationId: string) {
  if (operationId !== `enchant-${hero.enchanting.nextOperationId}` || !Number.isSafeInteger(hero.enchanting.nextOperationId + 1)) throw new Error('This enchant request has expired. Preview a new operation.');
}
function accept(hero: Hero, receipt: Hero['enchanting']['receipts'][number]) {
  hero.enchanting.nextOperationId++; hero.enchanting.receipts.push(receipt);
  if (hero.enchanting.receipts.length > 100) hero.enchanting.receipts.shift();
}
/** Pure durable candidates: callers publish only after the whole result is saved. */
export function applyEnchant(hero: Hero, request: EnchantRequest, content: ContentRegistry) {
  const previous = operationReceipt(hero, request.operationId);
  if (previous) { if (previous.kind !== 'apply') throw new Error('Operation ID belongs to another action'); return { hero: cloneData(hero), receipt: previous }; }
  requireNewOperation(hero, request.operationId);
  const preview = previewEnchant(hero, request, content), candidate = cloneData(hero);
  const stream = createGameRandom(hero.enchanting.seed); stream.restore(hero.enchanting.state); const random = stream;
  const success = rollSucceeds(random.int(0, 9999), preview.chanceBp);
  consumeItem(candidate.inventory, request.scrollId); consumeItem(candidate.inventory, request.powderId); candidate.mana -= preview.costs.manaCost;
  if (success) {
    const installed: InstalledEnchant = { enchantId: preview.enchant.id, values: {} };
    for (const clause of preview.enchant.clauses) installed.values[clause.id] = clause.min === clause.max ? clause.min : random.int(clause.min, clause.max);
    ownedEquipment(candidate, request.target)[preview.enchant.slot] = installed;
  }
  awardTraining(candidate, { [success ? 'enchantSuccess' : 'enchantFailure']: 1 }, content);
  candidate.enchanting.state = stream.snapshot(); clampHeroResources(candidate, content);
  const message = success ? `${preview.enchant.name} installed on ${preview.item.name}. Spent one scroll, one powder and ${preview.costs.manaCost} MP.` : `Enchant failed. Spent one scroll, one powder and ${preview.costs.manaCost} MP. ${preview.item.name}, durability and both enchants are preserved.`;
  const receipt = { id: request.operationId, kind: 'apply' as const, success, recovered: [], message }; accept(candidate, receipt);
  return { hero: candidate, receipt };
}
export function burnEquipment(hero: Hero, request: BurnRequest, content: ContentRegistry) {
  const previous = operationReceipt(hero, request.operationId);
  if (previous) { if (previous.kind !== 'burn') throw new Error('Operation ID belongs to another action'); return { hero: cloneData(hero), receipt: previous }; }
  requireNewOperation(hero, request.operationId);
  const preview = previewBurn(hero, request.target, content), candidate = cloneData(hero);
  const stream = createGameRandom(hero.enchanting.seed); stream.restore(hero.enchanting.state); const random = stream;
  const recovered = preview.outputs.filter(() => rollSucceeds(random.int(0, 9999), preview.chanceBp)).map((o) => o.scrollId);
  consumeItem(candidate.inventory, preview.rules.manaHerbId); consumeItem(candidate.inventory, preview.rules.holyWaterId); candidate.mana -= preview.costs.burnManaCost;
  if ('weaponId' in request.target) { delete candidate.weapons[request.target.weaponId]; if (candidate.equipment.weapon === request.target.weaponId) delete candidate.equipment.weapon; }
  else { delete candidate.armors[request.target.armorId]; if (candidate.equipment.armor === request.target.armorId) delete candidate.equipment.armor; }
  recovered.forEach((id) => addItem(candidate, id, 1, content)); awardTraining(candidate, { burnUse: 1, recovery: recovered.length }, content);
  candidate.enchanting.state = stream.snapshot(); clampHeroResources(candidate, content);
  const message = `Burned ${preview.item.name} permanently. Spent one mana herb, one holy water and ${preview.costs.burnManaCost} MP. Recovered ${recovered.length} scroll${recovered.length === 1 ? '' : 's'}${recovered.length ? ': ' + recovered.map((id) => content.item(id).name).join(', ') : '.'}`;
  const receipt = { id: request.operationId, kind: 'burn' as const, success: recovered.length > 0, recovered, message }; accept(candidate, receipt);
  return { hero: candidate, receipt };
}
