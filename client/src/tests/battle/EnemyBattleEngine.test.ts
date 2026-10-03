import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { BattleSession } from '../../game/BattleSession';
import { createEnemyBattleRegistry } from '../../engine/battle/enemies/EnemyBattleRegistry';
import type {
  EnemyBattleContext,
  EnemyBattleBehavior,
} from '../../engine/battle/enemies/EnemyBattleBehavior';
import { GenericEnemyBattleEngine } from '../../engine/battle/enemies/generic/GenericEnemyBattleEngine';
import { SpiderEnemyBattleEngine } from '../../engine/battle/enemies/spiders/SpiderEnemyBattleEngine';
import { prepareEnemyActions } from '../../engine/battle/enemies/shared/EnemyActions';
import { EnemyBattleEngine } from '../../engine/battle/enemies/EnemyBattleEngine';

const sessions: BattleSession[] = [];
afterEach(() => {
  sessions.splice(0).forEach((s) => s.dispose());
  vi.restoreAllMocks();
});
function setup(
  options: {
    plugin?: EnemyBattleBehavior;
    skills?: string[];
    definition?: string;
    seed?: number;
    party?: boolean;
    buff?: boolean;
  } = {},
) {
  const raw = structuredClone(loadGameContent().data);
  const definition = raw.enemies.find((e) => e.id === (options.definition ?? 'white-spider'))!;
  definition.combatant.speed = 99;
  if (options.skills) definition.skills = options.skills;
  if (options.buff)
    raw.skills.push({
      ...raw.skills.find((s) => s.id === 'firebolt')!,
      id: 'test-buff',
      name: 'Test focus',
      target: 'self',
      effect: 'buff',
      statuses: ['focus'],
      gameRanks: undefined,
    });
  const registry = createEnemyBattleRegistry();
  if (options.plugin) {
    registry.register(options.plugin);
    definition.battleAI = { engineId: options.plugin.id, config: {} };
  }
  const content = new ContentRegistry(raw, registry);
  const map = structuredClone(content.data.maps[0]);
  map.spawns[1].definitionId = definition.id;
  if (options.party)
    map.spawns.push(
      { ...map.spawns[0], entityId: 'player-2' },
      { ...map.spawns[1], entityId: 'ally-spider' },
    );
  const session = new BattleSession(content, options.seed ?? 1, map);
  sessions.push(session);
  const enemy = session.engine.getEntity(map.spawns[1].entityId)!;
  return { session, enemy, content };
}
function plugin(kind: string): EnemyBattleBehavior {
  return {
    id: 'test-family',
    configSchema: z.strictObject({}),
    score: (context) => context.candidates.map((c) => (c.kind === kind ? 1 : 0)),
  };
}
function context(temperament = 'balanced'): EnemyBattleContext {
  return {
    source: {
      id: 'spider',
      health: 55,
      maxHealth: 55,
      healableHealth: 55,
      mana: 20,
      maxMana: 20,
      stamina: 40,
      maxStamina: 40,
      statuses: [],
    },
    participants: [
      {
        id: 'player',
        health: 100,
        maxHealth: 100,
        healableHealth: 100,
        mana: 0,
        maxMana: 0,
        stamina: 40,
        maxStamina: 40,
        statuses: [],
      },
    ],
    candidates: [
      { action: { action: 'attack' }, targetId: 'player', kind: 'attack', staminaCost: 2 },
      { action: { action: 'defend' }, targetId: 'spider', kind: 'defend', staminaCost: 0 },
    ],
    config: { temperament },
  };
}

