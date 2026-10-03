import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { DEBUG_GOLD_CAP, type DebugCommand } from '../../game/DebugCommands';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';

const content = loadGameContent();
const cleanups: (() => void)[] = [];
const sessions: JourneySession[] = [];
async function settle() {
  for (let i = 0; i < 100; i++) await Promise.resolve();
}
async function setup(gold = 0, debugEnabled = true) {
  const session = new JourneySession(content);
  const state = session.toSave();
  session.dispose();
  state.hero.gold = gold;
  state.hero.health = 30;
  state.hero.mana = 2;
  state.hero.stamina = 4;
  const rows = new Map<string, SaveRow>([
    [
      'auto',
      {
        id: 'auto',
        savedAt: '2026-10-02T12:00:00.000Z',
        payload: encodeSave(state, content),
      },
    ],
  ]);
  const storage: SaveStorage = {
    async read(id) {
      return rows.get(id);
    },
    async list() {
      return [...rows.values()];
    },
    async write(row) {
      rows.set(row.id, row);
    },
    async close() {},
  };
  const host = new JourneyHost(content, async () => storage, undefined, undefined, undefined, {
    debugEnabled,
  });
  cleanups.push(host.subscribe(vi.fn()));
  await settle();
  await host.flush();
  return { host, storage, rows };
}
async function enterBattle(host: JourneyHost) {
  const session = host.getSnapshot().session!;
  session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
  session.dispatch({ type: 'INTERACT', objectId: 'east' });
  session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
  await host.flush();
  return host.getSnapshot().battle!;
}
beforeEach(() => vi.useFakeTimers());
afterEach(async () => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  sessions.splice(0).forEach((session) => session.dispose());
  await settleJourneySaves();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('development gold commands', () => {
  it('rejects requests when debug is disabled, including the default host configuration', async () => {
    const { host, storage } = await setup(0, false);
    const before = host.getSnapshot().session!.toSave();
    const write = vi.spyOn(storage, 'write');
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(false);
    expect(host.getSnapshot().session!.toSave()).toEqual(before);
    expect(write).not.toHaveBeenCalled();
    const defaultHost = new JourneyHost(content, async () => storage);
    cleanups.push(defaultHost.subscribe(vi.fn()));
    await settle();
    expect(await defaultHost.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(false);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    'rejects invalid amount %s without changing state or RNG',
    async (amount) => {
      const { host, storage } = await setup();
      const session = host.getSnapshot().session!;
      const before = session.getSnapshot();
      const write = vi.spyOn(storage, 'write');
      expect(await host.debug({ type: 'ADD_GOLD', amount })).toBe(false);
      expect(session.getSnapshot()).toBe(before);
      expect(session.engine.random.snapshot()).toEqual(before.state.randomState);
      expect(write).not.toHaveBeenCalled();
      expect(host.getSnapshot().retryAvailable).not.toBe(true);
    },
  );

  it('rejects unknown commands and storage-free operations', async () => {
    const { host } = await setup();
    expect(await host.debug({ type: 'UNKNOWN', amount: 100 } as unknown as DebugCommand)).toBe(
      false,
    );
    const offline = new JourneyHost(
      content,
      async () => {
        throw new Error('Offline');
      },
      undefined,
      undefined,
      undefined,
      { debugEnabled: true },
    );
    cleanups.push(offline.subscribe(vi.fn()));
    await settle();
    const before = offline.getSnapshot().session!.toSave();
    expect(await offline.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(false);
    expect(offline.getSnapshot().session!.toSave()).toEqual(before);
    expect(offline.getSnapshot().error).toContain('Save storage');
  });

  it('rejects overflowing shortcuts and accepts the exact cap without clamping', async () => {
    const { host, storage } = await setup(DEBUG_GOLD_CAP - 100);
    const write = vi.spyOn(storage, 'write');
    expect(await host.debug({ type: 'ADD_GOLD', amount: 1000 })).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(host.getSnapshot().error).toContain('gold cap');
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(true);
    expect(host.getSnapshot().session!.getSnapshot().state.hero.gold).toBe(DEBUG_GOLD_CAP);
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(false);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('saves gold only for the selected character and preserves frozen checkpoints and unchanged branches', async () => {
    const { host, rows } = await setup(7);
    const other = await setup(23);
    const source = host.getSnapshot().session!;
    const before = source.getSnapshot().state;
    expect(await host.debug({ type: 'ADD_GOLD', amount: 1000 })).toBe(true);
    const after = host.getSnapshot().session!.getSnapshot().state;
    expect(after).toEqual({ ...before, hero: { ...before.hero, gold: 1007 } });
    expect(before.hero.gold).toBe(7);
    expect(Object.isFrozen(before.hero)).toBe(true);
    expect(Object.isFrozen(after.hero)).toBe(true);
    expect(after.hero.inventory).toBe(before.hero.inventory);
    expect(after.hero.learnedSkills).toBe(before.hero.learnedSkills);
    expect(after.randomState).toBe(before.randomState);
    expect(other.host.getSnapshot().session!.getSnapshot().state.hero.gold).toBe(23);
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign).toEqual(after);
    await host.save('1');
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(true);
    await host.load('1');
    expect(host.getSnapshot().session!.getSnapshot().state.hero.gold).toBe(1007);
  });

  it('does not publish until saving succeeds and suppresses duplicate in-flight requests', async () => {
    const { host, storage } = await setup();
    const initial = host.getSnapshot().session!;
    let resolveWrite!: () => void;
    vi.spyOn(storage, 'write').mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        }),
    );
    const saving = host.debug({ type: 'ADD_GOLD', amount: 100 });
    await settle();
    expect(host.getSnapshot()).toMatchObject({ session: initial, busy: true });
    expect(initial.getSnapshot().state.hero.gold).toBe(0);
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(false);
    expect(() => initial.dispatch({ type: 'REST', entityId: 'player' })).toThrow('Save pending');
    resolveWrite();
    expect(await saving).toBe(true);
    expect(host.getSnapshot().session!.getSnapshot().state.hero.gold).toBe(100);
  });

  it('retries the identical failed battle candidate without banking combat state or resetting selection', async () => {
    const { host, storage } = await setup(11);
    const battle = await enterBattle(host);
    const initial = host.getSnapshot().session!;
    const checkpoint = initial.toSave();
    const player = battle.engine.getEntity('player')!;
    player.health!.current = 10;
    player.inventory!.potion = 1;
    battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
    battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    const entity = structuredClone(player);
    const view = battle.getSnapshot();
    const random = battle.engine.random.snapshot();
    const training = battle.training.snapshot();
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(false);
    expect(host.getSnapshot()).toMatchObject({ session: initial, battle, retryAvailable: true });
    expect(initial.toSave()).toEqual(checkpoint);
    expect(() => battle.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('Save pending');
    expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(false);
    expect(await host.retryProgression()).toBe(true);
    expect(await host.retryProgression()).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
    const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
    expect(candidate).toEqual({ ...checkpoint, hero: { ...checkpoint.hero, gold: 111 } });
    expect(host.getSnapshot().battle).toBe(battle);
    expect(player).toEqual(entity);
    expect(battle.getSnapshot()).toEqual(view);
    expect(battle.engine.random.snapshot()).toEqual(random);
    expect(battle.training.snapshot()).toEqual(training);
    const restored = new JourneySession(content, candidate);
    sessions.push(restored);
    const restarted = restored.createBattle();
    expect(restored.getSnapshot().state.hero.gold).toBe(111);
    expect(restarted.engine.getEntity('player')!.health!.current).toBe(checkpoint.hero.health);
    expect(restarted.engine.getEntity('player')!.inventory).toEqual(checkpoint.hero.inventory);
    restarted.dispose();
    expect(battle.canAcceptPlayerInput(view.actionCount)).toBe(true);
  });

  it.each(['victory', 'defeat'] as const)(
    'uses the updated balance for %s settlement',
    async (result) => {
      const { host } = await setup(11);
      const battle = await enterBattle(host);
      expect(await host.debug({ type: 'ADD_GOLD', amount: 100 })).toBe(true);
      const enemy = battle.engine.getEntity('slime-1')!;
      vi.spyOn(battle.engine.random, 'chance').mockReturnValue(true);
      if (result === 'victory') enemy.health!.current = 1;
      else {
        enemy.health = { current: 1000, max: 1000 };
        battle.engine.getEntity('player')!.health!.current = 1;
        Object.assign(enemy.combatant!, { attack: 1000, minDamage: 1000, maxDamage: 1000 });
      }
      battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
      battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
      battle.dispatch({ type: 'CONFIRM_ACTION' });
      if (result === 'defeat') battle.advanceEnemyTurns();
      expect(battle.combat.result).toBe(result);
      const expected =
        result === 'victory'
          ? 111 + host.getSnapshot().session!.previewVictoryLoot(battle).gold
          : 55;
      expect(await host.returnFromBattle([])).toBe(true);
      expect(host.getSnapshot().battle).toBeUndefined();
      expect(host.getSnapshot().session!.getSnapshot().state.hero.gold).toBe(expected);
    },
  );
});
