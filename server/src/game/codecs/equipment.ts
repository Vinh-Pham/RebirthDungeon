import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { optional, singleton, rowReader, type AddRow } from './rows.js';
export function decodeEquipment(rows: Rows, _talent: string) {
  const { get } = rowReader(rows);

  const l = singleton(get('loadouts'));
  return {
    weapon: optional(l, 'weapon_id'),
    armor: optional(l, 'armor_id'),
    secondaryHand: optional(l, 'ammunition_id'),
  };
}
export function encodeEquipment(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  add('loadouts', {
    weapon_id: h.equipment.weapon,
    armor_id: h.equipment.armor,
    ammunition_id: h.equipment.secondaryHand,
  });
}
