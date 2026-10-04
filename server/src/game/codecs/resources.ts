import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { n, singleton, rowReader, type AddRow } from './rows.js';
export function decodeResources(rows: Rows, _talent: string) {
  const { get } = rowReader(rows);

  const h = singleton(get('resources'));
  return {
    health: n(h, 'health'),
    mana: n(h, 'mana'),
    stamina: n(h, 'stamina'),
    wounds: n(h, 'wounds'),
    fullness: n(h, 'fullness_tenths') / 10,
  };
}
export function encodeResources(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  add('resources', {
    health: h.health,
    mana: h.mana,
    stamina: h.stamina,
    wounds: h.wounds,
    fullness_tenths: Math.round(h.fullness * 10),
  });
}
