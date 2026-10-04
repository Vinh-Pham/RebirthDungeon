import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { Rows } from '../tables.js';
import { wordColumns, type AddRow } from './rows.js';
export function encodeJourney(
  state: OnlineState,
  _id: string,
  _rows: Rows,
  add: AddRow,
) {
  const c = state.campaign,
    h = c.hero;
  add('campaigns', {
    world_id: c.worldId,
    world_definition_id: c.dungeon ? null : c.worldId,
    x: c.position.x,
    y: c.position.y,
    encounter_count: c.encounterCount,
    active_service: state.context.activeService,
  });
  add('rest_state', {
    resting: +state.context.resting,
    last_rest_tick: state.context.lastRestTick,
    rest_lease_until: state.context.restLeaseUntil,
  });
  for (const kind of ['journey', 'enchant'] as const)
    add('rng_streams', {
      kind,
      seed: kind === 'journey' ? c.seed : h.enchanting.seed,
      algorithm: 'xoroshiro128plus',
      version: 1,
      ...wordColumns(kind === 'journey' ? c.randomState : h.enchanting.state),
      next_operation_id:
        kind === 'enchant' ? h.enchanting.nextOperationId : undefined,
    });
  for (const kind of ['opened', 'cleared'] as const)
    c[kind].forEach((object_id, position) =>
      add('world_flags', { kind, object_id, position }),
    );
}
