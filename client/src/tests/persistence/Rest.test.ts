import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { createHero } from '../../engine/rpg/Character';
import { rankUpSkill, resolveLearnedSkill } from '../../engine/rpg/Skills';
import type { GameCommand } from '../../engine/commands';
import { JourneySession } from '../../game/JourneySession';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { BattleSession } from '../../game/BattleSession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';
import { battleHotbarActions, battleSkills } from '../../ui/battle/battleActionDetails';

const content = loadGameContent();
const sessions: JourneySession[] = [];
const battles: BattleSession[] = [];
const cleanups: (() => void)[] = [];
function campaign() {
  const session = new JourneySession(content);
  const state = session.toSave();
  session.dispose();
  Object.assign(state.hero, { health: 30, mana: 2, stamina: 4, wounds: 5, fullness: 60 });
  return state;
}
function journey(state = campaign()) {
  const session = new JourneySession(content, state);
  sessions.push(session);
  return session;
}
afterEach(async () => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  sessions.splice(0).forEach((session) => session.dispose());
  battles.splice(0).forEach((battle) => battle.dispose());
  await settleJourneySaves();
  vi.restoreAllMocks();
});

describe('Rest life skill', () => {
  it.each(['warrior', 'archery', 'mage'] as const)(
    'grants free Rank F Rest to a new %s',
    (talent) => {
      const hero = createHero(content, talent);
      expect(hero.learnedSkills.rest).toEqual({ rank: 'F', objectiveCounts: {} });
      expect(hero.discoveredSkills.filter((id) => id === 'rest')).toHaveLength(1);
      expect(hero.ap).toBe(5);
      expect(() => rankUpSkill(hero, 'rest', content)).toThrow('Prototype cap: F');
      expect(() => resolveLearnedSkill(content, hero.learnedSkills, 'rest')).toThrow(
        'battle action',
      );
      expect(content.skill('rest').reference?.url).toBe('https://wiki.mabinogiworld.com/view/Rest');
    },
  );

  it('rejects unsupported Rest content and training', () => {
    for (const patch of [
      { category: 'combat' },
      { kind: 'active' },
      { target: 'enemy' },
      { battleUsable: true },
      { gameRanks: { F: { ...content.skill('rest').gameRanks!.F, staminaCost: 1 } } },
      {
        gameRanks: {
          F: {
            ...content.skill('rest').gameRanks!.F,
            objectives: [
              { id: 'uses', label: 'Rest', event: 'use', scope: 'action', points: 10, maximum: 10 },
            ],
          },
        },
      },
    ]) {
      const data = structuredClone(content.data);
      Object.assign(
        data.skills.find((skill) => skill.id === 'rest')!,
        patch,
      );
      expect(() => new ContentRegistry(data)).toThrow();
    }
  });

  it.each([false, true])(
    'migrates v12 once without refilling resources or changing a pending=%s checkpoint',
    (pending) => {
      const session = journey();
      if (pending) {
        session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
        session.dispatch({ type: 'INTERACT', objectId: 'east' });
        session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
      }
      const state = session.toSave();
      Object.assign(state.hero, { ap: 37, gold: 87, stamina: 4 });
      state.hero.learnedSkills.icebolt = { rank: 'E', objectiveCounts: {} };
      delete state.hero.learnedSkills.rest;
      state.hero.discoveredSkills = state.hero.discoveredSkills.filter((id) => id !== 'rest');
      const raw = { version: 12, savedAt: '2026-10-02T12:00:00.000Z', campaign: state };
      const before = structuredClone(raw);
      const migrated = parseSave(raw, content);
      expect(raw).toEqual(before);
      expect(migrated.version).toBe(13);
      expect(migrated.campaign).toEqual({
        ...state,
        hero: {
          ...state.hero,
          learnedSkills: { ...state.hero.learnedSkills, rest: { rank: 'F', objectiveCounts: {} } },
          discoveredSkills: [...state.hero.discoveredSkills, 'rest'],
        },
      });
      expect(parseSave(migrated, content)).toEqual(migrated);
      expect(parseSave({ ...migrated, version: 12 }, content)).toEqual(migrated);
      expect(() => parseSave({ ...migrated, version: 14 }, content)).toThrow();
    },
  );

  it('recovers stamina once per use with no RNG, AP, movement, training or wound changes', () => {
    const session = journey();
    const before = session.getSnapshot();
    session.dispatch({ type: 'USE_LIFE_SKILL', skillId: 'rest' });
    const after = session.getSnapshot();
    expect(after.state.hero).toMatchObject({
      health: 31,
      mana: 3,
      stamina: 14,
      fullness: 59.9,
      wounds: 5,
    });
    expect(before.state.hero.stamina).toBe(4);
    expect(Object.isFrozen(after.state)).toBe(true);
    expect(after.state.hero.learnedSkills).toBe(before.state.hero.learnedSkills);
    expect(after.state.hero.ap).toBe(before.state.hero.ap);
    expect(after.state.hero.inventory).toBe(before.state.hero.inventory);
    expect(after.state.position).toBe(before.state.position);
    expect(after.state.randomState).toEqual(before.state.randomState);
    expect(session.engine.getEntity('player')!.stamina!.current).toBe(14);
    expect(parseSave(JSON.parse(encodeSave(after.state, content)), content).campaign).toEqual(
      after.state,
    );
  });

  it('respects the fullness limit and preserves stamina already above it', () => {
    for (const [stamina, expected] of [
      [64, 67],
      [80, 80],
    ] as const) {
      const state = campaign();
      state.hero.stamina = stamina;
      const session = journey(state);
      session.dispatch({ type: 'USE_LIFE_SKILL', skillId: 'rest' });
      expect(session.getSnapshot().state.hero.stamina).toBe(expected);
    }
  });

  it('rejects invalid, unlearned, service and encounter use without mutating state, ECS or RNG', () => {
    const session = journey();
    const reject = (command: GameCommand) => {
      const before = session.getSnapshot();
      const entity = structuredClone(session.engine.getEntity('player'));
      expect(() => session.dispatch(command)).toThrow();
      expect(session.getSnapshot()).toBe(before);
      expect(session.engine.getEntity('player')).toEqual(entity);
      expect(session.engine.random.snapshot()).toEqual(before.state.randomState);
    };
    for (const skillId of ['missing', 'enchant', 'firebolt', ''])
      reject({ type: 'USE_LIFE_SKILL', skillId });
    session.dispatch({ type: 'INTERACT', objectId: 'keeper' });
    reject({ type: 'USE_LIFE_SKILL', skillId: 'rest' });
    session.dispatch({ type: 'CLOSE_SERVICE' });
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    session.dispatch({ type: 'INTERACT', objectId: 'east' });
    session.dispatch({ type: 'USE_LIFE_SKILL', skillId: 'rest' });
    session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    reject({ type: 'USE_LIFE_SKILL', skillId: 'rest' });
    const unlearned = campaign();
    delete unlearned.hero.learnedSkills.rest;
    const without = journey(unlearned);
    const before = without.getSnapshot();
    expect(() => without.dispatch({ type: 'USE_LIFE_SKILL', skillId: 'rest' })).toThrow(
      'unavailable',
    );
    expect(without.getSnapshot()).toBe(before);
  });

  it('exposes the owned Rest basic action in Life and confirms exactly one self turn', () => {
    const hero = createHero(content);
    hero.stamina = 4;
    const battle = new BattleSession(content, 12345, 'chamber', hero);
    battles.push(battle);
    const action = battleHotbarActions(battle, 'life').find((entry) => entry.id === 'rest')!;
    expect(action).toMatchObject({
      rank: 'F',
      action: { action: 'rest' },
      skill: { id: 'rest', category: 'life' },
    });
    expect(battleSkills(battle).some((skill) => skill.id === 'rest')).toBe(false);
    const random = battle.engine.random.snapshot();
    expect(battle.selectPlayerAction(action.action, 0)).toBe(true);
    expect(battle.engine.getEntity('player')!.stamina!.current).toBe(14);
    expect(battle.combat.completedActions).toBe(1);
    expect(battle.training.snapshot()).toEqual({});
    expect(battle.engine.random.snapshot()).toEqual(random);
    expect(battle.selectPlayerAction(action.action, 0)).toBe(false);
    expect(hero.stamina).toBe(4);
  });

  it('retains one recovery candidate across a failed write and retries without another tick', async () => {
    const saved = campaign();
    const rows = new Map<string, SaveRow>([
      [
        'auto',
        { id: 'auto', savedAt: '2026-10-02T12:00:00.000Z', payload: encodeSave(saved, content) },
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
    const host = new JourneyHost(content, async () => storage);
    cleanups.push(host.subscribe(vi.fn()));
    for (let i = 0; i < 100; i++) await Promise.resolve();
    await host.flush();
    const original = host.getSnapshot().session!;
    const before = original.getSnapshot();
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.progress({ type: 'USE_LIFE_SKILL', skillId: 'rest' })).toBe(false);
    expect(original.getSnapshot()).toBe(before);
    expect(host.getSnapshot().retryAvailable).toBe(true);
    expect(await host.progress({ type: 'USE_LIFE_SKILL', skillId: 'rest' })).toBe(false);
    expect(() => original.dispatch({ type: 'REST', entityId: 'player' })).toThrow('Save pending');
    expect(await host.retryProgression()).toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(
      JSON.parse(write.mock.calls[0][0].payload).campaign,
    );
    expect(host.getSnapshot().session!.getSnapshot().state.hero).toMatchObject({
      stamina: 14,
      fullness: 59.9,
      ap: saved.hero.ap,
    });
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign.hero.stamina).toBe(
      14,
    );
  });
});

describe('continuous exploration Rest', () => {
  it('rejects duplicate, unlearned, service and encounter starts without changing the checkpoint or posture', () => {
    const session = journey();
    session.dispatch({ type: 'START_REST' });
    const resting = session.getSnapshot();
    expect(() => session.dispatch({ type: 'START_REST' })).toThrow('Already resting');
    expect(session.getSnapshot()).toBe(resting);
    session.dispatch({ type: 'STOP_REST' });
    session.dispatch({ type: 'INTERACT', objectId: 'keeper' });
    const service = session.getSnapshot();
    expect(() => session.dispatch({ type: 'START_REST' })).toThrow('unavailable');
    expect(session.getSnapshot()).toBe(service);
    session.dispatch({ type: 'CLOSE_SERVICE' });
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    session.dispatch({ type: 'INTERACT', objectId: 'east' });
    session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    const pending = session.getSnapshot();
    expect(() => session.dispatch({ type: 'START_REST' })).toThrow('Finish the encounter');
    expect(session.getSnapshot()).toBe(pending);
    const state = campaign();
    delete state.hero.learnedSkills.rest;
    const without = journey(state);
    const before = without.getSnapshot();
    expect(() => without.dispatch({ type: 'START_REST' })).toThrow('unavailable');
    expect(without.getSnapshot()).toBe(before);
  });
  async function hosted(state = campaign()) {
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
    const jobs = new Set<() => void>();
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
      restClock: {
        schedule(callback, delayMs) {
          expect(delayMs).toBe(1000);
          jobs.add(callback);
          return () => {
            jobs.delete(callback);
          };
        },
      },
    });
    const unsubscribe = host.subscribe(vi.fn());
    cleanups.push(unsubscribe);
    const settle = async () => {
      for (let i = 0; i < 100; i++) await Promise.resolve();
    };
    await settle();
    await host.flush();
    return {
      host,
      storage,
      jobs,
      rows,
      unsubscribe,
      settle,
      async tick() {
        const ready = [...jobs];
        jobs.clear();
        ready.forEach((job) => job());
        await settle();
      },
    };
  }

  it.each([false, true])(
    'toggles in a generated dungeon=%s, blocks all movement, and resumes after Stop',
    async (dungeon) => {
      const state = campaign();
      if (dungeon) {
        const entry = journey();
        entry.dispatch({ type: 'TRAVEL_TO', x: 7, y: 5 });
        entry.dispatch({ type: 'INTERACT', objectId: 'dungeon-entrance' });
        entry.dispatch({
          type: 'OFFER_ITEM',
          objectId: 'dungeon-entrance',
          item: { itemId: 'potion' },
        });
        Object.assign(state, entry.toSave());
        state.hero.stamina = 4;
      }
      const { host, jobs, tick, storage } = await hosted(state);
      const write = vi.spyOn(storage, 'write');
      const original = host.getSnapshot().session!;
      const before = original.getSnapshot();
      expect(host.toggleRest()).toBe(true);
      expect(original.getSnapshot().resting).toBe(true);
      expect(original.getSnapshot().state).toBe(before.state);
      expect(jobs.size).toBe(1);
      await host.flush();
      expect(write).not.toHaveBeenCalled();
      const stoppedPosition = before.state.position;
      for (const command of [
        { type: 'MOVE', entityId: 'player', dx: 1, dy: 0 },
        { type: 'TRAVEL_TO', ...stoppedPosition },
        { type: 'INTERACT', objectId: dungeon ? 'goddess' : 'keeper' },
        { type: 'EXIT_DUNGEON' },
      ] as GameCommand[]) {
        expect(() => original.dispatch(command)).toThrow(/Stop resting|host durable/);
        expect(original.getSnapshot().state).toBe(before.state);
      }
      await tick();
      expect(write).toHaveBeenCalledTimes(1);
      const recovered = host.getSnapshot().session!;
      expect(recovered.getSnapshot().resting).toBe(true);
      expect(recovered.getSnapshot().state.hero.stamina).toBe(14);
      expect(recovered.getSnapshot().state.position).toBe(stoppedPosition);
      expect(recovered.getSnapshot().state.randomState).toEqual(before.state.randomState);
      expect(jobs.size).toBe(1);
      expect(host.toggleRest()).toBe(true);
      expect(recovered.getSnapshot().resting).toBe(false);
      await host.flush();
      expect(write).toHaveBeenCalledTimes(1);
      expect(jobs.size).toBe(0);
      await tick();
      expect(recovered.getSnapshot().state.hero.stamina).toBe(14);
      const restored = journey(recovered.toSave());
      expect(restored.getSnapshot().resting).toBe(false);
      expect(restored.getSnapshot().state.hero.stamina).toBe(14);
      expect(() => recovered.dispatch({ type: 'TRAVEL_TO', ...stoppedPosition })).not.toThrow();
    },
  );

  it('keeps Stop available after a failed tick and retries the same saved recovery without restarting', async () => {
    const { host, storage, tick, jobs } = await hosted();
    host.toggleRest();
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    await tick();
    expect(host.getSnapshot().retryAvailable).toBe(true);
    expect(host.getSnapshot().session!.getSnapshot().state.hero.stamina).toBe(4);
    expect(jobs.size).toBe(0);
    expect(host.toggleRest()).toBe(true);
    expect(host.getSnapshot().session!.getSnapshot().resting).toBe(false);
    expect(await host.retryProgression()).toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
    expect(JSON.parse(write.mock.calls[0][0].payload).campaign).toEqual(
      JSON.parse(write.mock.calls[1][0].payload).campaign,
    );
    expect(host.getSnapshot().session!.getSnapshot()).toMatchObject({
      resting: false,
      state: { hero: { stamina: 14 } },
    });
    expect(jobs.size).toBe(0);
  });

  it('stops an in-flight recovery without discarding or duplicating that tick', async () => {
    const { host, storage, tick, jobs, settle } = await hosted();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(storage, 'write').mockImplementation(async () => gate);
    host.toggleRest();
    await tick();
    expect(host.getSnapshot().busy).toBe(true);
    expect(host.toggleRest()).toBe(true);
    release();
    await settle();
    expect(host.getSnapshot().session!.getSnapshot()).toMatchObject({
      resting: false,
      state: { hero: { stamina: 14 } },
    });
    expect(jobs.size).toBe(0);
  });

  it('cleans up scheduled recovery on exit and disposal, with no offline catch-up', async () => {
    const { host, jobs, tick, unsubscribe } = await hosted();
    host.toggleRest();
    expect(await host.flushForExit()).toBe(true);
    expect(jobs.size).toBe(0);
    host.toggleRest();
    expect(jobs.size).toBe(1);
    unsubscribe();
    expect(jobs.size).toBe(0);
    await tick();
    expect(host.getSnapshot().session).toBeUndefined();
  });
});
