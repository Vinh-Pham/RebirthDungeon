import type { GameCommand } from '../../engine/commands';
import type { CommandObservation } from '../../engine/CommandBus';
import type { GameEvent } from '../../engine/events';
import type { GameEngine } from '../../engine/GameEngine';
import type { ContentRegistry } from '../../engine/data/ContentRegistry';
import {
  appendLogs,
  type LogCategory,
  type LogInput,
  type LogSink,
} from '../../engine/logging/LogEngine';

export const COMMAND_LABELS = {
  DROP_ITEM: 'Drop item',
  SET_ITEM_HOTBAR: 'Change item hotbar',
  SELECT_TITLE: 'Select title',
  UNLOCK_TITLE_COUPON: 'Unlock title',
  ACCEPT_QUEST: 'Accept quest',
  CLAIM_QUEST: 'Claim quest reward',
  TRACK_QUEST_OBJECTIVE: 'Track quest objective',
  LEARN_SKILL: 'Learn skill',
  READ_SKILL_BOOK: 'Read skill book',
  INSERT_SKILL_PAGE: 'Insert skill page',
  RANK_UP_SKILL: 'Rank up skill',
  USE_LIFE_SKILL: 'Recover through Rest',
  START_REST: 'Start resting',
  STOP_REST: 'Stop resting',
  REST: 'Rest',
  DEFEND: 'Defend',
  INTERACT: 'Interact',
  CLOSE_SERVICE: 'Close town service',
  BUY_ITEM: 'Buy item',
  SELL_ITEM: 'Sell item',
  REPAIR_WEAPON: 'Repair weapon',
  HEAL: 'Visit healer',
  OFFER_ITEM: 'Offer item',
  APPLY_ENCHANT: 'Apply enchant',
  BURN_EQUIPMENT: 'Burn equipment',
  LOCK_EQUIPMENT: 'Change equipment lock',
  EQUIP_ARMOR: 'Equip armor',
  EQUIP_WEAPON: 'Equip weapon',
  EQUIP_AMMUNITION: 'Equip arrows',
  EXIT_DUNGEON: 'Exit dungeon',
  TRAVEL_TO: 'Travel',
  UNEQUIP_ITEM: 'Unequip item',
  START_BATTLE: 'Start encounter',
  SELECT_ACTION: 'Select battle action',
  SELECT_TARGET: 'Select battle target',
  CONFIRM_ACTION: 'Confirm battle action',
  CANCEL_ACTION: 'Cancel battle action',
  ADVANCE_ENEMY_TURN: 'Enemy turn',
  MOVE: 'Move',
  ATTACK: 'Attack',
  USE_SKILL: 'Use skill',
  USE_ITEM: 'Use item',
} satisfies Record<GameCommand['type'], string>;
const movement = new Set<GameCommand['type']>(['MOVE', 'TRAVEL_TO', 'EXIT_DUNGEON', 'OFFER_ITEM']);
export function commandCategory(command: Readonly<GameCommand>, battle: boolean): LogCategory {
  return battle
    ? 'combat'
    : movement.has(command.type)
      ? 'movement'
      : command.type === 'USE_LIFE_SKILL'
        ? 'system'
        : 'user';
}
export function commandLog(observation: CommandObservation, battle: boolean): LogInput {
  const { command, committed, error } = observation;
  const label = COMMAND_LABELS[command.type];
  let detail = '';
  if ('skillId' in command) detail = command.skillId ? ` (${command.skillId})` : '';
  else if ('itemId' in command) detail = ` (${command.itemId})`;
  else if ('objectId' in command) detail = ` (${command.objectId})`;
  else if (command.type === 'TRAVEL_TO') detail = ` to ${command.x}, ${command.y}`;
  else if (command.type === 'SELECT_ACTION') detail = `: ${command.action}`;
  else if (command.type === 'SELECT_TARGET') detail = `: ${command.targetId}`;
  return {
    type: command.type,
    category: commandCategory(command, battle),
    message: `${label}${detail}${committed ? ' completed' : ' rejected'}${error ? `: ${error}` : '.'}`,
    metadata: { committed, parameters: JSON.parse(JSON.stringify(command)) },
  };
}
/** All authored event types must be classified; animations are explicitly presentation-only. */
export const EVENT_POLICY = {
  QUEST_ACCEPTED: 'user',
  QUEST_CLAIMED: 'user',
  QUEST_TRACKING_CHANGED: 'user',
  ACTION_RESOLVED: 'combat',
  SKILL_LEARNED: 'user',
  SKILL_RANKED_UP: 'user',
  SKILL_PAGE_INSERTED: 'user',
  AP_CHANGED: 'user',
  SKILL_TRAINING_BANKED: 'user',
  RESOURCES_CHANGED: 'system',
  WOUNDS_RECEIVED: 'combat',
  RESTED: 'system',
  DEFENDED: 'combat',
  ANIMATION_REQUESTED: null,
  STATUS_APPLIED: 'combat',
  STATUS_EXPIRED: 'combat',
  ITEM_USED: 'user',
  ITEM_HOTBAR_CHANGED: 'user',
  ITEM_DROPPED: 'user',
  WORLD_MOVED: 'movement',
  MAP_CHANGED: 'movement',
  WORLD_INTERACTED: 'user',
  WEAPON_WORN: 'combat',
  MANA_RESTORED: 'user',
  ENCOUNTER_STARTED: 'combat',
  LOOT_RECEIVED: 'user',
  EQUIPMENT_CHANGED: 'user',
  HEALTH_RESTORED: 'user',
  DAMAGE_DEALT: 'combat',
  ATTACK_MISSED: 'combat',
  TURN_STARTED: 'combat',
  TURN_ENDED: 'combat',
  ENTITY_DIED: 'combat',
  ENTITY_REMOVED: 'system',
  SKILL_USED: 'combat',
  BATTLE_ENDED: 'combat',
} satisfies Record<GameEvent['type'], LogCategory | null>;
export function gameEventLog(
  event: GameEvent,
  engine: GameEngine,
  content: ContentRegistry,
  battle: boolean,
): LogInput | undefined {
  const policy = EVENT_POLICY[event.type];
  if (policy === null) return;
  const name = (id: string) => engine.getEntity(id)?.name ?? id;
  let message: string;
  switch (event.type) {
    case 'WORLD_MOVED':
      message = `${name(event.entityId)} moved to ${event.x}, ${event.y}.`;
      break;
    case 'MAP_CHANGED':
      message = `Entered ${content.data.worlds.find((map) => map.id === event.mapId)?.name ?? event.mapId}.`;
      break;
    case 'WORLD_INTERACTED':
      message = event.message || `Interacted with ${event.objectId}.`;
      break;
    case 'DAMAGE_DEALT':
      message = `${name(event.targetId)} loses ${event.amount} HP${event.critical ? ' (critical)' : ''}.`;
      break;
    case 'HEALTH_RESTORED':
      message = `${name(event.targetId)} recovers ${event.amount} HP.`;
      break;
    case 'MANA_RESTORED':
      message = `${name(event.targetId)} recovers ${event.amount} mana.`;
      break;
    case 'ATTACK_MISSED':
      message = `${name(event.sourceId)} misses ${name(event.targetId)}.`;
      break;
    case 'RESTED':
      message = `${name(event.entityId)} rests to recover stamina.`;
      break;
    case 'DEFENDED':
      message = `${name(event.entityId)} defends and recovers stamina.`;
      break;
    case 'WOUNDS_RECEIVED':
      message = `${name(event.entityId)} suffers ${event.amount} wounds.`;
      break;
    case 'STATUS_APPLIED':
    case 'STATUS_EXPIRED':
      message = `${name(event.entityId)} ${event.type === 'STATUS_APPLIED' ? 'gains' : 'loses'} ${content.status(event.statusId).name}.`;
      break;
    case 'SKILL_USED':
      message = `${name(event.sourceId)} uses ${content.skill(event.skillId).name}.`;
      break;
    case 'ITEM_USED':
      message = `${name(event.sourceId)} uses ${content.item(event.itemId).name}.`;
      break;
    case 'ITEM_HOTBAR_CHANGED':
      message = `${content.item(event.itemId).name} ${event.assigned ? 'added to' : 'removed from'} the hotbar.`;
      break;
    case 'ITEM_DROPPED':
      message = `Dropped ${content.item(event.itemId).name} ×${event.quantity}.`;
      break;
    case 'EQUIPMENT_CHANGED':
      message = event.itemId
        ? `Equipped ${content.item(event.itemId).name}.`
        : 'Equipment changed.';
      break;
    case 'WEAPON_WORN':
      message = `${content.item(event.itemId).name}: ${event.durability} durability${event.durability === 0 ? ' (broken)' : ''}.`;
      break;
    case 'TURN_STARTED':
    case 'TURN_ENDED':
      message = `${name(event.entityId)}: turn ${event.type === 'TURN_STARTED' ? 'started' : 'ended'}.`;
      break;
    case 'ENTITY_DIED':
      message = `${name(event.entityId)} falls.`;
      break;
    case 'ENTITY_REMOVED':
      message = `${name(event.entityId)} leaves the world.`;
      break;
    case 'BATTLE_ENDED':
      message = event.result === 'victory' ? 'Encounter won.' : 'Encounter lost.';
      break;
    case 'ENCOUNTER_STARTED':
      message = `Encounter started: ${event.objectId}.`;
      break;
    case 'LOOT_RECEIVED':
      message = `Received ${event.gold} gold and ${event.experience} XP.`;
      break;
    case 'AP_CHANGED':
      message = `Ability points: ${event.ap}.`;
      break;
    case 'SKILL_LEARNED':
    case 'SKILL_RANKED_UP':
      message = `${content.skill(event.skillId).name}: Rank ${event.rank}.`;
      break;
    case 'SKILL_PAGE_INSERTED':
      message = `Inserted ${event.pageId} into ${event.recipeId}.`;
      break;
    case 'QUEST_ACCEPTED':
    case 'QUEST_CLAIMED':
      message = `${event.type === 'QUEST_ACCEPTED' ? 'Accepted' : 'Claimed rewards for'} ${content.data.quests.find((q) => q.id === event.questId)?.name ?? event.questId}.`;
      break;
    case 'QUEST_TRACKING_CHANGED':
      message = 'Quest tracking changed.';
      break;
    case 'RESOURCES_CHANGED':
      message = `${name(event.entityId)}: HP ${event.health}, MP ${event.mana}, SP ${event.stamina}, wounds ${event.wounds}, fullness ${event.fullness.toFixed(1)}%.`;
      break;
    case 'SKILL_TRAINING_BANKED':
      message = 'Encounter skill training committed.';
      break;
    case 'ACTION_RESOLVED':
      message = `${name(event.outcome.sourceId)}: ${event.outcome.action} resolved.`;
      break;
    case 'ANIMATION_REQUESTED':
      return;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
  return {
    type: event.type,
    category: battle ? 'combat' : policy,
    message,
    metadata: JSON.parse(JSON.stringify(event)),
    ...(event.type === 'ACTION_RESOLVED'
      ? { actionId: String(event.outcome.actionId), actorId: event.outcome.sourceId }
      : {}),
  };
}
export function observeGameLogging(
  engine: GameEngine,
  content: ContentRegistry,
  sink: LogSink,
  battle = false,
  encounterId?: string,
): () => void {
  let queued: LogInput[] = [];
  const write = (entry: LogInput) => {
    queued.push({ ...entry, ...(encounterId ? { encounterId } : {}) });
    if (!engine.commands.isDispatching) {
      const batch = queued;
      queued = [];
      appendLogs(sink, batch);
    }
  };
  const commands = engine.commands.observe((observation) => write(commandLog(observation, battle)));
  const events = engine.events.subscribe((event) => {
    try {
      const entry = gameEventLog(event, engine, content, battle);
      if (entry) write(entry);
    } catch {
      /* Logging cannot reject committed simulation events. */
    }
  });
  return () => {
    commands();
    events();
    queued = [];
  };
}
