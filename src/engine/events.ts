import type { ActionOutcome, TrainingLedger } from './rpg/Skills';
import type { EntityId } from './ecs/Entity';

export type GameEvent =
  | { type: 'QUEST_ACCEPTED' | 'QUEST_CLAIMED'; questId: string }
  | { type: 'QUEST_TRACKING_CHANGED' }
  | { type: 'ACTION_RESOLVED'; outcome: ActionOutcome }
  | { type: 'SKILL_LEARNED' | 'SKILL_RANKED_UP'; skillId: string; rank: string }
  | { type: 'SKILL_PAGE_INSERTED'; recipeId: string; pageId: string }
  | { type: 'AP_CHANGED'; ap: number }
  | { type: 'SKILL_TRAINING_BANKED'; training: TrainingLedger }
  | { type: 'RESOURCES_CHANGED'; entityId: EntityId; health: number; mana: number; stamina: number; wounds: number; fullness: number }
  | { type: 'WOUNDS_RECEIVED'; entityId: EntityId; amount: number }
  | { type: 'RESTED'; entityId: EntityId }
  | { type: 'DEFENDED'; entityId: EntityId }
  | { type: 'ANIMATION_REQUESTED'; sourceId: EntityId; targetId: EntityId; animation: 'attack' | 'skill' | 'defend'; skillId?: string }
  | { type: 'STATUS_APPLIED' | 'STATUS_EXPIRED'; entityId: EntityId; statusId: string }
  | { type: 'ITEM_USED'; sourceId: EntityId; itemId: string }
  | { type: 'ITEM_HOTBAR_CHANGED'; itemId: string; assigned: boolean }
  | { type: 'ITEM_DROPPED'; itemId: string; quantity: number }
  | { type: 'WORLD_MOVED'; entityId: EntityId; x: number; y: number }
  | { type: 'MAP_CHANGED'; mapId: string }
  | { type: 'WORLD_INTERACTED'; objectId: string; message: string }
  | { type: 'WEAPON_WORN'; entityId: EntityId; weaponId: string; itemId: string; durability: number }
  | { type: 'MANA_RESTORED'; sourceId: EntityId; targetId: EntityId; amount: number }
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