describe('registered enemy battle families', () => {
  it('authors spider resources, skills and independent frozen configuration', () => {
    const content = loadGameContent();
    for (const id of ['white-spider', 'black-spider', 'red-spider', 'giant-black-spider']) {
      const a = content.spawn(id, 'a', 'enemy', 0, 0),
        b = content.spawn(id, 'b', 'enemy', 0, 0);
      const skills = id === 'white-spider' ? ['defense'] : ['defense', 'poison-attack'];
      expect(a.skills).toEqual(skills);
      expect(a.mana!.max).toBe(id === 'giant-black-spider' ? 40 : 20);
      expect(a.stamina!.max).toBe(id === 'giant-black-spider' ? 80 : 40);
      a.mana!.current = 0;
      a.stamina!.current = 0;
      a.skills!.pop();
      expect(b.mana!.current).toBe(b.mana!.max);
      expect(b.stamina!.current).toBe(b.stamina!.max);
      expect(b.skills).toEqual(skills);
      expect(Object.isFrozen(a.battleAI!.config)).toBe(true);
    }
  });
  it.each(['white-spider', 'black-spider', 'red-spider', 'giant-black-spider'])(
    'only rolls poison for eligible spider species: %s',
    (definition) => {
      const { session } = setup({ definition });
      const player = session.engine.getEntity('player')!;
      player.health = { current: 10000, max: 10000 };
      const chance = vi.spyOn(session.engine.random, 'chance').mockReturnValue(true);
      vi.spyOn(session.engine.random, 'int').mockImplementation((min) => min);
      session.advanceEnemyTurns();
      const poisonous = definition !== 'white-spider';
      expect(chance.mock.calls.some(([probability]) => probability === 0.05)).toBe(poisonous);
      expect(player.statuses?.some((status) => status.id === 'poison') ?? false).toBe(poisonous);
      expect(session.combat.completedActions).toBe(1);
    },
  );
  it('rejects unknown, malformed and duplicate registrations before battle', () => {
    const raw = structuredClone(loadGameContent().data);
    raw.enemies[0].battleAI = { engineId: 'missing', config: {} };
    expect(() => new ContentRegistry(raw)).toThrow('Unknown enemy');
    raw.enemies[0].battleAI = { engineId: 'spider', config: { temperament: 'missing' } };
    expect(() => new ContentRegistry(raw)).toThrow();
    raw.enemies[0].battleAI = { engineId: 'generic', config: { unknown: 1 } };
    expect(() => new ContentRegistry(raw)).toThrow();
    expect(() => createEnemyBattleRegistry().register(new GenericEnemyBattleEngine())).toThrow(
      'Duplicate',
    );
  });
  it('plugs in another family through the registry and immutable context only', () => {
    let observed = false;
    const behavior: EnemyBattleBehavior = {
      id: 'beetle',
      configSchema: z.strictObject({}),
      score(ctx) {
        observed = true;
        expect(Object.isFrozen(ctx)).toBe(true);
        expect(Object.isFrozen(ctx.source)).toBe(true);
        expect(Object.isFrozen(ctx.candidates[0].action)).toBe(true);
        expect(Object.isFrozen(ctx.config)).toBe(true);
        return ctx.candidates.map((c) => (c.kind === 'defend' ? 1 : 0));
      },
    };
    const { session, enemy } = setup({ plugin: behavior });
    enemy.stamina!.current = 0;
    session.advanceEnemyTurns();
    expect(observed).toBe(true);
    expect(enemy.stamina!.current).toBe(10);
    expect(session.getSnapshot().log.some((s) => s.includes('defends'))).toBe(true);
  });
  it.each(['white-spider', 'black-spider', 'red-spider', 'giant-black-spider'])(
    'replays %s across seeded complete battles',
    (definition) => {
      for (let seed = 0; seed < 20; seed++) {
        const run = () => {
          const { session } = setup({ definition, seed });
          for (let turns = 0; turns < 200 && !session.combat.result; turns++) {
            if (session.battle.phase === 'enemyTurn') session.advanceEnemyTurns();
            else {
              session.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
              session.dispatch({
                type: 'SELECT_TARGET',
                targetId: session.getSnapshot().entities.find((e) => e.side === 'enemy')!.id,
              });
              session.dispatch({ type: 'CONFIRM_ACTION' });
            }
          }
          expect(session.combat.result).toBeDefined();
          return { view: session.getSnapshot(), random: session.engine.random.snapshot() };
        };
        expect(run()).toEqual(run());
      }
    },
  );
});

