import { describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  CombatSystem, createGameEngine, createHealth, handleDeath,
  type Entity, type GameCommand, type GameEvent,
} from '../../engine';
import { runSimulation } from '../engine/harness';

function fighter(id: string, side: 'player' | 'enemy', overrides: Partial<Entity> = {}): Entity {
  return { id, [side]: true, health: createHealth(20),
    combatant: { attack: 8, defense: 2, speed: 5, hitChance: 1, criticalChance: 0 }, ...overrides };
}

function setup(entities = [fighter('player', 'player'), fighter('slime', 'enemy')], seed = 12345) {
  const engine = createGameEngine({ seed });
  entities.forEach((entity) => engine.spawn(structuredClone(entity)));
  const events: GameEvent[] = [];
  engine.events.subscribe((event) => events.push(structuredClone(event)));
  const combat = new CombatSystem(entities.map(({ id }) => id));
  const remove = engine.addSystem(combat);
  return { engine, combat, events, remove };
}

/** Executes a complete battle using only commands and the public scheduler API. */
function battle(entities: Entity[], seed: number) {
  const { engine, combat, events } = setup(entities, seed);
  const commands: GameCommand[] = [];
  try {
    const limit = entities.reduce((total, entity) => total + entity.health!.current, 0);
    while (!combat.result && commands.length <= limit) {
      const attackerId = combat.currentTurn()!;
      const attacker = engine.getEntity(attackerId)!;
      const target = engine.world.entities.find((entity) => entity.health!.current > 0 && !!entity.player !== !!attacker.player)!;
      const command = { type: 'ATTACK' as const, attackerId, targetId: target.id };
      commands.push(command);
      engine.dispatch(command);
    }
    expect(combat.result).toBeDefined();
    expect(commands.length).toBeLessThanOrEqual(limit);
    return { commands, result: combat.result, entities: structuredClone(engine.world.entities), events };
  } finally { engine.dispose(); }
}

