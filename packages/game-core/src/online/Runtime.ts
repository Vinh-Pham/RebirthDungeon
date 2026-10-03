import { createGameRandom } from '../engine/Random';
import { cloneData } from '../engine/cloneData';
import { loadGameContent } from '../data/content';
import { validateCampaign, type CampaignState } from '../persistence/SaveSchema';
import { JourneySession } from '../game/JourneySession';
import type { BattleSession, PersistedBattleState } from '../game/BattleSession';
import type { VictoryLoot } from '../game/VictoryLoot';
import { setItemHotbar } from '../engine/rpg/Inventory';
import { heroStats, previewEquipment } from '../engine/rpg/Character';
import { effectiveEntity } from '../engine/rpg/StatusEffects';
import { previewBurn, previewEnchant } from '../engine/rpg/Enchants';
import {
  LootSchema,
  PublicViewSchema,
  type CharacterMetadata,
  type OnlineCommand,
  type PreviewRequestSchema,
} from './Contracts';
import type { z } from 'zod';

export const gameContent = loadGameContent();
export interface OnlineState {
  campaign: CampaignState;
  context: {
    activeService?: string;
    resting: boolean;
    lastRestTick?: number;
    restLeaseUntil?: number;
  };
  battle?: PersistedBattleState;
  rewards?: { loot: VictoryLoot; randomState: number[] };
}
export interface Execution {
  state: OnlineState;
  outcome: { message: string; events: string[] };
}
function open(state: OnlineState, name: string) {
  const journey = new JourneySession(gameContent, cloneData(state.campaign), undefined, name);
  journey.restoreRuntime(state.context);
  let battle: BattleSession | undefined;
  try {
    if (state.battle) {
      battle = journey.createBattle();
      battle.restoreState(state.battle);
    }
    if (!!state.campaign.pending !== !!battle) throw new Error('Missing durable encounter');
    return { journey, battle };
  } catch (error) {
    battle?.dispose();
    journey.dispose();
    throw error;
  }
}
export function newOnlineState(
  seed: number,
  name: string,
  talent: CharacterMetadata['talent'],
): OnlineState {
  const journey = new JourneySession(gameContent, undefined, seed, name, talent);
  try {
    return { campaign: journey.toSave(), context: { resting: false } };
  } finally {
    journey.dispose();
  }
}
export function validateOnlineState(state: OnlineState, name: string): void {
  validateCampaign(state.campaign, gameContent);
  const { journey, battle } = open(state, name);
  try {
    if (battle) {
      battle.exportState();
      if (battle.combat.result === 'victory') {
        if (!state.rewards) throw new Error('Missing encounter rewards');
        LootSchema.parse(state.rewards.loot);
        createGameRandom(state.campaign.seed).restore(state.rewards.randomState);
        for (const item of state.rewards.loot.items) gameContent.item(item.itemId);
      } else if (state.rewards) throw new Error('Unexpected encounter rewards');
    } else if (state.rewards) throw new Error('Rewards without an encounter');
    if (
      state.context.resting &&
      (!Number.isSafeInteger(state.context.lastRestTick) ||
        !Number.isSafeInteger(state.context.restLeaseUntil))
    )
      throw new Error('Invalid rest lease');
  } finally {
    battle?.dispose();
    journey.dispose();
  }
}
export function execute(
  state: OnlineState,
  name: string,
  command: OnlineCommand,
  now: number,
): Execution {
  const { journey, battle: restored } = open(state, name);
  let battle = restored;
  const events: string[] = [];
  const cleanup = journey.engine.events.subscribe((event) => events.push(event.type));
  let battleCleanup = battle?.engine.events.subscribe((event) => events.push(event.type));
  const context = { ...state.context };
  let rewards = state.rewards ? cloneData(state.rewards) : undefined;
  try {
    if (command.type === 'BATTLE_ACTION') {
      if (!battle || battle.combat.result) throw new Error('No active player turn');
      const sequence = battle.combat.completedActions;
      const result = battle.executePlayerAction(command.action, command.targetId, sequence);
      if (!result || battle.combat.completedActions === sequence)
        throw new Error('Invalid battle action');
      battle.advanceEnemyTurns();
    } else if (command.type === 'SETTLE_ENCOUNTER') {
      if (!battle || !battle.combat.result) throw new Error('Encounter is not ready to settle');
      if (battle.combat.result === 'defeat' && command.selectedItemIds?.length)
        throw new Error('Defeat has no loot');
      // Use the offer committed at the terminal boundary; settlement makes no new loot draws.
      journey.finishBattle(battle, command.selectedItemIds, rewards);
      battleCleanup?.();
      battleCleanup = undefined;
      battle.dispose();
      battle = undefined;
      rewards = undefined;
    } else if (command.type === 'REST_PULSE') {
      if (
        !context.resting ||
        context.lastRestTick === undefined ||
        context.restLeaseUntil === undefined
      )
        throw new Error('Start resting first');
      if (now < context.lastRestTick + 1000)
        throw new Error('Rest pulses must be at least one second apart');
      // An expired lease renews without recovering missed time or granting a tick.
      if (now <= context.restLeaseUntil) journey.dispatch({ type: 'REST', entityId: 'player' });
      context.lastRestTick = now;
      context.restLeaseUntil = now + 3000;
    } else {
      if (
        battle &&
        !['SET_ITEM_HOTBAR', 'TRACK_QUEST_OBJECTIVE', 'STOP_REST'].includes(command.type)
      )
        throw new Error('Finish the encounter first');
      if (command.type === 'SET_ITEM_HOTBAR' && battle)
        setItemHotbar(
          {
            inventory: battle.engine.getEntity('player')!.inventory!,
            itemHotbar: [...journey.toSave().hero.itemHotbar],
          },
          command.itemId,
          command.assigned,
          gameContent,
        );
      if (command.type === 'APPLY_ENCHANT' || command.type === 'BURN_EQUIPMENT') {
        journey.dispatch({
          ...command,
          operationId: `enchant-${state.campaign.hero.enchanting.nextOperationId}`,
          revision: journey.getSnapshot().revision,
        });
      } else if (command.type === 'MOVE') journey.dispatch({ ...command, entityId: 'player' });
      else journey.dispatch(command);
      if (command.type === 'SET_ITEM_HOTBAR' && battle)
        battle.setItemHotbar(journey.toSave().hero.itemHotbar);
      if (command.type === 'START_REST') {
        context.lastRestTick = now;
        context.restLeaseUntil = now + 3000;
      }
      if (command.type === 'STOP_REST') {
        delete context.lastRestTick;
        delete context.restLeaseUntil;
      }
      if (!battle && journey.toSave().pending) {
        battle = journey.createBattle();
        battleCleanup = battle.engine.events.subscribe((event) => events.push(event.type));
        battle.advanceEnemyTurns();
      }
    }
    if (battle?.combat.result === 'victory' && !rewards) rewards = journey.victoryOffer(battle);
    const view = journey.getSnapshot();
    context.activeService = view.activeService;
    context.resting = view.resting;
    const candidate: OnlineState = {
      campaign: journey.toSave(),
      context,
      ...(battle ? { battle: battle.exportState() } : {}),
      ...(rewards ? { rewards } : {}),
    };
    validateOnlineState(candidate, name);
    return {
      state: candidate,
      outcome: {
        message: battle ? (battle.combat.result ?? 'Battle action committed') : view.message,
        events: [...new Set(events)].slice(0, 100),
      },
    };
  } finally {
    cleanup();
    battleCleanup?.();
    battle?.dispose();
    journey.dispose();
  }
}
export function preview(
  state: OnlineState,
  selection: z.infer<typeof PreviewRequestSchema>['selection'],
) {
  if (state.battle) throw new Error('Finish the encounter before changing equipment');
  switch (selection.type) {
    case 'EQUIPMENT':
      return {
        type: 'EQUIPMENT',
        ...previewEquipment(
          state.campaign.hero,
          selection.item,
          gameContent,
          state.campaign.dungeon?.effects,
        ),
      };
    case 'ENCHANT':
      return { type: 'ENCHANT', ...previewEnchant(state.campaign.hero, selection, gameContent) };
    case 'BURN':
      return { type: 'BURN', ...previewBurn(state.campaign.hero, selection.target, gameContent) };
  }
}
export function publicView(state: OnlineState, character: CharacterMetadata) {
  const { journey, battle } = open(state, character.name);
  try {
    const view = journey.getSnapshot();
    const { enchanting: _private, ...hero } = state.campaign.hero;
    const run = state.campaign.dungeon;
    const map = cloneData(view.map);
    // Fountain results, generated encounter seeds and treasure rolls belong to the private blueprint.
    if (run) {
      map.id = `dungeon:${character.id}`;
      map.objects = map.objects.map((object) => {
        const copy = { ...object };
        delete copy.encounterMap;
        if (copy.kind === 'encounter') copy.encounterMap = 'unrevealed';
        if (copy.kind === 'finalChest' || copy.kind === 'chest') {
          copy.itemId = 'unrevealed';
          copy.quantity = 1;
        }
        return copy;
      });
    }
    return PublicViewSchema.parse({
      version: 1,
      character,
      hero,
      stats: heroStats(state.campaign.hero, gameContent, state.campaign.dungeon?.effects),
      worldId: map.id,
      position: state.campaign.position,
      map,
      opened: state.campaign.opened,
      cleared: state.campaign.cleared,
      activeService: view.activeService,
      resting: view.resting,
      ...(run
        ? {
            dungeon: {
              definitionId: run.blueprint.definitionId,
              bossDoorOpened: run.bossDoorOpened,
              selectedChest: run.selectedChest,
              effects: run.effects,
              bossKey: run.bossKey.status,
              treasureKey: run.treasureKey.status,
            },
          }
        : {}),
      ...(battle
        ? {
            encounter: {
              id: `${character.id}:encounter:${state.campaign.encounterCount}`,
              phase: battle.battle.phase,
              map: run ? { ...battle.map, id: `${character.id}:battle` } : battle.map,
              actionSequence: battle.combat.completedActions,
              turnId: battle.combat.currentTurn(),
              actors: battle.engine.world.entities.map((entity) => ({
                id: entity.id,
                name: entity.name,
                player: !!entity.player,
                enemy: !!entity.enemy,
                health: entity.health,
                mana: entity.mana,
                stamina: entity.stamina,
                wounds: entity.wounds,
                fullness: entity.fullness,
                ammunitionItemId: entity.ammunitionItemId,
                defending: state.battle!.combat.defending.includes(entity.id),
                dead: !!entity.dead,
                statuses: entity.statuses ?? [],
                cooldowns: entity.cooldowns ?? {},
                inventory: entity.inventory ?? {},
                stats: effectiveEntity(entity, gameContent).combatant,
                weapon: entity.weapon,
                learnedSkills: entity.learnedSkills,
                itemHotbar: entity.itemHotbar ?? [],
                position: entity.position,
              })),
              rewards: state.rewards?.loot,
            },
          }
        : {}),
    });
  } finally {
    battle?.dispose();
    journey.dispose();
  }
}
