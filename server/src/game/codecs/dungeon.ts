import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import {
  n,
  s,
  optional,
  ordered,
  singleton,
  rowReader,
  type AddRow,
} from './rows.js';
import { DungeonRunSchema } from '@rebirth/game-core/engine/dungeon/Dungeon';
export function decodeDungeon(rows: Rows) {
  const { get, matching } = rowReader(rows);
  if (get('dungeon_runs').length) {
    const d = singleton(get('dungeon_runs'));
    return DungeonRunSchema.parse({
      blueprint: JSON.parse(s(d, 'blueprint')),
      returnTo: {
        worldId: s(d, 'return_world_id'),
        position: { x: n(d, 'return_x'), y: n(d, 'return_y') },
      },
      bossDoorOpened: !!n(d, 'boss_door_opened'),
      selectedChest: optional(d, 'selected_chest'),
      ...Object.fromEntries(
        ['cleared', 'opened', 'revealedMimics', 'usedFountains'].map((kind) => [
          kind,
          ordered(matching('dungeon_flags', 'kind', kind)).map((r) =>
            s(r, 'object_id'),
          ),
        ]),
      ),
      ...Object.fromEntries(
        get('dungeon_keys').map((r) => [
          s(r, 'kind'),
          {
            status: s(r, 'status'),
            ...(r.x === null
              ? {}
              : { position: { x: n(r, 'x'), y: n(r, 'y') } }),
          },
        ]),
      ),
      effects: ordered(get('dungeon_effects')).map((r) => ({
        statusId: s(r, 'status_id'),
        stacks: n(r, 'stacks'),
      })),
    });
  }

  return undefined;
}

export function encodeDungeon(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign;
  if (c.dungeon) {
    const d = c.dungeon;
    add('dungeon_runs', {
      definition_id: d.blueprint.definitionId,
      return_world_id: d.returnTo.worldId,
      return_x: d.returnTo.position.x,
      return_y: d.returnTo.position.y,
      blueprint: JSON.stringify(d.blueprint),
      boss_door_opened: +d.bossDoorOpened,
      selected_chest: d.selectedChest,
    });
    for (const kind of [
      'cleared',
      'opened',
      'revealedMimics',
      'usedFountains',
    ] as const)
      d[kind].forEach((object_id, position) =>
        add('dungeon_flags', { kind, object_id, position }),
      );
    for (const kind of ['bossKey', 'treasureKey'] as const)
      add('dungeon_keys', {
        kind,
        status: d[kind].status,
        x: d[kind].position?.x,
        y: d[kind].position?.y,
      });
    d.effects.forEach((effect, position) =>
      add('dungeon_effects', {
        position,
        status_id: effect.statusId,
        stacks: effect.stacks,
      }),
    );
  }
}
