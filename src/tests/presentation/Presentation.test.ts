import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { BattleSession } from '../../game/BattleSession';
import { BattleHost } from '../../game/BattleHost';
import { loadGameContent } from '../../data/content';
import { screenToWorld, worldToScreen } from '../../renderer/Camera';
import { spriteRect } from '../../renderer/Atlas';

const sessions: BattleSession[] = [];
function create() { const session = new BattleSession(loadGameContent()); sessions.push(session); return session; }
afterEach(() => { sessions.splice(0).forEach((session) => session.dispose()); vi.useRealTimers(); });

describe('presentation independence', () => {
  it('queues both turns while simulation resolves immediately and plays them in order', () => {
    vi.useFakeTimers();
    const session = create();
    session.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    session.dispatch({ type: 'CONFIRM_ACTION' }); session.advanceEnemyTurns();
    const state = structuredClone(session.getSnapshot());
    expect(session.battle.phase).toBe('selectingAction');
    expect(session.presentation.getSnapshot().active?.sourceId).toBe('player');
    expect(session.presentation.getSnapshot().pending).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(session.presentation.getSnapshot().active?.sourceId).toBe('slime-1');
    expect(session.getSnapshot()).toEqual(state);
    vi.advanceTimersByTime(1000);
    expect(session.presentation.getSnapshot().busy).toBe(false);
    expect(session.getSnapshot()).toEqual(state);
  });
  it('cleans up scheduled visuals and controller subscriptions on disposal', () => {
    vi.useFakeTimers(); const session = create();
    session.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    session.dispatch({ type: 'CONFIRM_ACTION' });
    expect(vi.getTimerCount()).toBe(1);
    session.dispose(); session.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(() => session.dispatch({ type: 'SELECT_ACTION', action: 'attack' })).toThrow('disposed');
  });
  it('keeps UI settings independent of authoritative simulation', () => {
    const session = create(); const before = structuredClone(session.engine.world.entities);
    session.ui.getState().toggleDebug();
    expect(session.ui.getState().debugVisible).toBe(true);
    expect(session.engine.world.entities).toEqual(before);
  });
  it('supports Strict Mode subscription teardown, recreation and restart', () => {
    const created: BattleSession[] = [];
    const host = new BattleHost(() => { const session = create(); created.push(session); return session; });
    expect(host.getServerSnapshot().session).toBeUndefined();
    const stop = host.subscribe(() => {}); const first = host.getSnapshot().session!;
    stop(); expect(first.engine.world.entities).toHaveLength(0);
    const stopAgain = host.subscribe(() => {});
    expect(host.getSnapshot().session).not.toBe(first);
    host.restart(); expect(created[1].engine.world.entities).toHaveLength(0);
    expect(host.getSnapshot().revision).toBe(3);
    stopAgain(); expect(created[2].engine.world.entities).toHaveLength(0);
  });
});

describe('camera and sprite atlas', () => {
  it('round-trips coordinates through camera translation and zoom', () => {
    fc.assert(fc.property(fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 }),
      fc.integer({ min: 1, max: 10 }), (x, y, zoom) => {
        const camera = { x: 7, y: -3, zoom };
        const world = { x, y };
        const result = screenToWorld(worldToScreen(world, camera), camera);
        expect(result.x).toBeCloseTo(x); expect(result.y).toBeCloseTo(y);
      }), { seed: 20260929 });
    expect(() => screenToWorld({ x: 0, y: 0 }, { x: 0, y: 0, zoom: 0 })).toThrow(RangeError);
  });
  it('calculates atlas rectangles across rows and rejects out-of-bounds frames', () => {
    const atlas = { id: 'test', columns: 2, rows: 2, frameWidth: 16, frameHeight: 32 };
    expect(spriteRect(atlas, 3)).toEqual({ x: 16, y: 32, width: 16, height: 32 });
    expect(() => spriteRect(atlas, 4)).toThrow(RangeError);
  });
});
