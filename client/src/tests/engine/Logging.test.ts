import { describe, expect, it, vi } from 'vitest';
import {
  LogEngine,
  selectLogEntries,
  LOG_CATEGORIES,
  type LogInput,
} from '../../engine/logging/LogEngine';
import { CommandBus, type CommandObservation } from '../../engine/CommandBus';
const message = (category: LogInput['category'] = 'user'): LogInput => ({
  category,
  type: 'TEST',
  message: 'A test action.',
});
describe('immutable log engine', () => {
  it('owns deeply immutable messages and metadata without freezing the caller', () => {
    const logs = new LogEngine(() => 123);
    const data = { items: [{ name: 'Sword' }], value: 1 };
    const old = logs.getSnapshot();
    logs.append([{ ...message(), metadata: data }]);
    const snapshot = logs.getSnapshot(),
      entry = selectLogEntries(snapshot)[0];
    data.items[0].name = 'Changed';
    expect(entry.metadata).toEqual({ items: [{ name: 'Sword' }], value: 1 });
    expect(Object.isFrozen(entry.metadata!.items)).toBe(true);
    expect(() => Object.assign(entry, { message: 'Changed' })).toThrow();
    expect(Object.isFrozen(snapshot.chunks[0])).toBe(true);
    expect(old.count).toBe(0);
    expect(logs.getSnapshot()).toBe(snapshot);
  });
  it('assigns one category, combines all categories once and preserves sequence over clock changes', () => {
    let now = 500;
    const logs = new LogEngine(() => now);
    for (const category of LOG_CATEGORIES) {
      logs.append([message(category)]);
      now--;
    }
    const all = selectLogEntries(logs.getSnapshot());
    expect(all.map((e) => e.sequence)).toEqual([4, 3, 2, 1]);
    expect(all.map((e) => e.timestamp)).toEqual([497, 498, 499, 500]);
    for (const category of LOG_CATEGORIES)
      expect(selectLogEntries(logs.getSnapshot(), category)).toHaveLength(1);
  });
  it('clears all categories without mutating old messages or reusing IDs', () => {
    const logs = new LogEngine(() => 1);
    logs.append([message(), message('combat')]);
    const old = logs.getSnapshot();
    logs.clear();
    expect(selectLogEntries(logs.getSnapshot())).toEqual([]);
    expect(selectLogEntries(old)).toHaveLength(2);
    logs.append([message('movement')]);
    expect(selectLogEntries(logs.getSnapshot())[0].id).toBe('log-3');
  });
  it('publishes a batch once, cleans subscriptions and tolerates failing observers', () => {
    const logs = new LogEngine(() => 1),
      listener = vi.fn();
    logs.subscribe(() => {
      throw new Error('Observer failed');
    });
    const cleanup = logs.subscribe(listener);
    expect(() => logs.append([message(), message()])).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
    cleanup();
    logs.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid batches and timestamps atomically', () => {
    const logs = new LogEngine(() => NaN),
      old = logs.getSnapshot();
    expect(() => logs.append([message()])).toThrow('timestamp');
    expect(logs.getSnapshot()).toBe(old);
    const valid = new LogEngine(() => 1);
    expect(() => valid.append([message(), { ...message(), message: '' }])).toThrow();
    expect(valid.getSnapshot().count).toBe(0);
    expect(() =>
      valid.append([{ ...message(), metadata: { date: new Date() } } as unknown as LogInput]),
    ).toThrow();
  });
  it('retains long histories with structural sharing and no automatic eviction', () => {
    const logs = new LogEngine(() => 1);
    logs.append(Array.from({ length: 256 }, () => message()));
    const before = logs.getSnapshot();
    logs.append(Array.from({ length: 9744 }, () => message()));
    expect(logs.getSnapshot().chunks[0]).toBe(before.chunks[0]);
    expect(logs.getSnapshot().count).toBe(10000);
    expect(selectLogEntries(logs.getSnapshot())).toHaveLength(10000);
    expect(before.count).toBe(256);
  });
});
describe('observational command receipts', () => {
  it('marks nested committed work even if a later parent notification fails', () => {
    const bus = new CommandBus(),
      observations: CommandObservation[] = [];
    const cleanup = bus.observe((entry) => observations.push(entry));
    bus.register('START_REST', () => {
      bus.dispatch({ type: 'STOP_REST' });
      throw new Error('Parent notification failed');
    });
    bus.register('STOP_REST', () => bus.markCommitted());
    expect(() => bus.dispatch({ type: 'START_REST' })).toThrow('Parent notification');
    expect(observations.map((entry) => [entry.command.type, entry.committed])).toEqual([
      ['STOP_REST', true],
      ['START_REST', true],
    ]);
    cleanup();
    bus.dispatch({ type: 'STOP_REST' });
    expect(observations).toHaveLength(2);
  });
  it('distinguishes rejected commands from committed notification failures and never forwards observer errors', () => {
    const bus = new CommandBus(),
      observations: CommandObservation[] = [];
    bus.observe((o) => observations.push(o));
    bus.observe(() => {
      throw new Error('Logger failed');
    });
    bus.register('START_REST', () => {
      throw new Error('Unavailable');
    });
    expect(() => bus.dispatch({ type: 'START_REST' })).toThrow('Unavailable');
    bus.register('STOP_REST', () => {
      bus.markCommitted();
      throw new Error('Listener failed');
    });
    expect(() => bus.dispatch({ type: 'STOP_REST' })).toThrow('Listener failed');
    expect(observations.map((o) => o.committed)).toEqual([false, true]);
    expect(Object.isFrozen(observations[0].command)).toBe(true);
    expect(bus.isDispatching).toBe(false);
  });
});
