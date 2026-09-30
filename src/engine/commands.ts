import type { EntityId } from './ecs/Entity';

export type GameCommand =
  | { type: 'INTERACT'; objectId: string }
  | { type: 'EXIT_DUNGEON' }
  | { type: 'TRAVEL_TO'; x: number; y: number }
  | { type: 'EQUIP_ITEM'; itemId: string }
  | { type: 'UNEQUIP_ITEM'; slot: 'weapon' | 'armor' }
  | { type: 'START_BATTLE' }
  | { type: 'SELECT_ACTION'; action: 'attack' | 'skill' | 'item'; skillId?: string; itemId?: string }
  | { type: 'SELECT_TARGET'; targetId: EntityId }
  | { type: 'CONFIRM_ACTION' }
  | { type: 'CANCEL_ACTION' }
  | { type: 'ADVANCE_ENEMY_TURN' }
  | { type: 'MOVE'; entityId: EntityId; dx: number; dy: number }
  | { type: 'ATTACK'; attackerId: EntityId; targetId: EntityId }
  | { type: 'USE_SKILL'; sourceId: EntityId; targetId: EntityId; skillId: string }
  | { type: 'USE_ITEM'; sourceId: EntityId; targetId: EntityId; itemId: string };

/** Shape validation only; systems must validate gameplay rules before mutation. */
export function validateCommand(command: GameCommand): void {
  const id = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  let valid = false;
  switch (command?.type) {
    case 'INTERACT': valid = id(command.objectId); break;
    case 'EQUIP_ITEM': valid = id(command.itemId); break;
    case 'UNEQUIP_ITEM': valid = ['weapon', 'armor'].includes(command.slot); break;
    case 'TRAVEL_TO': valid = Number.isInteger(command.x) && Number.isInteger(command.y); break;
    case 'START_BATTLE':
    case 'EXIT_DUNGEON':
    case 'CONFIRM_ACTION':
    case 'CANCEL_ACTION':
    case 'ADVANCE_ENEMY_TURN':
      valid = true; break;
    case 'SELECT_ACTION':
      valid = command.action === 'attack' || (command.action === 'skill' && id(command.skillId)) || (command.action === 'item' && id(command.itemId)); break;
    case 'SELECT_TARGET':
      valid = id(command.targetId); break;
    case 'MOVE':
      valid = id(command.entityId) && Number.isFinite(command.dx) && Number.isFinite(command.dy);
      break;
    case 'ATTACK':
      valid = id(command.attackerId) && id(command.targetId);
      break;
    case 'USE_SKILL':
      valid = id(command.sourceId) && id(command.targetId) && id(command.skillId);
      break;
    case 'USE_ITEM':
      valid = id(command.sourceId) && id(command.targetId) && id(command.itemId);
      break;
  }
  if (!valid) throw new Error('Invalid game command');
}
