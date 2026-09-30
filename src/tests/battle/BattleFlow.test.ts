import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { BattleSession } from '../../game/BattleSession';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';

const sessions: BattleSession[] = [];
function create(seed = 12345, content = loadGameContent()) {
  const session = new BattleSession(content, seed); sessions.push(session); return session;
}
function select(session: BattleSession, targetId = 'slime-1', skillId?: string) {
  session.dispatch({ type: 'SELECT_ACTION', action: skillId ? 'skill' : 'attack', skillId });
  session.dispatch({ type: 'SELECT_TARGET', targetId });
}
afterEach(() => { sessions.splice(0).forEach((session) => session.dispose()); vi.useRealTimers(); });

describe('XState battle flow', () => {
  it('selects and cancels actions, validates targets, and requires confirmation', () => {
    const session = create();
    expect(session.battle.phase).toBe('selectingAction');
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('unavailable');
    expect(() => session.dispatch({ type: 'START_BATTLE' })).toThrow('unavailable');
    session.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
    expect(session.battle.phase).toBe('selectingTarget');
    expect(() => session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' })).toThrow('Invalid');
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('Select a living target');
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    expect(session.getSnapshot().selectedTargetId).toBe('slime-1');
    session.dispatch({ type: 'CANCEL_ACTION' });
    expect(session.battle.phase).toBe('selectingAction');
    expect(session.getSnapshot().selectedTargetId).toBeUndefined();
    expect(session.engine.getEntity('slime-1')?.health?.current).toBe(34);
    expect(() => session.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'slime-1' })).toThrow('Select and confirm');
  });

  it('executes player and enemy turns synchronously without animation or frame callbacks', () => {
    const session = create();
    session.engine.getEntity('player')!.combatant!.hitChance = 1;
    select(session);
    session.dispatch({ type: 'CONFIRM_ACTION' });
    expect(session.battle.phase).toBe('enemyTurn');
    expect(session.engine.getEntity('slime-1')!.health!.current).toBeLessThan(34);
    session.dispatch({ type: 'ADVANCE_ENEMY_TURN' });
    expect(session.battle.phase).toBe('selectingAction');
    expect(session.presentation.getSnapshot().busy).toBe(true);
    expect(session.presentation.getSnapshot().pending).toBe(1);
    expect(() => session.dispatch({ type: 'ADVANCE_ENEMY_TURN' })).toThrow('unavailable');
  });

  it('spends mana once, supports healing, and rejects unaffordable or unknown skills', () => {
    const session = create();
    session.engine.getEntity('player')!.health!.current = 20;
    select(session, 'player', 'mend');
    session.dispatch({ type: 'CONFIRM_ACTION' });
    expect(session.engine.getEntity('player')?.health?.current).toBe(32);
    expect(session.engine.getEntity('player')?.mana?.current).toBe(10);
    session.advanceEnemyTurns();
    select(session, 'slime-1', 'fireball');
    session.dispatch({ type: 'CONFIRM_ACTION' });
    expect(session.engine.getEntity('player')?.mana?.current).toBe(5);
    session.advanceEnemyTurns();
    session.engine.getEntity('player')!.mana!.current = 0;
    const chance = vi.spyOn(session.engine.random, 'chance');
    expect(() => session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'fireball' })).toThrow('mana');
    expect(() => session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'unknown' })).toThrow('Unknown');
    expect(chance).not.toHaveBeenCalled();
  });

  it('ends in victory using commands and rejects new selections afterward', () => {
    const session = create();
    session.engine.getEntity('slime-1')!.health!.current = 1;
    select(session, 'slime-1', 'fireball');
    session.dispatch({ type: 'CONFIRM_ACTION' });
    expect(session.battle.phase).toBe('victory');
    expect(session.combat.result).toBe('victory');
    expect(session.presentation.getSnapshot().busy).toBe(true);
    expect(() => session.dispatch({ type: 'SELECT_ACTION', action: 'attack' })).toThrow('unavailable');
  });

  it('starts with a faster enemy and reaches defeat through enemy resolution', () => {
    const data = structuredClone(loadGameContent().data);
    data.enemies[0].combatant.speed = 20;
    data.enemies[0].combatant.hitChance = 1;
    data.enemies[0].combatant.attack = 200;
    const session = create(1, new ContentRegistry(data));
    expect(session.battle.phase).toBe('enemyTurn');
    session.advanceEnemyTurns();
    expect(session.battle.phase).toBe('defeat');
    expect(session.engine.getEntity('player')!.health!.current).toBe(0);
  });

  it('synchronizes selection and outcome if a participant is removed', () => {
    const session = create(); select(session);
    session.engine.removeEntity('slime-1');
    expect(session.battle.phase).toBe('victory');
    expect(session.getSnapshot().selectedTargetId).toBeUndefined();
  });

  it('recovers a failed validation without advancing turns or consuming mana/RNG', () => {
    const session = create(); select(session, 'slime-1', 'fireball');
    session.engine.getEntity('player')!.mana!.current = 0;
    const chance = vi.spyOn(session.engine.random, 'chance');
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('mana');
    expect(session.battle.phase).toBe('selectingTarget');
    expect(session.combat.currentTurn()).toBe('player');
    expect(session.engine.getEntity('slime-1')?.health?.current).toBe(34);
    expect(chance).not.toHaveBeenCalled();
    session.dispatch({ type: 'CANCEL_ACTION' });
  });

  it('uses data-defined skills against all enemies', () => {
    const data = structuredClone(loadGameContent().data);
    data.skills.push({ ...data.skills[0], id: 'nova', target: 'allEnemies', power: 100 });
    data.classes[0].skills.push('nova');
    data.maps[0].spawns.push({ entityId: 'slime-2', definitionId: 'slime', kind: 'enemy', x: 7, y: 4 });
    const session = create(1, new ContentRegistry(data));
    select(session, 'slime-1', 'nova');
    session.dispatch({ type: 'CONFIRM_ACTION' });
    expect(session.battle.phase).toBe('victory');
    expect(session.engine.getEntity('player')?.mana?.current).toBe(9);
    expect(session.engine.getEntity('slime-1')?.dead).toBe(true);
    expect(session.engine.getEntity('slime-2')?.dead).toBe(true);
    expect(session.presentation.getSnapshot().active?.impacts).toHaveLength(2);
  });

  it('replays entire phase-driven battles for generated seeds', () => {
    vi.useFakeTimers();
    function run(seed: number) {
      const session = new BattleSession(loadGameContent(), seed);
      try {
        for (let turn = 0; turn < 100 && !session.combat.result; turn++) {
          if (session.battle.phase === 'enemyTurn') session.advanceEnemyTurns();
          else { select(session); session.dispatch({ type: 'CONFIRM_ACTION' }); }
        }
        expect(session.combat.result).toBeDefined();
        return { view: session.getSnapshot(), result: session.combat.result, rng: session.engine.random.float() };
      } finally { session.dispose(); }
    }
    fc.assert(fc.property(fc.integer(), (seed) => { expect(run(seed)).toEqual(run(seed)); }), { seed: 20260929, numRuns: 100 });
    expect(vi.getTimerCount()).toBe(0);
  });
});
