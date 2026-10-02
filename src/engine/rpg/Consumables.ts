import type { ItemDefinition } from '../../data/schemas/content';
import { healableHealth } from './Resources';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { Entity } from '../ecs/Entity';

/** Reused by battle confirmation and previews; validation never consumes or rolls. */
export function prepareBattleItem(source: Entity, itemId: string, content: ContentRegistry) {
  const item = content.item(itemId);
  if (!source.player || source.dead || !source.health?.current || !source.itemHotbar?.includes(itemId)) throw new Error('This item is not assigned to the Items hotbar');
  if (item.kind !== 'consumable' || !item.battleUsable) throw new Error('This item cannot be used in battle');
  const quantity = source.inventory?.[itemId] ?? 0;
  if (!quantity) throw new Error('Out of stock');
  return { item, quantity, recovery: consumableRecovery(item, source) };
}
/** A detached recovery plan; no resource or inventory changes occur during validation. */
export function consumableRecovery(item: ItemDefinition, target: {
  health?: { current: number; max: number }; mana?: { current: number; max: number }; stamina?: { current: number; max: number }; wounds?: number; fullness?: number;
}) {
  if (item.kind !== 'consumable') throw new Error('This item cannot be consumed');
  const resource = target[item.restores];
  if (!resource || !Number.isInteger(resource.current) || !Number.isInteger(resource.max) || resource.current < 0 || resource.current > resource.max) throw new Error('Invalid consumable target');
  const fullnessAfter = Math.min(100, (target.fullness ?? 100) + item.fullnessRecovery);
  const limit = item.restores === 'health' ? healableHealth(target) : resource.max;
  const amount = Math.max(0, Math.min(item.power, limit - resource.current));
  const staminaBonus = target.stamina ? Math.max(0, Math.min(item.staminaRecovery, target.stamina.max - target.stamina.current - (item.restores === 'stamina' ? amount : 0))) : 0;
  return { resource: item.restores, amount, staminaBonus, fullnessAfter };
}