describe('tactical candidates and weights', () => {
  it.each([
    ['defensive', 60, 40],
    ['balanced', 80, 20],
    ['aggressive', 90, 10],
    ['survival', 80, 20],
  ] as const)('scores %s temperament', (temperament, attack, defense) => {
    expect(new SpiderEnemyBattleEngine().score(context(temperament))).toEqual([attack, defense]);
  });
  it('adjusts survival, stamina and poison while preventing consecutive guarding', () => {
    const spider = new SpiderEnemyBattleEngine();
    const base = context();
    expect(spider.score({ ...base, source: { ...base.source, health: 19 } })).toEqual([80, 60]);
    expect(spider.score({ ...base, source: { ...base.source, stamina: 10 } })).toEqual([80, 60]);
    expect(
      spider.score({ ...base, participants: [{ ...base.participants[0], statuses: ['poison'] }] }),
    ).toEqual([80, 60]);
    const survival = context('survival');
    expect(spider.score({ ...survival, source: { ...survival.source, health: 27 } })).toEqual([
      80, 120,
    ]);
    expect(spider.score({ ...base, lastAction: { action: 'defend' } })).toEqual([80, 0]);
    expect(
      spider.score({
        ...base,
        source: { ...base.source, stamina: 0 },
        lastAction: { action: 'defend' },
      }),
    ).toEqual([0, 1]);
  });
  it('prepares candidates without costs, RNG, or mutable context escaping', () => {
    const { session, enemy, content } = setup({ skills: ['defense', 'poison-attack', 'firebolt'] });
    const before = structuredClone(enemy),
      rng = session.engine.random.snapshot();
    const prepared = prepareEnemyActions(session.engine, session.combat, content, enemy);
    expect(prepared.candidates.map((c) => c.kind)).toEqual(['attack', 'defend', 'damage']);
    expect(enemy).toEqual(before);
    expect(session.engine.random.snapshot()).toEqual(rng);
    expect(Object.isFrozen(prepared.participants)).toBe(true);
  });
  it('excludes cooldowns, unavailable skills, passive casts and unaffordable resources', () => {
    const { session, enemy, content } = setup({
      skills: ['firebolt', 'healing', 'defense', 'poison-attack'],
    });
    enemy.health!.current = 10;
    enemy.cooldowns = { firebolt: 1 };
    enemy.mana!.current = 0;
    expect(
      prepareEnemyActions(session.engine, session.combat, content, enemy).candidates.map(
        (c) => c.kind,
      ),
    ).toEqual(['attack', 'defend']);
    enemy.mana!.current = 20;
    enemy.stamina!.current = 0;
    expect(
      prepareEnemyActions(session.engine, session.combat, content, enemy).candidates.map(
        (c) => c.kind,
      ),
    ).toEqual(['attack', 'defend']);
    enemy.cooldowns = {};
    expect(
      prepareEnemyActions(session.engine, session.combat, content, enemy).candidates.map(
        (c) => c.kind,
      ),
    ).toEqual(['attack', 'damage', 'defend']);
  });
  it('executes active damage and pays mana once with ordinary regeneration', () => {
    const { session, enemy, content } = setup({ skills: ['firebolt'], plugin: plugin('damage') });
    const before = enemy.mana!.current;
    session.advanceEnemyTurns();
    expect(enemy.mana!.current).toBe(before - content.skill('firebolt').manaCost + 1);
    expect(session.combat.completedActions).toBe(1);
    expect(session.getSnapshot().log.some((s) => s.includes('Firebolt'))).toBe(true);
  });
  it('heals a depleted self and suppresses unnecessary healing', () => {
    const { session, enemy } = setup({ skills: ['healing'], plugin: plugin('heal') });
    enemy.health!.current = 10;
    enemy.stamina!.current = 40;
    session.advanceEnemyTurns();
    expect(enemy.health!.current).toBeGreaterThan(10);
    expect(enemy.stamina!.current).toBe(35);
    expect(session.getSnapshot().training).toEqual({});
  });
  it('targets the weakest living hostile, with stable queue ties', () => {
    const { session, enemy, content } = setup({ party: true });
    const first = session.engine.getEntity('player')!,
      second = session.engine.getEntity('player-2')!;
    const target = () =>
      prepareEnemyActions(session.engine, session.combat, content, enemy).candidates[0].targetId;
    expect(target()).toBe('player');
    second.health!.current = 2;
    expect(target()).toBe('player-2');
    first.health!.current = 2;
    expect(target()).toBe('player');
    first.health!.current = 0;
    first.dead = true;
    expect(target()).toBe('player-2');
  });
  it('heals an injured ally with target-specific stamina cost and ignores healthy allies', () => {
    const { session, enemy, content } = setup({
      party: true,
      skills: ['healing'],
      plugin: plugin('heal'),
    });
    const ally = session.engine.getEntity('ally-spider')!;
    const candidates = () =>
      prepareEnemyActions(session.engine, session.combat, content, enemy).candidates;
    expect(candidates().some((c) => c.kind === 'heal')).toBe(false);
    ally.health!.current = 2;
    enemy.stamina!.current = 0;
    expect(candidates().find((c) => c.kind === 'heal')).toMatchObject({
      targetId: ally.id,
      staminaCost: 0,
    });
    session.dispatch({ type: 'ADVANCE_ENEMY_TURN' });
    expect(ally.health!.current).toBeGreaterThan(2);
    expect(enemy.stamina!.current).toBe(1);
    expect(enemy.health!.current).toBe(enemy.health!.max);
  });
  it('uses a missing buff once and excludes it while its status remains active', () => {
    const { session, enemy, content } = setup({
      buff: true,
      skills: ['test-buff'],
      plugin: plugin('buff'),
    });
    session.advanceEnemyTurns();
    expect(enemy.statuses).toEqual([
      { id: 'focus', sourceId: enemy.id, remainingTurns: 2, stacks: 1 },
    ]);
    expect(
      prepareEnemyActions(session.engine, session.combat, content, enemy).candidates.map(
        (c) => c.kind,
      ),
    ).toEqual(['attack']);
  });
  it('leaves an attack-only generic enemy selection free of extra RNG draws', () => {
    const { session, enemy, content } = setup({ skills: [] });
    delete enemy.battleAI;
    const rng = session.engine.random.snapshot();
    expect(new EnemyBattleEngine(content).decide(session.engine, session.combat, enemy)).toEqual({
      action: { action: 'attack' },
      targetId: 'player',
    });
    expect(session.engine.random.snapshot()).toEqual(rng);
  });
  it('keeps per-actor history isolated and clears it on disposal', () => {
    const { session, enemy, content } = setup();
    const a = new EnemyBattleEngine(content),
      b = new EnemyBattleEngine(content);
    a.recordAcceptedAction(enemy.id, { action: 'defend' });
    const int = vi.spyOn(session.engine.random, 'int').mockImplementation((_min, max) => max);
    expect(a.decide(session.engine, session.combat, enemy).action.action).toBe('attack');
    expect(b.decide(session.engine, session.combat, enemy).action.action).toBe('defend');
    a.dispose();
    expect(a.decide(session.engine, session.combat, enemy).action.action).toBe('defend');
    expect(int).toHaveBeenCalled();
  });
  it('rolls back selection RNG after uncommitted rejection', () => {
    const { session, enemy } = setup();
    const rng = session.engine.random.snapshot(),
      before = structuredClone(enemy);
    const original = session.engine.dispatch.bind(session.engine);
    const dispatch = vi.spyOn(session.engine, 'dispatch').mockImplementation((command) => {
      if (command.type === 'ATTACK' || command.type === 'DEFEND')
        throw new Error('rejected before commit');
      return original(command);
    });
    expect(() => session.advanceEnemyTurns()).toThrow('rejected before commit');
    expect(session.engine.random.snapshot()).toEqual(rng);
    expect(enemy).toEqual(before);
    expect(session.combat.completedActions).toBe(0);
    expect(session.battle.phase).toBe('enemyTurn');
    dispatch.mockRestore();
    session.advanceEnemyTurns();
    expect(session.combat.completedActions).toBe(1);
  });
  it('retains accepted guard history despite a throwing combat listener', () => {
    const { session } = setup();
    vi.spyOn(session.engine.random, 'int').mockImplementation((_min, max) => max);
    const cleanup = session.engine.events.on('ACTION_RESOLVED', () => {
      throw new Error('observer failed');
    });
    expect(() => session.advanceEnemyTurns()).toThrow('delivery failed');
    expect(session.combat.completedActions).toBe(1);
    expect(session.battle.phase).toBe('selectingAction');
    cleanup();
    session.dispatch({ type: 'SELECT_ACTION', action: 'defend' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' });
    session.dispatch({ type: 'CONFIRM_ACTION' });
    session.advanceEnemyTurns();
    expect(session.combat.completedActions).toBe(3);
    expect(session.getSnapshot().log.filter((s) => s.includes('defends'))).toHaveLength(2);
  });
  it('rejects malformed plugin weights without state or RNG changes', () => {
    for (const weights of [[0, 0], [NaN, 1], [-1, 2], [1], [Number.MAX_SAFE_INTEGER, 1]]) {
      const { session, enemy } = setup({
        plugin: { id: 'bad', configSchema: z.strictObject({}), score: () => weights },
      });
      const before = structuredClone(enemy),
        rng = session.engine.random.snapshot();
      expect(() => session.advanceEnemyTurns()).toThrow();
      expect(enemy).toEqual(before);
      expect(session.engine.random.snapshot()).toEqual(rng);
    }
  });
});
