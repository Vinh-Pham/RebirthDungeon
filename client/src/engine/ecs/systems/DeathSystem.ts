import type { GameEngine } from '../../GameEngine';
import type { Entity } from '../Entity';
import type { GameEvent } from '../../events';
import { validateHealth } from '../components/Health';

/** Keep corpses in ECS for presentation; a death transition is reported only once. */
export function handleDeath(
  engine: GameEngine,
  entity: Entity,
): Extract<GameEvent, { type: 'ENTITY_DIED' }> | undefined {
  if (!entity.health) return;
  validateHealth(entity.health);
  if (entity.health.current !== 0 || entity.dead) return;
  engine.world.addComponent(entity, 'dead', true);
  return { type: 'ENTITY_DIED', entityId: entity.id };
}
