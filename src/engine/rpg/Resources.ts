import type { Entity } from '../ecs/Entity';
import type { GameEvent } from '../events';
export function healableHealth(target: { health?: { max: number }; wounds?: number }) { return Math.max(0, (target.health?.max ?? 0) - (target.wounds ?? 0)); }
export function staminaCost(target: { stamina?: { current: number; max: number }; fullness?: number }, cost: number) {
  if (!Number.isSafeInteger(cost) || cost < 0) throw new Error('Invalid stamina cost');
  const threshold = (target.stamina?.max ?? 0) * (target.fullness ?? 100) / 100;
  return Math.ceil(cost * ((target.stamina?.current ?? 0) > threshold ? 1.2 : 1));
}
export function resourceTick(entity: Entity, rest = false): GameEvent[] {
  if (!entity.stamina || !entity.health || entity.dead || entity.health.current === 0) return [];
  const before = { health: entity.health.current, mana: entity.mana?.current ?? 0, stamina: entity.stamina.current, fullness: entity.fullness ?? 100 };
  if (entity.player) entity.fullness = Math.max(50, Math.round((before.fullness - 0.1) * 10) / 10);
  entity.health.current = Math.min(healableHealth(entity), entity.health.current + 1);
  if (entity.mana) entity.mana.current = Math.min(entity.mana.max, entity.mana.current + 1);
  const threshold = Math.floor(entity.stamina.max * (entity.fullness ?? 100) / 100);
  const amount = Math.floor((rest ? 10 : 1) * (entity.stamina.current > threshold ? 0.8 : 1));
  entity.stamina.current += Math.max(0, Math.min(amount, threshold - entity.stamina.current));
  return [{ type: 'RESOURCES_CHANGED', entityId: entity.id, health: entity.health.current, mana: entity.mana?.current ?? 0, stamina: entity.stamina.current, wounds: entity.wounds ?? 0, fullness: entity.fullness ?? 100 }];
}
export function validateResources(entity: Entity) {
  for (const resource of [entity.mana, entity.stamina]) if (resource && (!Number.isSafeInteger(resource.current) || !Number.isSafeInteger(resource.max) || resource.current < 0 || resource.current > resource.max)) throw new Error('Invalid resources');
  if (entity.wounds !== undefined && (!Number.isSafeInteger(entity.wounds) || entity.wounds < 0 || entity.wounds > entity.health!.max || entity.health!.current > healableHealth(entity))) throw new Error('Invalid wounds');
  if (entity.fullness !== undefined && (!Number.isFinite(entity.fullness) || entity.fullness < 50 || entity.fullness > 100 || Math.abs(entity.fullness * 10 - Math.round(entity.fullness * 10)) > 1e-8)) throw new Error('Invalid fullness');
}
