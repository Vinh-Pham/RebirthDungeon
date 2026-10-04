import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { n, s, ordered, rowReader, type AddRow } from './rows.js';
export function decodeEnchanting(rows: Rows, _talent: string) {
  const { get, matching } = rowReader(rows);
  return {
    receipts: ordered(get('enchant_receipts')).map((r) => ({
      id: s(r, 'operation_id'),
      kind: s(r, 'kind'),
      message: s(r, 'message'),
      success: !!n(r, 'success'),
      recovered: ordered(
        matching(
          'enchant_recovered_items',
          'operation_id',
          s(r, 'operation_id'),
        ),
      ).map((i) => s(i, 'item_id')),
    })),
  };
}
export function encodeEnchanting(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  h.enchanting.receipts.forEach((r, position) => {
    add('enchant_receipts', {
      operation_id: r.id,
      position,
      kind: r.kind,
      message: r.message,
      success: +r.success,
    });
    r.recovered.forEach((item_id, index) =>
      add('enchant_recovered_items', {
        operation_id: r.id,
        item_id,
        position: index,
      }),
    );
  });
}
