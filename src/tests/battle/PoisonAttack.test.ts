import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { createGameEngine } from '../../engine/GameEngine';
import { CombatSystem } from '../../engine/ecs/systems/CombatSystem';
import type { Entity } from '../../engine/ecs/Entity';
import type { GameEvent } from '../../engine/events';
import { applyStatus, tickStatuses } from '../../engine/rpg/StatusEffects';
import { learnSkill } from '../../engine/rpg/Skills';
import { createHero } from '../../engine/rpg/Character';

const content = loadGameContent();
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((c) => c());
  vi.restoreAllMocks();
});
function fighter(id: string, side: 'player' | 'enemy', speed: number): Entity {
  return {
    id,
    [side]: true,
    health: { current: 200, max: 200 },
    stamina: { current: 40, max: 40 },
    mana: { current: 20, max: 20 },
    wounds: 0,
    combatant: {
      attack: 20,
      minDamage: 20,
      maxDamage: 20,
      balance: 0.5,
      defense: 0,
      speed,
      hitChance: 1,
      criticalChance: 0,
      criticalRating: 0,
      minInjury: 0,
      maxInjury: 0,
    },
    skills: side === 'enemy' ? ['poison-attack', 'firebolt'] : [],
  };
}
function setup(playerFirst = false) {
  const engine = createGameEngine({ seed: 1 });
  cleanups.push(() => engine.dispose());
  const player = engine.spawn(fighter('player', 'player', playerFirst ? 20 : 5));
  const enemy = engine.spawn(fighter('enemy', 'enemy', 10));
  const events: GameEvent[] = [];
  engine.events.subscribe((e) => events.push(e));
  const combat = new CombatSystem(['player', 'enemy'], { content });
  engine.addSystem(combat);
  return { engine, player, enemy, events, combat };
}
function forceProc(engine: ReturnType<typeof createGameEngine>, proc = true) {
  return vi.spyOn(engine.random, 'chance').mockImplementation((p) => (p === 0.05 ? proc : p === 1));
}

describe('passive spider poison', () => {
  it.each([0, 0.049999, 0.05, 0.999])(
    'uses the exact 5 percent application boundary for RNG value %s',
    (value) => {
      const { engine, player } = setup();
      vi.spyOn(engine.random, 'float').mockReturnValue(value);
      engine.dispatch({ type: 'ATTACK', attackerId: 'enemy', targetId: 'player' });
      expect(player.statuses?.some((s) => s.id === 'poison') ?? false).toBe(value < 0.05);
    },
  );
  it('applies after a successful melee hit without casting, charging mana or awarding another action', () => {
    const { engine, player, enemy, events, combat } = setup();
    forceProc(engine);
    engine.dispatch({ type: 'ATTACK', attackerId: 'enemy', targetId: 'player' });
    expect(player.health!.current).toBe(180);
    expect(player.statuses).toEqual([
      { id: 'poison', sourceId: 'enemy', remainingTurns: 3, stacks: 1 },
    ]);
    expect(enemy.mana!.current).toBe(20);
    expect(enemy.stamina!.current).toBe(39);
    expect(combat.completedActions).toBe(1);
    expect(events.filter((e) => e.type === 'SKILL_USED')).toEqual([]);
  });
  it('does not roll poison on a miss or a lethal hit', () => {
    for (const lethal of [false, true]) {
      const { engine, player, enemy } = setup();
      const chance = forceProc(engine);
      if (lethal) player.health!.current = 1;
      else enemy.combatant!.hitChance = 0;
      engine.dispatch({ type: 'ATTACK', attackerId: 'enemy', targetId: 'player' });
      expect(chance.mock.calls.some(([p]) => p === 0.05)).toBe(false);
      expect(player.statuses ?? []).toEqual([]);
    }
  });
  it('blocks new poison through Defense and leaves existing poison active', () => {
    const { engine, player } = setup(true);
    const chance = forceProc(engine);
    applyStatus(player, 'poison', 'earlier', content, []);
    engine.dispatch({ type: 'DEFEND', entityId: 'player' });
    expect(player.statuses![0].remainingTurns).toBe(2);
    engine.dispatch({ type: 'ATTACK', attackerId: 'enemy', targetId: 'player' });
    expect(chance.mock.calls.some(([p]) => p === 0.05)).toBe(false);
    expect(player.statuses![0]).toMatchObject({
      sourceId: 'earlier',
      remainingTurns: 2,
      stacks: 1,
    });
  });
  it('does not roll from a loaded ranged basic attack', () => {
    const { engine, enemy, player } = setup();
    const chance = forceProc(engine);
    enemy.weapon = { id: 'enemy-weapon', itemId: 'short-bow', durability: 40 };
    enemy.inventory = { arrow: 2 };
    enemy.ammunitionItemId = 'arrow';
    engine.dispatch({ type: 'ATTACK', attackerId: 'enemy', targetId: 'player' });
    expect(enemy.inventory.arrow).toBe(1);
    expect(chance.mock.calls.some(([p]) => p === 0.05)).toBe(false);
    expect(player.statuses ?? []).toEqual([]);
  });
  it('applies from a physical melee skill that bypasses Defend', () => {
    const { engine, enemy, player } = setup(true);
    const chance = forceProc(engine);
    enemy.skills!.push('smash');
    enemy.weapon = { id: 'enemy-weapon', itemId: 'iron-blade', durability: 40 };
    engine.dispatch({ type: 'DEFEND', entityId: 'player' });
    engine.dispatch({ type: 'USE_SKILL', sourceId: 'enemy', targetId: 'player', skillId: 'smash' });
    expect(chance.mock.calls.some(([p]) => p === 0.05)).toBe(true);
    expect(player.statuses).toEqual([
      { id: 'poison', sourceId: 'enemy', remainingTurns: 3, stacks: 1 },
    ]);
  });
  it('does not proc from magic or allow a passive skill cast', () => {
    const { engine, player } = setup();
    const chance = forceProc(engine);
    const rng = engine.random.snapshot();
    expect(() =>
      engine.dispatch({
        type: 'USE_SKILL',
        sourceId: 'enemy',
        targetId: 'player',
        skillId: 'poison-attack',
      }),
    ).toThrow('unavailable');
    expect(engine.random.snapshot()).toEqual(rng);
    engine.dispatch({
      type: 'USE_SKILL',
      sourceId: 'enemy',
      targetId: 'player',
      skillId: 'firebolt',
    });
    expect(chance.mock.calls.some(([p]) => p === 0.05)).toBe(false);
    expect(player.statuses ?? []).toEqual([]);
  });
  it('keeps poison outside hero learning and rejects malformed adapters or status values', () => {
    expect(() => learnSkill(createHero(content), 'poison-attack', content)).toThrow('Enemy-only');
    for (const fraction of [0, -0.1, 1.1]) {
      const raw = structuredClone(content.data);
      raw.statusEffects.find((s) => s.id === 'poison')!.healthFraction = fraction;
      expect(() => new ContentRegistry(raw)).toThrow();
    }
    const raw = structuredClone(content.data);
    raw.skills.find((s) => s.id === 'poison-attack')!.enemyUse = {
      type: 'onMeleeHit',
      statusId: 'missing',
      chance: 0.05,
    };
    expect(() => new ContentRegistry(raw)).toThrow('passive');
  });
});

