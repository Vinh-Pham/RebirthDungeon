import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { TurnQueue, createHealth, type Entity } from '../../engine';

function fighter(id: string, speed = 1): Entity {
  return { id, health: createHealth(10), combatant: { attack: 1, defense: 0, speed } };
}

describe('turn queue', () => {
  it('sorts by speed, preserves ties, skips dead/noncombatants, and wraps rounds', () => {
    const queue = new TurnQueue();
    queue.initialize([fighter('slow', 1), fighter('first', 5), fighter('second', 5),
      { ...fighter('dead', 10), dead: true }, { ...fighter('zero', 10), health: createHealth(10, 0) }, { id: 'npc' }]);
    expect(queue.order).toEqual(['first', 'second', 'slow']);
    expect([queue.current(), queue.advance(), queue.advance(), queue.advance()]).toEqual(['first', 'second', 'slow', 'first']);
    const order = queue.order as string[];
    order.length = 0;
    expect(queue.current()).toBe('first');
  });

  it('removes current, earlier, and later participants without skipping the next turn', () => {
    const queue = new TurnQueue();
    queue.initialize(['a', 'b', 'c', 'd'].map((id) => fighter(id)));
    queue.advance();
    queue.remove('a');
    expect(queue.current()).toBe('b');
    queue.remove('d');
    expect(queue.current()).toBe('b');
    queue.remove('b');
    expect(queue.current()).toBe('c');
    queue.remove('c');
    queue.remove('missing');
    expect(queue.current()).toBeUndefined();
    expect(queue.advance()).toBeUndefined();
    queue.initialize([fighter('reset')]);
    expect(queue.current()).toBe('reset');
  });

  it('never returns removed entities across arbitrary removals', () => {
    fc.assert(fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 20 })), (values) => {
      const queue = new TurnQueue();
      const ids = values.map(String);
      queue.initialize(ids.map((id) => fighter(id)));
      for (const id of ids) {
        queue.advance();
        queue.remove(id);
        expect(queue.order).not.toContain(id);
        for (let i = 0; i <= queue.order.length; i++) expect(queue.advance()).not.toBe(id);
      }
      expect(queue.current()).toBeUndefined();
    }), { seed: 20260929, numRuns: 100 });
  });

  it('rejects duplicate IDs and invalid speeds without replacing an existing queue', () => {
    const queue = new TurnQueue();
    queue.initialize([fighter('original')]);
    expect(() => queue.initialize([fighter('a'), fighter('a')])).toThrow('unique');
    expect(() => queue.initialize([fighter('a', NaN)])).toThrow(RangeError);
    expect(queue.current()).toBe('original');
  });
});
