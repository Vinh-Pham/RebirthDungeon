import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { n, s, ordered, rowReader, type AddRow } from './rows.js';
export function decodeSkills(rows: Rows, _talent: string) {
  const { get, map, matching, counters } = rowReader(rows);
  return {
    discoveredSkills: ordered(
      get('character_skills').filter((r) => r.position !== null),
    ).map((r) => s(r, 'skill_id')),
    learnedSkills: Object.fromEntries(
      get('character_skills')
        .filter((r) => r.rank !== null)
        .map((r) => [
          s(r, 'skill_id'),
          {
            rank: s(r, 'rank'),
            objectiveCounts: counters(
              'skill_objective_counts',
              'skill_id',
              s(r, 'skill_id'),
            ),
          },
        ]),
    ),
    bookCollections: map('skill_book_collections', 'recipe_id', (r) => ({
      completed: !!n(r, 'completed'),
      insertedPages: ordered(
        matching('skill_book_pages', 'recipe_id', s(r, 'recipe_id')),
      ).map((page) => s(page, 'page_id')),
    })),
  };
}
export function encodeSkills(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  for (const skill_id of new Set([
    ...h.discoveredSkills,
    ...Object.keys(h.learnedSkills),
  ])) {
    const record = h.learnedSkills[skill_id];
    add('character_skills', {
      skill_id,
      rank: record?.rank,
      position: h.discoveredSkills.includes(skill_id)
        ? h.discoveredSkills.indexOf(skill_id)
        : undefined,
    });
    for (const [objective_id, count] of Object.entries(
      record?.objectiveCounts ?? {},
    ))
      add('skill_objective_counts', { skill_id, objective_id, count });
  }
  Object.entries(h.bookCollections).forEach(([recipe_id, record]) => {
    add('skill_book_collections', { recipe_id, completed: +record.completed });
    record.insertedPages.forEach((page_id, position) =>
      add('skill_book_pages', { recipe_id, page_id, position }),
    );
  });
}
