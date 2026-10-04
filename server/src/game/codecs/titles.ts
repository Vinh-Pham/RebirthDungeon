import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { n, s, ordered, rowReader, type AddRow } from './rows.js';
export function decodeTitles(rows: Rows, _talent: string) {
  const { get, map } = rowReader(rows);
  return {
    earnedTitles: ordered(
      get('character_titles').filter((r) => r.earned_position !== null),
      'earned_position',
    ).map((r) => s(r, 'title_id')),
    titleCollection: {
      discovered: ordered(
        get('character_titles').filter((r) => r.discovered_position !== null),
        'discovered_position',
      ).map((r) => s(r, 'title_id')),
      records: Object.fromEntries(
        get('character_titles')
          .filter((r) => r.source !== null)
          .map((r) => [s(r, 'title_id'), { source: s(r, 'source') }]),
      ),
      evidence: map('title_evidence', 'evidence_id', (r) => n(r, 'count')),
      selected: map('selected_titles', 'slot', (r) => s(r, 'title_id')),
    },
  };
}
export function encodeTitles(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  const titles = new Set([
    ...h.titleCollection.discovered,
    ...h.earnedTitles,
    ...Object.keys(h.titleCollection.records),
  ]);
  for (const title_id of titles)
    add('character_titles', {
      title_id,
      discovered_position: h.titleCollection.discovered.includes(title_id)
        ? h.titleCollection.discovered.indexOf(title_id)
        : undefined,
      earned_position: h.earnedTitles.includes(title_id)
        ? h.earnedTitles.indexOf(title_id)
        : undefined,
      source: h.titleCollection.records[title_id]?.source,
    });
  Object.entries(h.titleCollection.evidence).forEach(([evidence_id, count]) =>
    add('title_evidence', { evidence_id, count }),
  );
  Object.entries(h.titleCollection.selected).forEach(([slot, title_id]) => {
    if (title_id) add('selected_titles', { slot, title_id });
  });
}
