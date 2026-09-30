import type { Entity, EntityId } from '../ecs/Entity';

export interface TurnScheduler {
  initialize(entities: readonly Entity[]): void;
  current(): EntityId | undefined;
  advance(): EntityId | undefined;
  remove(entityId: EntityId): void;
}

/** Fixed speed order, repeated each round. Ties preserve initial participant order. */
export class TurnQueue implements TurnScheduler {
  private ids: EntityId[] = [];
  private cursor = 0;

  initialize(entities: readonly Entity[]): void {
    const seen = new Set<EntityId>();
    for (const entity of entities) {
      if (!entity.id.trim() || seen.has(entity.id)) throw new Error('Turn queue requires unique nonempty IDs');
      seen.add(entity.id);
      if (entity.combatant && (!Number.isSafeInteger(entity.combatant.speed) || entity.combatant.speed < 0)) {
        throw new RangeError('Turn speed must be a nonnegative safe integer');
      }
    }
    this.ids = entities
      .filter((entity) => entity.health && entity.health.current > 0 && entity.combatant && !entity.dead)
      .map((entity, index) => ({ id: entity.id, speed: entity.combatant!.speed, index }))
      .sort((a, b) => b.speed - a.speed || a.index - b.index)
      .map(({ id }) => id);
    this.cursor = 0;
  }

  current(): EntityId | undefined { return this.ids[this.cursor]; }

  advance(): EntityId | undefined {
    if (this.ids.length) this.cursor = (this.cursor + 1) % this.ids.length;
    return this.current();
  }

  remove(entityId: EntityId): void {
    const index = this.ids.indexOf(entityId);
    if (index < 0) return;
    this.ids.splice(index, 1);
    if (index < this.cursor) this.cursor--;
    this.cursor = this.ids.length ? this.cursor % this.ids.length : 0;
  }

  /** Detached order; callers cannot mutate the scheduler. */
  get order(): readonly EntityId[] { return [...this.ids]; }
}
