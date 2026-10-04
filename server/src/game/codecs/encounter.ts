import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import {
  n,
  s,
  optional,
  ordered,
  singleton,
  words,
  wordColumns,
  rowReader,
  type AddRow,
} from './rows.js';
import { actorsModels } from '../../db/schema/game/actors.js';
import { encodeModel, decodeModel } from '../../db/relational-model.js';
import type { PersistedBattleState } from '@rebirth/game-core/game/BattleSession';
export function decodeEncounter(rows: Rows) {
  const { get, matching } = rowReader(rows);
  let pending: OnlineState['campaign']['pending'];
  let battle: PersistedBattleState | undefined;
  if (get('encounters').length) {
    const b = singleton(get('encounters'));
    if (
      b.algorithm !== 'xoroshiro128plus' ||
      b.phase !== (b.result ?? 'selectingAction')
    )
      throw new Error('Invalid encounter format');
    pending = {
      worldId: s(b, 'world_id'),
      objectId: s(b, 'object_id'),
      mapId: s(b, 'map_id'),
      seed: n(b, 'seed'),
    };
    const entities = ordered(get('encounter_actors')).map((r) =>
      decodeModel(
        actorsModels.actor,
        { character_id: s(r, 'character_id'), actor_id: s(r, 'actor_id') },
        rows,
      ),
    );
    const ledger: Record<
      string,
      { stageId: string; counts: Record<string, number> }
    > = {};
    for (const r of get('encounter_quest_evidence')) {
      const quest = s(r, 'quest_id');
      ledger[quest] ??= { stageId: s(r, 'stage_id'), counts: {} };
      if (r.objective_id !== '')
        ledger[quest].counts[s(r, 'objective_id')] = n(r, 'count');
    }
    battle = {
      version: n(b, 'version'),
      encounterId: s(b, 'encounter_id'),
      seed: n(b, 'seed'),
      randomState: words(b),
      entities,
      combat: {
        outcome: optional(b, 'result'),
        actionSequence: n(b, 'action_sequence'),
        turns: {
          ids: ordered(get('encounter_turn_order')).map((r) =>
            s(r, 'actor_id'),
          ),
          cursor: n(b, 'cursor'),
        },
        defending: ordered(
          get('encounter_actors').filter((r) => r.defending_position !== null),
          'defending_position',
        ).map((r) => s(r, 'actor_id')),
      },
      enemyHistory: ordered(get('encounter_enemy_history')).map((r) => ({
        id: s(r, 'actor_id'),
        action: {
          action: s(r, 'action'),
          ...(r.skill_id !== null ? { skillId: s(r, 'skill_id') } : {}),
          ...(r.item_id !== null ? { itemId: s(r, 'item_id') } : {}),
          ...(r.target_id !== null ? { targetId: s(r, 'target_id') } : {}),
        },
      })),
      training: {
        lastAction: n(b, 'training_last_action'),
        counts: Object.fromEntries(
          [
            ...new Set(get('encounter_training').map((r) => s(r, 'skill_id'))),
          ].map((skill) => [
            skill,
            Object.fromEntries(
              matching('encounter_training', 'skill_id', skill)
                .filter((r) => r.objective_id !== '')
                .map((r) => [s(r, 'objective_id'), n(r, 'count')]),
            ),
          ]),
        ),
      },
      quests: { lastAction: n(b, 'quest_last_action'), ledger },
      titles: {
        encounterId: s(b, 'encounter_id'),
        eligible: !!n(b, 'title_eligible'),
        flawless: !!n(b, 'title_flawless'),
      },
    } as PersistedBattleState;
  }

  return { battle, pending };
}

export function encodeEncounter(
  state: OnlineState,
  id: string,
  rows: Rows,
  add: AddRow,
) {
  const c = state.campaign;
  if (state.battle) {
    const b = state.battle,
      p = c.pending!;
    add('encounters', {
      encounter_id: b.encounterId,
      phase: b.combat.outcome ?? 'selectingAction',
      algorithm: 'xoroshiro128plus',
      world_id: p.worldId,
      object_id: p.objectId,
      map_id: p.mapId,
      map_definition_id: c.dungeon ? null : p.mapId,
      seed: b.seed,
      version: b.version,
      ...wordColumns(b.randomState),
      result: b.combat.outcome,
      action_sequence: b.combat.actionSequence,
      cursor: b.combat.turns.cursor,
      training_last_action: b.training.lastAction,
      quest_last_action: b.quests.lastAction,
      title_eligible: +b.titles.eligible,
      title_flawless: +b.titles.flawless,
    });
    b.entities.forEach((entity, position) => {
      add('encounter_actors', {
        actor_id: entity.id,
        position,
        defending_position: b.combat.defending.includes(entity.id)
          ? b.combat.defending.indexOf(entity.id)
          : undefined,
      });
      encodeModel(
        actorsModels.actor,
        entity,
        { character_id: id, actor_id: entity.id },
        rows,
      );
    });
    b.combat.turns.ids.forEach((actor_id, position) =>
      add('encounter_turn_order', {
        actor_id,
        position,
        defending: +b.combat.defending.includes(actor_id),
      }),
    );
    b.enemyHistory.forEach(({ id: actor_id, action }, position) =>
      add('encounter_enemy_history', {
        actor_id,
        position,
        action: action.action,
        item_id: 'itemId' in action ? String(action.itemId) : undefined,
        skill_id: action.skillId,
        target_id: undefined,
      }),
    );
    Object.entries(b.training.counts).forEach(([skill_id, counts]) =>
      (Object.entries(counts).length
        ? Object.entries(counts)
        : [['', 0] as const]
      ).forEach(([objective_id, count]) =>
        add('encounter_training', { skill_id, objective_id, count }),
      ),
    );
    Object.entries(b.quests.ledger).forEach(([quest_id, record]) => {
      const counts = Object.entries(record.counts);
      if (!counts.length)
        add('encounter_quest_evidence', {
          quest_id,
          stage_id: record.stageId,
          objective_id: '',
          count: 0,
        });
      counts.forEach(([objective_id, count]) =>
        add('encounter_quest_evidence', {
          quest_id,
          stage_id: record.stageId,
          objective_id,
          count,
        }),
      );
    });
  }
  if (state.rewards) {
    add('encounter_rewards', {
      gold: state.rewards.loot.gold,
      experience: state.rewards.loot.experience,
      ...wordColumns(state.rewards.randomState),
    });
    state.rewards.loot.items.forEach((item, position) =>
      add('encounter_reward_items', {
        position,
        item_id: item.itemId,
        quantity: item.quantity,
        collectable: item.collectable,
      }),
    );
  }
}
