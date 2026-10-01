import type { ContentRegistry } from '../data/ContentRegistry';
import type { Entity } from '../ecs/Entity';
import type { GameEvent } from '../events';
import { validateCombatStats } from '../ecs/components/CombatStats';
export interface ActiveStatus { id: string; sourceId: string; remainingTurns: number; stacks: number }
export function effectiveEntity(entity: Entity, content?: ContentRegistry): Entity {
  if (!entity.combatant || !content) return entity;
  const combatant = { ...entity.combatant };
  const totals = { attack: 0, defense: 0, speed: 0 };
  for (const active of entity.statuses ?? []) {
    const status = content.status(active.id);
    if (status.effect === 'stat' && status.stat) {
      totals[status.stat] += status.modifier * active.stacks;
    }
  }
  for (const key of ['attack', 'defense', 'speed'] as const) combatant[key] = Math.max(0, combatant[key] + totals[key]);
  if (combatant.minDamage !== undefined) { combatant.minDamage = Math.max(0, combatant.minDamage + totals.attack); combatant.maxDamage = combatant.attack; }
  validateCombatStats(combatant);
  return { ...entity, combatant };
}
export function applyStatus(entity: Entity, id: string, sourceId: string, content: ContentRegistry, events: GameEvent[]) {
  const definition = content.status(id);
  const statuses = entity.statuses ??= [];
  const existing = statuses.find((status) => status.id === id);
  if (existing && definition.stacking === 'ignore') return;
  if (existing) {
    existing.remainingTurns = definition.duration;
    if (definition.stacking === 'stack') existing.stacks = Math.min(10, existing.stacks + 1);
    existing.sourceId = sourceId;
  } else statuses.push({ id, sourceId, remainingTurns: definition.duration, stacks: 1 });
  events.push({ type: 'STATUS_APPLIED', entityId: entity.id, statusId: id });
}
export function tickStatuses(entity: Entity, timing: 'turnStart' | 'turnEnd', content: ContentRegistry, events: GameEvent[]) {
  if (entity.dead || !entity.health) return;
  for (const active of entity.statuses ?? []) {
    const definition = content.status(active.id);
    if (definition.tickTiming !== timing) continue;
    const power = definition.power * active.stacks;
    if (definition.effect === 'damage') {
      const amount = Math.min(entity.health.current, power); entity.health.current -= amount;
      events.push({ type: 'DAMAGE_DEALT', sourceId: active.sourceId, targetId: entity.id, amount, critical: false });
    } else if (definition.effect === 'heal') {
      const amount = Math.max(0, Math.min(entity.health.max - (entity.wounds ?? 0) - entity.health.current, power)); entity.health.current += amount;
      events.push({ type: 'HEALTH_RESTORED', sourceId: active.sourceId, targetId: entity.id, amount });
    }
    active.remainingTurns--;
    if (active.remainingTurns === 0) events.push({ type: 'STATUS_EXPIRED', entityId: entity.id, statusId: active.id });
    if (entity.health.current === 0) break;
  }
  entity.statuses = (entity.statuses ?? []).filter((status) => status.remainingTurns > 0);
}