describe('basic turn-based combat', () => {
  it('completes a headless battle with damage, death, turn and victory events', () => {
    const initial = [fighter('player', 'player'), fighter('slime', 'enemy')];
    const result = battle(initial, 12345);
    expect(result.result).toBe('victory');
    expect(result.commands).toHaveLength(7);
    expect(result.entities[0].health?.current).toBe(2);
    expect(result.entities[1]).toMatchObject({ health: { current: 0, max: 20 }, dead: true });
    expect(result.events.slice(-4)).toEqual([
      { type: 'DAMAGE_DEALT', sourceId: 'player', targetId: 'slime', amount: 2, critical: false },
      { type: 'ENTITY_DIED', entityId: 'slime' },
      { type: 'TURN_ENDED', entityId: 'player' },
      { type: 'BATTLE_ENDED', result: 'victory' },
    ]);
    expect(result).toEqual(battle(initial, 12345));
    const replay = runSimulation({ seed: 12345, entities: initial, commands: result.commands,
      configure: (engine) => { engine.addSystem(new CombatSystem(['player', 'slime'])); } });
    expect(replay).toEqual({ entities: result.entities, events: result.events });
  });

  it('produces deterministic complete battles over generated stats and seeds', () => {
    const stats = fc.record({ attack: fc.integer({ min: 0, max: 30 }), defense: fc.integer({ min: 0, max: 30 }),
      speed: fc.integer({ min: 0, max: 10 }), hp: fc.integer({ min: 1, max: 50 }) });
    fc.assert(fc.property(fc.integer(), stats, stats, (seed, player, enemy) => {
      const entities = [fighter('player', 'player', { health: createHealth(player.hp),
        combatant: { attack: player.attack, defense: player.defense, speed: player.speed, hitChance: 1, criticalChance: 0.25 } }),
      fighter('slime', 'enemy', { health: createHealth(enemy.hp),
        combatant: { attack: enemy.attack, defense: enemy.defense, speed: enemy.speed, hitChance: 1, criticalChance: 0.25 } })];
      const first = battle(entities, seed);
      expect(first).toEqual(battle(entities, seed));
      for (const entity of first.entities) {
        expect(entity.health!.current).toBeGreaterThanOrEqual(0);
        expect(entity.health!.current).toBeLessThanOrEqual(entity.health!.max);
      }
      expect(first.events.filter((event) => event.type === 'BATTLE_ENDED')).toHaveLength(1);
      for (const entity of first.entities.filter((entity) => entity.dead)) {
        expect(first.events.filter((event) => event.type === 'ENTITY_DIED' && event.entityId === entity.id)).toHaveLength(1);
      }
    }), { seed: 20260929, numRuns: 100 });
  });

  it('lets a faster enemy win and blocks attacks after the battle ends', () => {
    const { engine, combat, events } = setup([fighter('player', 'player', { health: createHealth(1) }),
      fighter('slime', 'enemy', { combatant: { attack: 10, defense: 0, speed: 10, hitChance: 1, criticalChance: 1 } })]);
    expect(combat.currentTurn()).toBe('slime');
    engine.dispatch({ type: 'ATTACK', attackerId: 'slime', targetId: 'player' });
    expect(combat.result).toBe('defeat');
    expect(combat.currentTurn()).toBeUndefined();
    expect(events).toContainEqual({ type: 'DAMAGE_DEALT', sourceId: 'slime', targetId: 'player', amount: 1, critical: true });
    const snapshot = structuredClone(events);
    expect(() => engine.dispatch({ type: 'ATTACK', attackerId: 'slime', targetId: 'player' })).toThrow('ended');
    expect(events).toEqual(snapshot);
    engine.dispose();
  });

  it('consumes a turn on a miss without changing HP', () => {
    const { engine, combat, events } = setup([fighter('player', 'player', {
      combatant: { attack: 10, defense: 0, speed: 10, hitChance: 0, criticalChance: 1 },
    }), fighter('slime', 'enemy')]);
    engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'slime' });
    expect(engine.getEntity('slime')?.health?.current).toBe(20);
    expect(events.slice(-3)).toEqual([{ type: 'ATTACK_MISSED', sourceId: 'player', targetId: 'slime' },
      { type: 'TURN_ENDED', entityId: 'player' }, { type: 'TURN_STARTED', entityId: 'slime' }]);
    expect(combat.currentTurn()).toBe('slime');
    engine.dispose();
  });

  it('rejects invalid commands without mutation, events, turn changes or RNG consumption', () => {
    const entities = [fighter('player', 'player'), fighter('ally', 'player'), fighter('slime', 'enemy')];
    const { engine, combat, events } = setup(entities);
    engine.spawn(fighter('outsider', 'enemy'));
    const chance = vi.spyOn(engine.random, 'chance');
    const before = structuredClone(engine.world.entities);
    for (const [attackerId, targetId] of [['slime', 'player'], ['player', 'player'], ['player', 'ally'],
      ['player', 'missing'], ['player', 'outsider']]) {
      expect(() => engine.dispatch({ type: 'ATTACK', attackerId, targetId })).toThrow();
    }
    expect(engine.world.entities).toEqual(before);
    expect(events).toEqual([{ type: 'TURN_STARTED', entityId: 'player' }]);
    expect(combat.currentTurn()).toBe('player');
    expect(chance).not.toHaveBeenCalled();
    engine.dispose();
  });

  it('removes defeated units from initiative without skipping a living ally', () => {
    const { engine, combat } = setup([fighter('player', 'player'), fighter('slime', 'enemy', { health: createHealth(1) }),
      fighter('ally', 'player'), fighter('second-slime', 'enemy')]);
    engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'slime' });
    expect(combat.currentTurn()).toBe('ally');
    expect(combat.turnOrder).toEqual(['player', 'ally', 'second-slime']);
    expect(engine.getEntity('slime')?.dead).toBe(true);
    expect(handleDeath(engine, engine.getEntity('slime')!)).toBeUndefined();
    expect(() => engine.dispatch({ type: 'ATTACK', attackerId: 'ally', targetId: 'slime' })).toThrow('Dead');
    engine.dispose();
  });

  it('prunes world removals, ends once, and cleans up command and event subscriptions', () => {
    const { engine, combat, events, remove } = setup();
    engine.removeEntity('slime');
    expect(combat.turnOrder).toEqual(['player']);
    expect(combat.result).toBe('victory');
    expect(events.filter((event) => event.type === 'BATTLE_ENDED')).toHaveLength(1);
    engine.removeEntity('player');
    expect(events.filter((event) => event.type === 'BATTLE_ENDED')).toHaveLength(1);
    remove();
    expect(combat.currentTurn()).toBeUndefined();
    expect(() => engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'slime' })).toThrow('No command handler');
    engine.dispose();
  });

  it('finishes storage removal before notifying a failing battle consumer', () => {
    const { engine, combat } = setup();
    engine.events.on('BATTLE_ENDED', () => { throw new Error('presentation failed'); });
    expect(() => engine.removeEntity('slime')).toThrow(AggregateError);
    expect(engine.getEntity('slime')).toBeUndefined();
    expect(combat.result).toBe('victory');
    expect(combat.turnOrder).toEqual(['player']);
    engine.dispose();
  });

  it('keeps removal coordination active if an earlier event consumer throws', () => {
    const engine = createGameEngine({ seed: 1 });
    engine.spawn(fighter('player', 'player'));
    engine.spawn(fighter('slime', 'enemy'));
    engine.events.subscribe((event) => {
      if (event.type === 'ENTITY_REMOVED') throw new Error('consumer failed');
    });
    const combat = new CombatSystem(['player', 'slime']);
    engine.addSystem(combat);
    expect(() => engine.removeEntity('slime')).toThrow(AggregateError);
    expect(engine.getEntity('slime')).toBeUndefined();
    expect(combat.result).toBe('victory');
    expect(combat.turnOrder).toEqual(['player']);
    engine.dispose();
  });

  it('advances to the next live participant if the current entity leaves the world', () => {
    const { engine, combat, events } = setup([fighter('player', 'player'), fighter('ally', 'player'), fighter('slime', 'enemy')]);
    engine.removeEntity('player');
    expect(combat.currentTurn()).toBe('ally');
    expect(events.at(-1)).toEqual({ type: 'TURN_STARTED', entityId: 'ally' });
    engine.dispose();
  });

  it('commits the terminal result even when a presentation listener throws', () => {
    const { engine, combat, events } = setup([fighter('player', 'player'), fighter('slime', 'enemy', { health: createHealth(1) })]);
    engine.events.on('DAMAGE_DEALT', () => { throw new Error('presentation failed'); });
    expect(() => engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'slime' })).toThrow(AggregateError);
    expect(combat.result).toBe('victory');
    expect(engine.getEntity('slime')?.dead).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'BATTLE_ENDED', result: 'victory' });
    engine.dispose();
  });

  it('blocks nested attacks during event publication while committing the next turn', () => {
    const { engine, combat } = setup();
    engine.events.on('DAMAGE_DEALT', () => {
      expect(combat.currentTurn()).toBe('slime');
      expect(() => engine.dispatch({ type: 'ATTACK', attackerId: 'slime', targetId: 'player' })).toThrow('event delivery');
    });
    engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'slime' });
    expect(engine.getEntity('player')?.health?.current).toBe(20);
    engine.dispose();
  });

  it('rejects invalid battle setups and rolls back initialization subscriptions on listener errors', () => {
    expect(() => new CombatSystem(['a', 'a'])).toThrow('Duplicate');
    const engine = createGameEngine({ seed: 1 });
    engine.spawn(fighter('player', 'player'));
    engine.spawn(fighter('slime', 'enemy'));
    expect(() => engine.addSystem(new CombatSystem(['missing', 'slime']))).toThrow('health');
    expect(() => engine.addSystem(new CombatSystem(['player']))).toThrow('requires');
    const stop = engine.events.on('TURN_STARTED', () => { throw new Error('initialization listener failed'); });
    const combat = new CombatSystem(['player', 'slime']);
    expect(() => engine.addSystem(combat)).toThrow(AggregateError);
    stop();
    expect(() => engine.addSystem(combat)).not.toThrow();
    engine.dispose();
  });
});
