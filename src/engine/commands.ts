import type { EnchantRequest, BurnRequest } from './rpg/Enchants';
import type { EntityId } from './ecs/Entity';
import type { EquipmentReference, OwnedItem } from './rpg/Character';
import type { BattleAction } from './battle/BattleMachine';

export type GameCommand =
  | { type: 'SELECT_TITLE'; slot: 'first' | 'second'; titleId?: string }
  | { type: 'UNLOCK_TITLE_COUPON'; itemId: string }
  | { type: 'ACCEPT_QUEST'; questId: string; objectId?: string }
  | { type: 'CLAIM_QUEST'; questId: string; objectId?: string }
  | { type: 'TRACK_QUEST_OBJECTIVE'; questId: string; objectiveId: string }
  | { type: 'LEARN_SKILL'; objectId: string; skillId: string }
  | { type: 'READ_SKILL_BOOK'; itemId: string }
  | { type: 'INSERT_SKILL_PAGE'; recipeId: string; pageId: string }
  | { type: 'RANK_UP_SKILL'; skillId: string }
  | { type: 'REST'; entityId: EntityId }
  | { type: 'DEFEND'; entityId: EntityId }
  | { type: 'INTERACT'; objectId: string }
  | { type: 'CLOSE_SERVICE' }
  | { type: 'BUY_ITEM'; objectId: string; itemId: string; quantity: number }
  | { type: 'SELL_ITEM'; objectId: string; item: OwnedItem; quantity: number }
  | { type: 'REPAIR_WEAPON'; objectId: string; weaponId: string }
  | { type: 'HEAL'; objectId: string }
  | { type: 'OFFER_ITEM'; objectId: string; item: OwnedItem }
  | ({ type: 'APPLY_ENCHANT'; objectId: string } & EnchantRequest)
  | ({ type: 'BURN_EQUIPMENT'; objectId: string } & BurnRequest)
  | { type: 'LOCK_EQUIPMENT'; target: EquipmentReference; locked: boolean }
  | { type: 'EQUIP_ARMOR'; armorId: string }
  | { type: 'EQUIP_WEAPON'; weaponId: string }
  | { type: 'EXIT_DUNGEON' }
  | { type: 'TRAVEL_TO'; x: number; y: number }
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
  const owned = (value: OwnedItem) => value && typeof value === 'object' && ['itemId', 'weaponId', 'armorId'].filter((key) => key in value).length === 1 && Object.keys(value).length === 1 && id(Object.values(value)[0]);
  const equipment = (value: EquipmentReference) => owned(value) && !('itemId' in value);
  const quantity = (value: number) => Number.isInteger(value) && value >= 1 && value <= 999;
  let valid = false;
  switch (command?.type) {
    case 'SELECT_TITLE': valid = ['first', 'second'].includes(command.slot) && (command.titleId === undefined || id(command.titleId)); break;
    case 'UNLOCK_TITLE_COUPON': valid = id(command.itemId); break;
    case 'ACCEPT_QUEST':
    case 'CLAIM_QUEST': valid = id(command.questId) && (command.objectId === undefined || id(command.objectId)); break;
    case 'TRACK_QUEST_OBJECTIVE': valid = id(command.questId) && id(command.objectiveId); break;
    case 'LEARN_SKILL': valid = id(command.objectId) && id(command.skillId); break;
    case 'READ_SKILL_BOOK': valid = id(command.itemId); break;
    case 'INSERT_SKILL_PAGE': valid = id(command.recipeId) && id(command.pageId); break;
    case 'RANK_UP_SKILL': valid = id(command.skillId); break;
    case 'REST':
    case 'DEFEND': valid = id(command.entityId); break;
    case 'INTERACT': valid = id(command.objectId); break;
    case 'BUY_ITEM': valid = id(command.objectId) && id(command.itemId) && quantity(command.quantity); break;
    case 'SELL_ITEM': valid = id(command.objectId) && owned(command.item) && quantity(command.quantity); break;
    case 'REPAIR_WEAPON': valid = id(command.objectId) && id(command.weaponId); break;
    case 'HEAL': valid = id(command.objectId); break;
    case 'OFFER_ITEM': valid = id(command.objectId) && owned(command.item); break;
    case 'APPLY_ENCHANT': valid = id(command.objectId) && equipment(command.target) && id(command.scrollId) && id(command.powderId) && Number.isSafeInteger(command.revision) && id(command.operationId); break;
    case 'BURN_EQUIPMENT': valid = id(command.objectId) && equipment(command.target) && Number.isSafeInteger(command.revision) && id(command.operationId); break;
    case 'LOCK_EQUIPMENT': valid = equipment(command.target) && typeof command.locked === 'boolean'; break;
    case 'EQUIP_ARMOR': valid = id(command.armorId); break;
    case 'EQUIP_WEAPON': valid = id(command.weaponId); break;
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
      valid = command.action === 'attack' || command.action === 'defend' || command.action === 'rest' || (command.action === 'skill' && id(command.skillId)); break;
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

export type ProgressionCommand = Extract<GameCommand, { type: 'SELECT_TITLE' | 'UNLOCK_TITLE_COUPON' | 'APPLY_ENCHANT' | 'BURN_EQUIPMENT' | 'LOCK_EQUIPMENT' | 'LEARN_SKILL' | 'READ_SKILL_BOOK' | 'INSERT_SKILL_PAGE' | 'RANK_UP_SKILL' | 'BUY_ITEM' | 'SELL_ITEM' | 'REPAIR_WEAPON' | 'HEAL' | 'OFFER_ITEM' | 'EXIT_DUNGEON' | 'ACCEPT_QUEST' | 'CLAIM_QUEST' | 'TRACK_QUEST_OBJECTIVE' }>;
export function isProgressionCommand(command: GameCommand): command is ProgressionCommand {
  return ['SELECT_TITLE', 'UNLOCK_TITLE_COUPON', 'APPLY_ENCHANT', 'BURN_EQUIPMENT', 'LOCK_EQUIPMENT', 'LEARN_SKILL', 'READ_SKILL_BOOK', 'INSERT_SKILL_PAGE', 'RANK_UP_SKILL', 'BUY_ITEM', 'SELL_ITEM', 'REPAIR_WEAPON', 'HEAL', 'OFFER_ITEM', 'EXIT_DUNGEON', 'ACCEPT_QUEST', 'CLAIM_QUEST', 'TRACK_QUEST_OBJECTIVE'].includes(command.type);
}
