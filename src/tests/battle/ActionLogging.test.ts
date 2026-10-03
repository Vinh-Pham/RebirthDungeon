import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { LogEngine, selectLogEntries } from '../../engine/logging/LogEngine';
import { JourneySession } from '../../game/JourneySession';
import { BattleSession } from '../../game/BattleSession';
import { commandCategory, EVENT_POLICY } from '../../game/logging/GameActionLogging';
import { formatLogTimestamp } from '../../ui/logs/formatLogTimestamp';
const content = loadGameContent(),
  cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((c) => c());
  vi.restoreAllMocks();
});
describe('game action logging', () => {
  it('logs each travel step and rejection without changing state, RNG or getter behavior', () => {
    const logs = new LogEngine(() => 10);
    const logged = new JourneySession(content, undefined, 1, undefined, 'warrior', logs);
    const plain = new JourneySession(content, undefined, 1);
    cleanups.push(
      () => logged.dispose(),
      () => plain.dispose(),
    );
    for (const session of [logged, plain]) session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    expect(logged.toSave()).toEqual(plain.toSave());
    const entries = selectLogEntries(logs.getSnapshot());
    expect(entries.filter((e) => e.type === 'MOVE')).toHaveLength(7);
    expect(entries.filter((e) => e.type === 'WORLD_MOVED')).toHaveLength(7);
    expect(entries.every((e) => e.category === 'movement')).toBe(true);
    const before = logged.toSave(),
      count = logs.getSnapshot().count;
    logged.getSnapshot();
    logged.getSnapshot();
    expect(logs.getSnapshot().count).toBe(count);
    expect(() => logged.dispatch({ type: 'MOVE', entityId: 'player', dx: 2, dy: 0 })).toThrow();
    expect(logged.toSave()).toEqual(before);
    expect(selectLogEntries(logs.getSnapshot())[0].metadata?.committed).toBe(false);
  });
  it('captures combat outcomes, poison and enemy turns once, with identical seeded simulation', () => {
    const map = structuredClone(content.data.maps[0]);
    map.spawns[1].definitionId = 'black-spider';
    const logs = new LogEngine(() => 20);
    const logged = new BattleSession(
      content,
      17,
      map,
      undefined,
      [],
      undefined,
      'test',
      false,
      logs,
    );
    const plain = new BattleSession(content, 17, map);
    cleanups.push(
      () => logged.dispose(),
      () => plain.dispose(),
    );
    for (const session of [logged, plain]) {
      vi.spyOn(session.engine.random, 'chance').mockReturnValue(true);
      vi.spyOn(session.engine.random, 'int').mockImplementation((min) => min);
      session.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
      session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
      session.dispatch({ type: 'CONFIRM_ACTION' });
      session.advanceEnemyTurns();
    }
    expect(logged.getSnapshot()).toEqual(plain.getSnapshot());
    expect(logged.engine.random.snapshot()).toEqual(plain.engine.random.snapshot());
    const entries = selectLogEntries(logs.getSnapshot());
    expect(entries.filter((e) => e.type === 'ACTION_RESOLVED')).toHaveLength(2);
    expect(entries.some((e) => e.type === 'STATUS_APPLIED' && e.message.includes('Poison'))).toBe(
      true,
    );
    expect(entries.some((e) => e.type === 'ADVANCE_ENEMY_TURN')).toBe(true);
    expect(entries.every((e) => e.category === 'combat')).toBe(true);
    expect(entries.every((e) => e.type !== 'ANIMATION_REQUESTED')).toBe(true);
  });
  it('preserves real seeded combat draws and rejects locked input without spending resources', () => {
    for (const seed of [1, 17, 200]) {
      const logs = new LogEngine(() => 20);
      const logged = new BattleSession(
        content,
        seed,
        'chamber',
        undefined,
        [],
        undefined,
        'same',
        false,
        logs,
      );
      const plain = new BattleSession(content, seed, 'chamber', undefined, [], undefined, 'same');
      cleanups.push(
        () => logged.dispose(),
        () => plain.dispose(),
      );
      for (let turn = 0; turn < 4; turn++) {
        for (const session of [logged, plain]) {
          if (session.battle.phase === 'selectingAction') {
            session.dispatch({ type: 'SELECT_ACTION', action: 'defend' });
            session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' });
            session.dispatch({ type: 'CONFIRM_ACTION' });
          }
          session.advanceEnemyTurns();
        }
        expect(logged.getSnapshot()).toEqual(plain.getSnapshot());
        expect(logged.engine.random.snapshot()).toEqual(plain.engine.random.snapshot());
      }
      const before = logged.getSnapshot(),
        random = logged.engine.random.snapshot();
      logged.setInputLocked(true);
      expect(() => logged.dispatch({ type: 'CANCEL_ACTION' })).toThrow('Save pending');
      expect(logged.selectPlayerAction({ action: 'attack' }, before.actionCount)).toBe(false);
      expect(logged.getSnapshot()).toEqual(before);
      expect(logged.engine.random.snapshot()).toEqual(random);
      const entries = selectLogEntries(logs.getSnapshot());
      expect(entries[0].type).toBe('BATTLE_INPUT_REJECTED');
      expect(entries[1].metadata?.committed).toBe(false);
    }
  });
  it('records a committed outcome despite throwing consumers and a failing log sink', () => {
    const logs = new LogEngine(() => 20);
    const journey = new JourneySession(content, undefined, 1, undefined, 'warrior', logs);
    cleanups.push(() => journey.dispose());
    journey.subscribe(() => {
      throw new Error('Listener failed');
    });
    expect(() => journey.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow(
      'notification',
    );
    expect(
      selectLogEntries(logs.getSnapshot()).find((e) => e.type === 'MOVE')?.metadata?.committed,
    ).toBe(true);
    const broken = new JourneySession(content, undefined, 1, undefined, 'warrior', {
      append: () => {
        throw new Error('Sink failed');
      },
    });
    cleanups.push(() => broken.dispose());
    expect(() => broken.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).not.toThrow();
    expect(broken.toSave().position).toEqual(journey.toSave().position);
  });
  it('classifies every current command and event and formats a stable full local date and time', () => {
    expect(commandCategory({ type: 'START_REST' }, false)).toBe('user');
    expect(commandCategory({ type: 'USE_LIFE_SKILL', skillId: 'rest' }, false)).toBe('system');
    expect(commandCategory({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 }, false)).toBe(
      'movement',
    );
    expect(
      commandCategory(
        { type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: 'health-potion' },
        true,
      ),
    ).toBe('combat');
    expect(EVENT_POLICY.ANIMATION_REQUESTED).toBeNull();
    expect(formatLogTimestamp(new Date(2026, 0, 2, 15, 4, 5).getTime())).toBe(
      'Jan 2, 2026 at 3:04:05 PM',
    );
  });
});
