import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { CombatSystem, createGameEngine, type Entity, type GameEngine, type GameEvent } from '../../engine';
import { applyStatus } from '../../engine/rpg/StatusEffects';
import { BattleSession } from '../../game/BattleSession';

const content = loadGameContent();
const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).forEach((cleanup) => cleanup()); vi.restoreAllMocks(); vi.useRealTimers(); });

function fighter(id: string, side: 'player' | 'enemy', speed: number): Entity {
  return { id, [side]: true, health: { current: 80, max: 100 },
    combatant: { attack: 12, defense: 2, speed, hitChance: 1, criticalChance: 0 },
    stamina: { current: 0, max: 40 }, mana: { current: 20, max: 40 }, skills: ['firebolt'],
    inventory: { potion: 2 }, weapon: { id: `${id}-blade`, itemId: 'iron-blade', durability: 60 } };
}
function setup(enemies = 1) {
  const engine = createGameEngine({ seed: 1 }); cleanups.push(() => engine.dispose());
  engine.spawn(fighter('player', 'player', 10));
  for (let i = 1; i <= enemies; i++) {
    const enemy = fighter(`enemy-${i}`, 'enemy', 5); enemy.stamina!.current = 40; engine.spawn(enemy);
  }
  const events: GameEvent[] = []; engine.events.subscribe((event) => events.push(event));
  const combat = new CombatSystem(engine.world.entities.map((entity) => entity.id), { content }); engine.addSystem(combat);
  return { engine, combat, events, player: engine.getEntity('player')! };
}
function damage(engine: GameEngine, sourceId: string, spell: boolean) {
  engine.dispatch(spell ? { type: 'USE_SKILL', sourceId, targetId: 'player', skillId: 'firebolt' } :
    { type: 'ATTACK', attackerId: sourceId, targetId: 'player' });
}

describe('Defend', () => {
  it('requires self-targeting and confirmation; canceling spends no resources, RNG, or turn', () => {
    vi.useFakeTimers();
    const session = new BattleSession(content); cleanups.push(() => session.dispose());
    const player = session.engine.getEntity('player')!; player.stamina!.current = 0;
    player.weapon = { id: 'player-blade', itemId: 'iron-blade', durability: 60 };
    const before = structuredClone(player); const random = session.engine.random.snapshot();
    expect(() => session.dispatch({ type: 'DEFEND', entityId: 'player' })).toThrow('Select and confirm');
    session.dispatch({ type: 'SELECT_ACTION', action: 'defend' });
    expect(session.getSnapshot().targets).toEqual(['player']);
    expect(() => session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' })).toThrow('Invalid');
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('Select a living target');
    session.dispatch({ type: 'CANCEL_ACTION' });
    expect(player).toEqual(before); expect(session.engine.random.snapshot()).toEqual(random);
    expect(session.combat.currentTurn()).toBe('player');
    session.dispatch({ type: 'SELECT_ACTION', action: 'defend' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' }); session.dispatch({ type: 'CONFIRM_ACTION' });
    expect(session.battle.phase).toBe('enemyTurn'); expect(player.stamina!.current).toBe(10);
    expect(player.weapon.durability).toBe(60); expect(player.inventory).toEqual(before.inventory);
    expect(player.mana!.current).toBe(before.mana!.current); expect(session.engine.random.snapshot()).toEqual(random);
    expect(session.presentation.getSnapshot().active).toMatchObject({ animation: 'defend', sourceId: 'player', targetId: 'player', impacts: [] });
    expect(session.getSnapshot().log.some((line) => line.includes('defends'))).toBe(true);
  });

  it('protects throughout consecutive enemy turns and expires when the defender starts their next turn', () => {
    const { engine, combat, events, player } = setup(2);
    const random = engine.random.snapshot();
    engine.dispatch({ type: 'DEFEND', entityId: 'player' });
    expect(player.stamina!.current).toBe(10); expect(player.mana!.current).toBe(21);
    expect(player.weapon!.durability).toBe(60); expect(player.inventory).toEqual({ potion: 2 });
    expect(engine.random.snapshot()).toEqual(random); expect(events).toContainEqual({ type: 'DEFENDED', entityId: 'player' });
    damage(engine, 'enemy-1', false); damage(engine, 'enemy-2', false);
    expect(events.filter((event) => event.type === 'DAMAGE_DEALT').map((event) => event.amount)).toEqual([5, 5]);
    expect(player.health!.current).toBe(71); expect(combat.currentTurn()).toBe('player');
    engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'enemy-1' }); damage(engine, 'enemy-1', false);
    expect(events.filter((event) => event.type === 'DAMAGE_DEALT').at(-1)).toMatchObject({ targetId: 'player', amount: 10 });
  });

  it.each([false, true])('halves damage after critical and defense calculations (spell: %s)', (spell) => {
    function received(defend: boolean) {
      const { engine, events } = setup(); const enemy = engine.getEntity('enemy-1')!;
      enemy.combatant!.criticalChance = 1;
      vi.spyOn(engine.random, 'chance').mockReturnValue(true);
      // Both branches use no RNG before the enemy action, so critical damage is comparable.
      if (defend) engine.dispatch({ type: 'DEFEND', entityId: 'player' });
      else {
        engine.dispatch({ type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: 'potion' });
      }
      damage(engine, 'enemy-1', spell);
      return events.filter((event) => event.type === 'DAMAGE_DEALT').at(-1)!.amount;
    }
    expect(received(true)).toBe(Math.max(1, Math.floor(received(false) / 2)));
  });

  it('preserves minimum hit damage and leaves status damage unchanged', () => {
    const { engine, events, player } = setup();
    engine.getEntity('enemy-1')!.combatant!.attack = 0;
    applyStatus(player, 'burn', 'enemy-1', content, []);
    engine.dispatch({ type: 'DEFEND', entityId: 'player' }); damage(engine, 'enemy-1', false);
    expect(events.filter((event) => event.type === 'DAMAGE_DEALT').map((event) => event.amount)).toEqual([content.status('burn').power, 1]);
  });
});
