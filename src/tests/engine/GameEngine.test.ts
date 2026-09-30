import { describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';

import { createGameEngine, type Entity, type GameSystem } from '../../engine';
import { createAttackFixture, runSimulation } from './harness';

const entities: Entity[] = [
  { id: 'player', player: true, health: { current: 30, max: 30 }, combatant: { attack: 10, defense: 2, speed: 3 } },
  { id: 'slime-1', enemy: true, health: { current: 20, max: 20 } },
];

const scenario = {
  seed: 12345,
  entities,
  commands: [{ type: 'ATTACK' as const, attackerId: 'player', targetId: 'slime-1' }],
  configure: (engine: ReturnType<typeof createGameEngine>) => { engine.addSystem(createAttackFixture()); },
};

describe('headless engine', () => {
  it('spawns two entities, resolves an attack immediately, and emits deterministic results', () => {
    const first = runSimulation(scenario);
    expect(first).toEqual(runSimulation(scenario));
    expect(first.events).toEqual([
      { type: 'DAMAGE_DEALT', sourceId: 'player', targetId: 'slime-1', amount: 3, critical: false },
    ]);
    expect(first.entities.find((entity) => entity.id === 'slime-1')?.health?.current).toBe(17);
    expect(entities[1].health?.current).toBe(20);
  });

  it('replays arbitrary seeds and attack sequences identically', () => {
    fc.assert(fc.property(fc.integer(), fc.integer({ min: 1, max: 10 }), (seed, count) => {
      const replay = {
        ...scenario,
        seed,
        entities: [entities[0], { ...entities[1], health: { current: 1000, max: 1000 } }],
        commands: Array.from({ length: count }, () => scenario.commands[0]),
      };
      const first = runSimulation(replay);
      expect(first).toEqual(runSimulation(replay));
      expect(first.entities[1].health?.current).toBeGreaterThanOrEqual(0);
    }), { seed: 20260929, numRuns: 100 });
  });

  it('rejects invalid attacks before changing state or consuming randomness', () => {
    const engine = createGameEngine({ seed: 12345 });
    entities.forEach((entity) => engine.spawn(structuredClone(entity)));
    engine.addSystem(createAttackFixture());
    const listener = vi.fn();
    engine.events.subscribe(listener);
    expect(() => engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'missing' })).toThrow();
    expect(listener).not.toHaveBeenCalled();
    engine.dispatch(scenario.commands[0]);
    expect(listener.mock.calls[0][0].amount).toBe(3);
    engine.dispose();
  });

  it('uses a real Miniplex world and maintains component queries', () => {
    const engine = createGameEngine({ seed: 1 });
    const enemies = engine.world.with('enemy', 'health');
    const enemy = engine.spawn(structuredClone(entities[1]));
    expect([...enemies]).toEqual([enemy]);
    expect(engine.getEntity(enemy.id)).toBe(enemy);
    expect(() => engine.spawn(structuredClone(enemy))).toThrow('Duplicate entity ID');
    expect(() => engine.spawn({ id: ' ' })).toThrow('Entity ID');
    engine.world.removeComponent(enemy, 'enemy');
    expect([...enemies]).toEqual([]);
    engine.removeEntity(enemy.id);
    expect(engine.getEntity(enemy.id)).toBeUndefined();
    engine.dispose();
  });

  it('updates in registration order and cleans up removed systems once', () => {
    const engine = createGameEngine({ seed: 1 });
    const calls: string[] = [];
    const cleanup = vi.fn();
    const first: GameSystem = {
      initialize: () => cleanup,
      update: (_, dt) => { calls.push(`first:${dt}`); },
    };
    const remove = engine.addSystem(first);
    engine.addSystem({ update: (_, dt) => { calls.push(`second:${dt}`); } });
    expect(() => engine.addSystem(first)).toThrow('already registered');
    engine.update(0.25);
    remove();
    remove();
    engine.update(0);
    expect(calls).toEqual(['first:0.25', 'second:0.25', 'second:0']);
    expect(cleanup).toHaveBeenCalledTimes(1);
    for (const dt of [-1, NaN, Infinity]) expect(() => engine.update(dt)).toThrow(RangeError);
    engine.dispose();
    engine.dispose();
    expect(() => engine.update(0)).toThrow('disposed');
    expect(() => engine.dispatch(scenario.commands[0])).toThrow('disposed');
    expect(() => engine.spawn({ id: 'new' })).toThrow('disposed');
  });

  it('releases all systems and services even when cleanup throws', () => {
    const engine = createGameEngine({ seed: 1 });
    const cleanup = vi.fn();
    const listener = vi.fn();
    engine.spawn({ id: 'player' });
    engine.events.subscribe(listener);
    engine.addSystem({ initialize: () => () => { throw new Error('cleanup failed'); }, update() {} });
    engine.addSystem({ initialize: () => cleanup, update() {} });
    expect(() => engine.dispose()).toThrow(AggregateError);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(engine.world.entities).toEqual([]);
    engine.events.emit({ type: 'ENTITY_DIED', entityId: 'player' });
    expect(listener).not.toHaveBeenCalled();
    expect(() => engine.dispose()).not.toThrow();
  });

  it('unregisters system command handlers on removal and disposal', () => {
    const engine = createGameEngine({ seed: 1 });
    const remove = engine.addSystem(createAttackFixture());
    remove();
    expect(() => engine.dispatch(scenario.commands[0])).toThrow('No command handler');
    engine.addSystem(createAttackFixture());
    engine.dispose();
    expect(() => engine.commands.dispatch(scenario.commands[0])).toThrow('No command handler');
  });
});
