import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { n, s, rowReader, type AddRow } from './rows.js';
export function inventoryReader(rows: Rows) {
  const { matching } = rowReader(rows);
  const equipment = (kind: string) =>
    Object.fromEntries(
      matching('equipment_instances', 'kind', kind)
        // Allocation IDs encode creation order. Armor bulk removal uses this order in the engine.
        .sort(
          (a, b) =>
            Number(s(a, 'instance_id').split('-')[1]) -
            Number(s(b, 'instance_id').split('-')[1]),
        )
        .map((r) => {
          const id = s(r, 'instance_id');
          return [
            id,
            {
              itemId: s(r, 'definition_id'),
              ...(kind === 'weapon' ? { durability: n(r, 'durability') } : {}),
              ...(r.locked !== null ? { locked: !!n(r, 'locked') } : {}),
              ...Object.fromEntries(
                matching('equipment_enchants', 'instance_id', id).map(
                  (enchant) => [
                    s(enchant, 'slot'),
                    {
                      enchantId: s(enchant, 'enchant_id'),
                      values: Object.fromEntries(
                        matching('equipment_enchant_values', 'instance_id', id)
                          .filter((v) => v.slot === enchant.slot)
                          .map((v) => [s(v, 'stat_id'), n(v, 'value')]),
                      ),
                    },
                  ],
                ),
              ),
            },
          ];
        }),
    );

  return { equipment };
}

export function decodeInventory(rows: Rows, _talent: string) {
  const { map, list } = rowReader(rows);

  const { equipment } = inventoryReader(rows);
  return {
    inventory: map('inventory_stacks', 'item_id', (r) => n(r, 'quantity')),
    weapons: equipment('weapon'),
    armors: equipment('armor'),
    itemHotbar: list('item_hotbar', 'item_id'),
  };
}
export function encodeInventory(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  add('inventory_metadata', {
    next_weapon_id: h.nextWeaponId,
    next_armor_id: h.nextArmorId,
  });
  Object.entries(h.inventory).forEach(([item_id, quantity]) =>
    add('inventory_stacks', { item_id, quantity }),
  );
  for (const [kind, collection] of [
    ['weapon', h.weapons],
    ['armor', h.armors],
  ] as const)
    for (const [instance_id, instance] of Object.entries(collection)) {
      add('equipment_instances', {
        instance_id,
        definition_id: instance.itemId,
        kind,
        durability:
          'durability' in instance ? Number(instance.durability) : undefined,
        locked: instance.locked === undefined ? undefined : +instance.locked,
      });
      for (const slot of ['prefix', 'suffix'] as const) {
        const enchant = instance[slot];
        if (enchant) {
          add('equipment_enchants', {
            instance_id,
            slot,
            enchant_id: enchant.enchantId,
          });
          Object.entries(enchant.values).forEach(([stat_id, value]) =>
            add('equipment_enchant_values', {
              instance_id,
              slot,
              stat_id,
              value,
            }),
          );
        }
      }
    }
  h.itemHotbar.forEach((item_id, position) =>
    add('item_hotbar', { item_id, position }),
  );
}
