import { createTurnScheduler } from '@/game/rot/rot-turn-scheduler';

describe('createTurnScheduler (ROT.Scheduler.Speed adapter)', () => {
  it('cycles equal-speed actors in insertion order', () => {
    const scheduler = createTurnScheduler();
    scheduler.add('a', 100);
    scheduler.add('b', 100);
    scheduler.add('c', 100);

    const sequence = Array.from({ length: 7 }, () => scheduler.next());
    expect(sequence).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a']);
  });

  it('lets faster actors act proportionally more often', () => {
    const scheduler = createTurnScheduler();
    scheduler.add('slow', 100);
    scheduler.add('fast', 200);

    const sequence = Array.from({ length: 6 }, () => scheduler.next());
    const fastTurns = sequence.filter((id) => id === 'fast').length;
    const slowTurns = sequence.filter((id) => id === 'slow').length;
    expect(fastTurns).toBeGreaterThan(slowTurns);
    expect(fastTurns + slowTurns).toBe(6);
  });

  it('removes actors so they never act again', () => {
    const scheduler = createTurnScheduler();
    scheduler.add('a', 100);
    scheduler.add('b', 100);
    expect(scheduler.next()).toBe('a');

    scheduler.remove('b');
    const sequence = Array.from({ length: 4 }, () => scheduler.next());
    expect(sequence).toEqual(['a', 'a', 'a', 'a']);
  });

  it('snapshot + restore reproduces the exact remaining order', () => {
    const scheduler = createTurnScheduler();
    scheduler.add('a', 100);
    scheduler.add('b', 150);
    scheduler.add('c', 100);
    scheduler.next(); // a
    scheduler.next(); // b

    const snapshot = scheduler.snapshot();
    expect(snapshot.entries).toHaveLength(3);

    const restored = createTurnScheduler();
    restored.restore(snapshot);

    const expected = Array.from({ length: 8 }, () => scheduler.next());
    const actual = Array.from({ length: 8 }, () => restored.next());
    expect(actual).toEqual(expected);
  });

  it('supports multiple independent schedulers simultaneously', () => {
    const first = createTurnScheduler();
    const second = createTurnScheduler();
    first.add('a', 100);
    second.add('b', 100);
    expect(first.next()).toBe('a');
    expect(second.next()).toBe('b');
  });
});
