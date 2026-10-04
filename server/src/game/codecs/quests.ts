import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { s, optional, ordered, rowReader, type AddRow } from './rows.js';
export function decodeQuests(rows: Rows, _talent: string) {
  const { get, map, list, counters } = rowReader(rows);
  return {
    quests: map('quests', 'quest_id', (r) => ({
      status: s(r, 'status'),
      stageId: s(r, 'stage_id'),
      claimId: optional(r, 'claim_id'),
      counts: counters('quest_objective_counts', 'quest_id', s(r, 'quest_id')),
    })),
    questFlags: list('quest_flags', 'flag_id'),
    trackedObjectives: ordered(get('tracked_objectives')).map((r) => ({
      questId: s(r, 'quest_id'),
      objectiveId: s(r, 'objective_id'),
    })),
  };
}
export function encodeQuests(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  Object.entries(h.quests).forEach(([quest_id, record]) => {
    add('quests', {
      quest_id,
      status: record.status,
      stage_id: record.stageId,
      claim_id: record.claimId,
    });
    Object.entries(record.counts).forEach(([objective_id, count]) =>
      add('quest_objective_counts', { quest_id, objective_id, count }),
    );
  });
  h.questFlags.forEach((flag_id, position) =>
    add('quest_flags', { flag_id, position }),
  );
  h.trackedObjectives.forEach((record, position) =>
    add('tracked_objectives', {
      position,
      quest_id: record.questId,
      objective_id: record.objectiveId,
    }),
  );
}
