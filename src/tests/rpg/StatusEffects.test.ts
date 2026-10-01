import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import type { Entity } from '../../engine/ecs/Entity';
import type { GameEvent } from '../../engine/events';
import { applyHero, createHero } from '../../engine/rpg/Character';
import { applyStatus, effectiveEntity, tickStatuses } from '../../engine/rpg/StatusEffects';
import { TurnQueue } from '../../engine/battle/TurnQueue';

const original = loadGameContent();
function content() {
  const data = structuredClone(original.data);
  data.statusEffects.push({ ...data.statusEffects[0], id: 'mend', name: 'Mend', effect: 'heal', power: 20, modifier: 0, stat: undefined, tickTiming: 'turnEnd', duration: 3, stacking: 'refresh' });
  data.statusEffects.push({ ...data.statusEffects[0], id: 'haste', name: 'Haste', effect: 'stat', stat: 'speed', power: 0, modifier: 100, tickTiming: 'turnEnd', duration: 3, stacking: 'refresh' });
  return new ContentRegistry(data);
}
function player(registry: ContentRegistry) {
  const entity: Entity = { id: 'player', player: true }; applyHero(entity, createHero(registry), registry); return entity;
}

describe('owner-boundary combat statuses', () => {
  it('does not revive zero-HP actors or tick their healing and damage counters', () => {
    const registry = content(), entity = player(registry); entity.health!.current = 0;
    applyStatus(entity, 'mend', 'player', registry, []); applyStatus(entity, 'burn', 'enemy', registry, []);
    const before = structuredClone(entity); const events: GameEvent[] = [];
    tickStatuses(entity, 'turnEnd', registry, events); tickStatuses(entity, 'turnStart', registry, events);
    expect(entity).toEqual(before); expect(events).toEqual([]);
  });

  it('caps periodic healing at the unwounded limit and expires only on the matching boundary', () => {
    const registry = content(), entity = player(registry); entity.health!.current = 80; entity.wounds = 30;
    applyStatus(entity, 'mend', 'player', registry, []); const events: GameEvent[] = [];
    tickStatuses(entity, 'turnStart', registry, events);
    expect(entity.health!.current).toBe(80); expect(entity.statuses![0].remainingTurns).toBe(3);
    tickStatuses(entity, 'turnEnd', registry, events);
    expect(entity.health!.current).toBe(88); expect(entity.wounds).toBe(30); expect(entity.statuses![0].remainingTurns).toBe(2);
    tickStatuses(entity, 'turnEnd', registry, events); tickStatuses(entity, 'turnEnd', registry, events);
    expect(entity.statuses).toEqual([]); expect(events.at(-1)).toEqual({ type: 'STATUS_EXPIRED', entityId: 'player', statusId: 'mend' });
  });

  it.each(['refresh', 'stack', 'ignore'] as const)('reapplies by status ID with %s behavior', (stacking) => {
    const data = structuredClone(original.data); data.statusEffects.find((s) => s.id === 'focus')!.stacking = stacking;
    const registry = new ContentRegistry(data), entity = player(registry);
    applyStatus(entity, 'focus', 'first', registry, []); entity.statuses![0].remainingTurns = 1;
    applyStatus(entity, 'focus', 'second', registry, []);
    expect(entity.statuses).toHaveLength(1);
    expect(entity.statuses![0]).toMatchObject({ remainingTurns: stacking === 'ignore' ? 1 : registry.status('focus').duration, stacks: stacking === 'stack' ? 2 : 1, sourceId: stacking === 'ignore' ? 'first' : 'second' });
    if (stacking === 'stack') {
      for (let i = 0; i < 20; i++) applyStatus(entity, 'focus', 'second', registry, []);
      expect(entity.statuses![0].stacks).toBe(10);
    }
  });

  it('derives temporary stats once on a detached entity without changing the fixed initiative order', () => {
    const registry = content(), entity = player(registry), enemy = registry.spawn('slime', 'enemy', 'enemy', 0, 0);
    enemy.combatant!.speed = 20;
    const turns = new TurnQueue(); turns.initialize([entity, enemy]); const order = [...turns.order];
    applyStatus(entity, 'haste', 'player', registry, []); applyStatus(entity, 'focus', 'player', registry, []);
    const before = structuredClone(entity); const effective = effectiveEntity(entity, registry);
    expect(effective.combatant!.speed).toBe(entity.combatant!.speed + 100);
    expect(effective.combatant!.minDamage).toBe(entity.combatant!.minDamage! + registry.status('focus').modifier);
    expect(effective.combatant!.magicAttack).toBe(entity.combatant!.magicAttack);
    expect(entity).toEqual(before); expect(turns.order).toEqual(order);
  });
});
