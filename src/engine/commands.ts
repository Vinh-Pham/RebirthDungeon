import type { EntityId } from './ecs/Entity';
import type { OwnedItem } from './rpg/Character';
import type { BattleAction } from './battle/BattleMachine';

export type GameCommand =
  | { type: 'REST'; entityId: EntityId }
  | { type: 'DEFEND'; entityId: EntityId }
  | { type: 'INTERACT'; objectId: string }
  | { type: 'CLOSE_SERVICE' }
  | { type: 'BUY_ITEM'; objectId: string; itemId: string; quantity: number }
  | { type: 'SELL_ITEM'; objectId: string; item: OwnedItem; quantity: number }
  | { type: 'REPAIR_WEAPON'; objectId: string; weaponId: string }
  | { type: 'HEAL'; objectId: string }
  | { type: 'OFFER_ITEM'; objectId: string; item: OwnedItem }
  | { type: 'EQUIP_WEAPON'; weaponId: string }
  | { type: 'EXIT_DUNGEON' }
  | { type: 'TRAVEL_TO'; x: number; y: number }
  | { type: 'EQUIP_ITEM'; itemId: string }
  | { type: 'UNEQUIP_ITEM'; slot: 'weapon' | 'armor' }
  | { type: 'START_BATTLE' }
  | ({ type: 'SELECT_ACTION' } & BattleAction)
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
  const owned = (value: OwnedItem) => value && typeof value === 'object' &&
    (('weaponId' in value && !('itemId' in value) && id(value.weaponId)) || ('itemId' in value && !('weaponId' in value) && id(value.itemId)));
  const quantity = (value: number) => Number.isInteger(value) && value >= 1 && value <= 999;
  let valid = false;
  switch (command?.type) {
    case 'REST':
    case 'DEFEND': valid = id(command.entityId); break;
    case 'INTERACT': valid = id(command.objectId); break;
    case 'BUY_ITEM': valid = id(command.objectId) && id(command.itemId) && quantity(command.quantity); break;
    case 'SELL_ITEM': valid = id(command.objectId) && owned(command.item) && quantity(command.quantity); break;
    case 'REPAIR_WEAPON': valid = id(command.objectId) && id(command.weaponId); break;
    case 'HEAL': valid = id(command.objectId); break;
    case 'OFFER_ITEM': valid = id(command.objectId) && owned(command.item); break;
    case 'EQUIP_WEAPON': valid = id(command.weaponId); break;
    case 'EQUIP_ITEM': valid = id(command.itemId); break;
    case 'UNEQUIP_ITEM': valid = ['weapon', 'armor'].includes(command.slot); break;
    case 'TRAVEL_TO': valid = Number.isInteger(command.x) && Number.isInteger(command.y); break;
    case 'START_BATTLE':
    case 'CLOSE_SERVICE':
    case 'EXIT_DUNGEON':
    case 'CONFIRM_ACTION':
    case 'CANCEL_ACTION':
    case 'ADVANCE_ENEMY_TURN':
      valid = true; break;
    case 'SELECT_ACTION':
      valid = command.action === 'attack' || command.action === 'defend' || command.action === 'rest' || (command.action === 'skill' && id(command.skillId)) || (command.action === 'item' && id(command.itemId)); break;
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
