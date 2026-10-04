import { env } from 'cloudflare:workers';
import { reset, applyD1Migrations } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { execute, newOnlineState } from '@rebirth/game-core/online/TestRuntime';
import { auditStatement, commitRecord } from '../src/audit/repository.js';

// Local D1 measurements: useful for budgeting, not a substitute for deployed latency/load tests.
it('measures representative payloads, indexed history reads, storage and audit write cost', async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  const state = newOnlineState(12345, 'Budget hero', 'warrior');
  state.campaign.hero.health = 1;
  const samples = [
    { state, command: { type: 'MOVE', dx: 1, dy: 0 } as const },
    { state, command: { type: 'TRAVEL_TO', x: 7, y: 3 } as const },
    { state, command: { type: 'USE_ITEM', itemId: 'potion' } as const },
    { state, command: { type: 'START_REST' } as const },
  ];
  let battle = newOnlineState(12345, 'Budget hero', 'warrior');
  battle = execute(
    battle,
    'Budget hero',
    { type: 'TRAVEL_TO', x: 7, y: 3 },
    1000,
  ).state;
  battle = execute(
    battle,
    'Budget hero',
    { type: 'INTERACT', objectId: 'east' },
    1000,
  ).state;
  const start = {
    state: battle,
    command: { type: 'TRAVEL_TO', x: 5, y: 3 } as const,
  };
  battle = execute(start.state, 'Budget hero', start.command, 1000).state;
  const rest = execute(
    state,
    'Budget hero',
    { type: 'START_REST' },
    1000,
  ).state;
  const representative = [
    ...samples,
    start,
    {
      state: battle,
      command: {
        type: 'BATTLE_ACTION',
        action: { action: 'defend' },
        targetId: 'player',
      } as const,
    },
    { state: rest, command: { type: 'REST_PULSE' } as const },
  ];
  const records = representative.map(({ state, command }, i) => {
    const execution = execute(state, 'Budget hero', command, 6000);
    return commitRecord(
      'budget-user',
      'budget-character',
      crypto.randomUUID(),
      i + 1,
      Date.now(),
      { requestId: crypto.randomUUID(), command, audit: execution.audit },
      execution.state.campaign.encounterCount,
    );
  });
  const baseline = (await env.DB.prepare('SELECT 1').all()).meta.size_after;
  const began = performance.now();
  for (let round = 0; round < 20; round++)
    await env.DB.batch(
      records.map((r, i) =>
        auditStatement(env.DB, {
          ...r,
          id: crypto.randomUUID(),
          dedupeKey: crypto.randomUUID(),
          revision: round * records.length + i + 1,
        }),
      ),
    );
  const elapsed = performance.now() - began;
  const lookup = await env.DB.prepare(
    'SELECT id FROM audit_records WHERE character_id=? ORDER BY sequence DESC LIMIT 50',
  )
    .bind('budget-character')
    .all();
  const plan = await env.DB.prepare(
    'EXPLAIN QUERY PLAN SELECT id FROM audit_records WHERE character_id=? ORDER BY sequence DESC LIMIT 50',
  )
    .bind('budget-character')
    .all();
  expect(JSON.stringify(plan.results)).toContain('audit_character_idx');
  expect(lookup.results).toHaveLength(50);
  expect(lookup.meta.rows_read).toBeLessThanOrEqual(100);
  const count = records.length * 20;
  console.log(
    'AUDIT_CAPACITY_MEASUREMENT',
    JSON.stringify({
      samples: records.map((r) => ({
        type: r.type,
        detailsBytes: new TextEncoder().encode(JSON.stringify(r.details))
          .length,
      })),
      records: count,
      allocatedBytesPerRecord: (lookup.meta.size_after - baseline) / count,
      auditBatchWriteMsPerRecord: elapsed / count,
      indexedReadRows: lookup.meta.rows_read,
    }),
  );
});
