import { afterEach, expect, it, vi } from 'vitest';
import { AuditCollectionError, AuditCollector } from '../src/online/Audit';
import { execute, newOnlineState, publicView, validateOnlineState } from '../src/online/Runtime';
import { appendLogs } from '../src/engine/logging/LogEngine';
import { GAME_CONTENT_VERSION } from '../src/online/Contracts';
afterEach(() => vi.restoreAllMocks());
const initial = () => newOnlineState(12345, 'Player', 'warrior');
it('records every travel step and resource change without mutating state or RNG', () => {
  const state = initial(),
    before = structuredClone(state);
  const result = execute(state, 'Player', { type: 'TRAVEL_TO', x: 7, y: 3 }, 1000);
  expect(result.audit.events.filter((e) => e.type === 'WORLD_MOVED').length).toBeGreaterThan(1);
  expect(result.audit.changes.some((c) => c.path.startsWith('/hero/'))).toBe(true);
  expect(result.audit.changes.some((c) => c.path.startsWith('/position'))).toBe(true);
  expect(state).toEqual(before);
  expect(Object.isFrozen(result.audit.events)).toBe(true);
  vi.spyOn(AuditCollector.prototype, 'append').mockImplementation(() => {});
  expect(execute(state, 'Player', { type: 'TRAVEL_TO', x: 7, y: 3 }, 1000).state).toEqual(
    result.state,
  );
});
it('records item costs and recovery and does not log validation or reads', () => {
  const state = initial();
  state.campaign.hero.health = 1;
  const result = execute(state, 'Player', { type: 'USE_ITEM', itemId: 'potion' }, 1000);
  expect(result.audit.events.some((e) => e.type === 'ITEM_USED')).toBe(true);
  expect(result.audit.changes).toContainEqual(
    expect.objectContaining({ path: '/hero/inventory/potion', before: 2, after: 1 }),
  );
  const observer = vi.spyOn(AuditCollector.prototype, 'append');
  validateOnlineState(result.state, 'Player');
  publicView(result.state, {
    id: 'hero',
    name: 'Player',
    talent: 'warrior',
    age: 12,
    revision: 1,
    contentVersion: GAME_CONTENT_VERSION,
    createdAt: 0,
    updatedAt: 0,
  });
  expect(observer).not.toHaveBeenCalled();
});
it('records a new encounter once and suppresses restored START_BATTLE events', () => {
  let state = initial();
  for (const command of [
    { type: 'TRAVEL_TO', x: 7, y: 3 },
    { type: 'INTERACT', objectId: 'east' },
  ] as const)
    state = execute(state, 'Player', command, 1000).state;
  const start = execute(state, 'Player', { type: 'TRAVEL_TO', x: 5, y: 3 }, 1000);
  expect(start.audit.events.filter((e) => e.type === 'START_BATTLE')).toHaveLength(1);
  const result = execute(
    start.state,
    'Player',
    { type: 'BATTLE_ACTION', action: { action: 'defend' }, targetId: 'player' },
    2000,
  );
  expect(result.audit.events.some((e) => e.type === 'START_BATTLE')).toBe(false);
  expect(result.audit.events.some((e) => e.type === 'DEFENDED')).toBe(true);
  expect(result.audit.events.some((e) => e.type === 'ACTION_RESOLVED')).toBe(true);
});
it('preserves diagnostic failure signaling and rejects an incomplete audit batch', () => {
  const sink = new AuditCollector();
  sink.active = true;
  appendLogs(sink, [{ type: '', category: 'system', message: '' }]);
  expect(() => sink.finish(initial(), initial())).toThrow(AuditCollectionError);
  const append = AuditCollector.prototype.append;
  vi.spyOn(AuditCollector.prototype, 'append').mockImplementation(function (
    this: AuditCollector,
    entries,
  ) {
    this.onError();
    append.call(this, entries);
  });
  expect(() => execute(initial(), 'Player', { type: 'MOVE', dx: 1, dy: 0 }, 1000)).toThrow(
    AuditCollectionError,
  );
});
