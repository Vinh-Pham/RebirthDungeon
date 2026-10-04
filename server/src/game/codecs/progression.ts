import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { n, s, singleton, rowReader, type AddRow } from './rows.js';
export function decodeProgression(rows: Rows, talent: string) {
  const { get, list } = rowReader(rows);

  const h = singleton(get('heroes'));
  return {
    classId: s(h, 'class_id'),
    level: n(h, 'level'),
    cumulativeLevel: n(h, 'cumulative_level'),
    experience: n(h, 'experience'),
    gold: n(h, 'gold'),
    ap: n(h, 'ap'),
    growthTalent: talent,
    claimedMilestones: list('milestone_claims', 'milestone_id'),
  };
}
export function encodeProgression(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  add('heroes', {
    class_id: h.classId,
    level: h.level,
    cumulative_level: h.cumulativeLevel,
    experience: h.experience,
    gold: h.gold,
    ap: h.ap,
  });
  h.claimedMilestones.forEach((milestone_id, position) =>
    add('milestone_claims', { milestone_id, position }),
  );
}
