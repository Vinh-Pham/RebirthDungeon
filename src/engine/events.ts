import type { EntityId } from './ecs/Entity';

export type GameEvent =
  | { type: 'ANIMATION_REQUESTED'; sourceId: EntityId; targetId: EntityId; animation: 'attack' | 'skill'; skillId?: string }
  | { type: 'STATUS_APPLIED' | 'STATUS_EXPIRED'; entityId: EntityId; statusId: string }
  | { type: 'ITEM_USED'; sourceId: EntityId; itemId: string }
  | { type: 'WORLD_MOVED'; entityId: EntityId; x: number; y: number }
  | { type: 'MAP_CHANGED'; mapId: string }
  | { type: 'WORLD_INTERACTED'; objectId: string; message: string }
  | { type: 'ENCOUNTER_STARTED'; objectId: string }
  | { type: 'LOOT_RECEIVED'; gold: number; experience: number }
  | { type: 'EQUIPMENT_CHANGED'; itemId?: string }
  | { type: 'HEALTH_RESTORED'; sourceId: EntityId; targetId: EntityId; amount: number }
  | { type: 'DAMAGE_DEALT'; sourceId: EntityId; targetId: EntityId; amount: number; critical: boolean }
  | { type: 'ATTACK_MISSED'; sourceId: EntityId; targetId: EntityId }
  | { type: 'TURN_STARTED'; entityId: EntityId }
  | { type: 'TURN_ENDED'; entityId: EntityId }
  | { type: 'ENTITY_DIED'; entityId: EntityId }
  | { type: 'ENTITY_REMOVED'; entityId: EntityId }
  | { type: 'SKILL_USED'; sourceId: EntityId; skillId: string }
  | { type: 'BATTLE_ENDED'; result: 'victory' | 'defeat' };