describe('nonlethal percentage poison status', () => {
  it.each([
    [200, 10],
    [101, 5],
    [20, 1],
    [19, 1],
    [2, 1],
    [1, 0],
  ] as const)('drains %s HP by %s and never wounds or crits', (hp, amount) => {
    const entity = fighter('player', 'player', 1);
    entity.health!.current = hp;
    entity.combatant!.defense = 999999;
    entity.combatant!.protection = 999999;
    applyStatus(entity, 'poison', 'enemy', content, []);
    const events: GameEvent[] = [];
    tickStatuses(entity, 'turnEnd', content, events);
    expect(entity.health!.current).toBe(hp - amount);
    expect(entity.wounds).toBe(0);
    expect(events).toContainEqual({
      type: 'DAMAGE_DEALT',
      sourceId: 'enemy',
      targetId: 'player',
      amount,
      critical: false,
    });
  });
  it('ticks only at the affected owner end, recalculates current HP and expires after three ticks', () => {
    const entity = fighter('player', 'player', 1);
    const events: GameEvent[] = [];
    applyStatus(entity, 'poison', 'enemy', content, events);
    tickStatuses(entity, 'turnStart', content, events);
    expect(entity.health!.current).toBe(200);
    tickStatuses(entity, 'turnEnd', content, events);
    expect(entity.health!.current).toBe(190);
    tickStatuses(entity, 'turnEnd', content, events);
    expect(entity.health!.current).toBe(181);
    tickStatuses(entity, 'turnEnd', content, events);
    expect(entity.health!.current).toBe(172);
    expect(entity.statuses).toEqual([]);
    expect(events.at(-1)).toEqual({
      type: 'STATUS_EXPIRED',
      entityId: 'player',
      statusId: 'poison',
    });
  });
  it('refreshes a shared poison ID across sources without stacking damage', () => {
    const entity = fighter('player', 'player', 1);
    applyStatus(entity, 'poison', 'spider-a', content, []);
    tickStatuses(entity, 'turnEnd', content, []);
    applyStatus(entity, 'poison', 'spider-b', content, []);
    expect(entity.statuses).toEqual([
      { id: 'poison', sourceId: 'spider-b', remainingTurns: 3, stacks: 1 },
    ]);
    tickStatuses(entity, 'turnEnd', content, []);
    expect(entity.health!.current).toBe(181);
  });
  it('does not tick defeated actors and follows ordinary resource regeneration', () => {
    const { engine, player } = setup();
    forceProc(engine);
    engine.dispatch({ type: 'ATTACK', attackerId: 'enemy', targetId: 'player' });
    engine.dispatch({ type: 'DEFEND', entityId: 'player' });
    expect(player.health!.current).toBe(172);
    player.health!.current = 0;
    const before = structuredClone(player);
    tickStatuses(player, 'turnEnd', content, []);
    expect(player).toEqual(before);
  });
});
