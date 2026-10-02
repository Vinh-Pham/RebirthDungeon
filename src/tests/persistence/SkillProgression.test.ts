import { cloneData } from '../../engine/cloneData';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { JourneyHost } from '../../game/JourneyHost';
import { JourneySession } from '../../game/JourneySession';
import { learnSkill } from '../../engine/rpg/Skills';
import { addItem } from '../../engine/rpg/Character';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';
const content = loadGameContent();
const cleanups: (() => void)[] = [];
function memory(rows = new Map<string, SaveRow>()): SaveStorage {
  return {
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
}
async function settle() {
  for (let i = 0; i < 80; i++) await Promise.resolve();
}
async function speakToInstructor(host: JourneyHost) {
  const session = host.getSnapshot().session!;
  session.dispatch({ type: 'TRAVEL_TO', x: 12, y: 4 });
  session.dispatch({ type: 'INTERACT', objectId: 'combat-instructor' });
  await host.flush();
}
function savedState() {
  const session = new JourneySession(content);
  const state = session.toSave();
  session.dispose();
  return state;
}
async function hostWith(state = savedState()) {
  const rows = new Map<string, SaveRow>();
  rows.set('auto', {
    id: 'auto',
    savedAt: new Date().toISOString(),
    payload: encodeSave(state, content),
  });
  const storage = memory(rows),
    host = new JourneyHost(content, async () => storage);
  cleanups.push(host.subscribe(vi.fn()));
  await settle();
  return { host, storage, rows };
}
afterEach(async () => {
  cleanups.splice(0).forEach((c) => c());
  await settle();
  vi.useRealTimers();
});
describe('durable character progression candidates', () => {
  it.each(['F', 'E'] as const)(
    'preserves an existing rank %s lesson, training and milestone across a version-10 upgrade',
    async (rank) => {
      const state = savedState();
      state.hero = cloneData(learnSkill(state.hero, 'smash', content));
      state.hero.learnedSkills.smash = {
        rank,
        objectiveCounts: rank === 'F' ? { uses: 7, hits: 2 } : {},
      };
      state.hero.claimedMilestones = ['intro-melee-lesson'];
      state.hero.ap = 17;
      const older = JSON.parse(encodeSave(state, content));
      older.version = 10;
      delete older.campaign.hero.itemHotbar;
      const migrated = parseSave(older, content).campaign;
      expect(migrated.hero.learnedSkills).toEqual(state.hero.learnedSkills);
      expect(migrated.hero.claimedMilestones).toEqual(state.hero.claimedMilestones);
      const { host } = await hostWith(migrated);
      await speakToInstructor(host);
      const before = host.getSnapshot().session!.toSave();
      expect(
        await host.progress({
          type: 'LEARN_SKILL',
          objectId: 'combat-instructor',
          skillId: 'smash',
        }),
      ).toBe(false);
      expect(host.getSnapshot().session!.toSave()).toEqual(before);
      expect(before.hero.ap).toBe(17);
    },
  );
  it('retains a previously claimed introductory milestone when learning at the new instructor', async () => {
    const state = savedState();
    state.hero.claimedMilestones = ['intro-melee-lesson'];
    const { host } = await hostWith(state);
    await speakToInstructor(host);
    const ap = host.getSnapshot().session!.getSnapshot().state.hero.ap;
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(true);
    expect(host.getSnapshot().session!.getSnapshot().state.hero.ap).toBe(ap);
  });

  it('validates instructor access and town-only learning, grants F and introductory AP exactly once', async () => {
    const { host, rows } = await hostWith();
    const before = host.getSnapshot().session!.toSave();
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'keeper', skillId: 'firebolt' }),
    ).toBe(false);
    expect(host.getSnapshot().session!.toSave()).toEqual(before);
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(false);
    expect(host.getSnapshot().session!.toSave()).toEqual(before);
    host.getSnapshot().session!.dispatch({ type: 'INTERACT', objectId: 'keeper' });
    expect(await host.progress({ type: 'LEARN_SKILL', objectId: 'keeper', skillId: 'smash' })).toBe(
      false,
    );
    await speakToInstructor(host);
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(true);
    const hero = host.getSnapshot().session!.toSave().hero;
    expect(hero).toMatchObject({
      ap: 8,
      claimedMilestones: ['intro-melee-lesson'],
      learnedSkills: { smash: { rank: 'F', objectiveCounts: {} } },
    });
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign.hero).toEqual(hero);
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(false);
    expect(host.getSnapshot().session!.toSave().hero).toEqual(hero);
    const session = host.getSnapshot().session!;
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    session.dispatch({ type: 'INTERACT', objectId: 'east' });
    expect(await host.progress({ type: 'RANK_UP_SKILL', skillId: 'smash' })).toBe(false);
    expect(host.getSnapshot().error).toContain('town');
  });
  it('retains a failed learning candidate, locks dependent mutations and retries without charging twice', async () => {
    const { host, storage } = await hostWith();
    await speakToInstructor(host);
    const initial = host.getSnapshot().session!;
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(false);
    const candidateBytes = write.mock.calls[0][0].payload;
    expect(host.getSnapshot()).toMatchObject({
      session: initial,
      busy: false,
      retryAvailable: true,
      error: 'Disk full',
    });
    expect(initial.toSave().hero.learnedSkills.smash).toBeUndefined();
    expect(() => initial.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow(
      'Save pending',
    );
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(false);
    expect(await host.flushForExit()).toBe(false);
    expect(await host.retryProgression()).toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(
      JSON.parse(candidateBytes).campaign,
    );
    expect(host.getSnapshot().session!.toSave().hero.ap).toBe(8);
    expect(host.getSnapshot().retryAvailable).toBe(false);
    expect(await host.retryProgression()).toBe(false);
  });
  it('keeps the last page, binding and completion intact until the whole assembled candidate saves', async () => {
    const state = savedState();
    addItem(state.hero, 'sword-manual-unfinished', 1, content);
    addItem(state.hero, 'sword-page-3', 1, content);
    state.hero.bookCollections['sword-manual'] = {
      insertedPages: ['sword-page-1', 'sword-page-2'],
      completed: false,
    };
    const { host, storage } = await hostWith(state);
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Offline'));
    expect(
      await host.progress({
        type: 'INSERT_SKILL_PAGE',
        recipeId: 'sword-manual',
        pageId: 'sword-page-3',
      }),
    ).toBe(false);
    expect(host.getSnapshot().session!.toSave().hero).toEqual(state.hero);
    expect(await host.retryProgression()).toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
    const hero = host.getSnapshot().session!.toSave().hero;
    expect(hero.inventory['sword-manual']).toBe(1);
    expect(hero.inventory['sword-page-3']).toBeUndefined();
    expect(hero.inventory['sword-manual-unfinished']).toBeUndefined();
    expect(hero.bookCollections['sword-manual'].completed).toBe(true);
    expect(await host.progress({ type: 'READ_SKILL_BOOK', itemId: 'sword-manual' })).toBe(true);
    expect(host.getSnapshot().session!.toSave().hero.learnedSkills['sword-mastery'].rank).toBe('F');
  });
  it('spends AP exactly once after successful retry and restores a manual slot as a whole', async () => {
    const state = savedState();
    state.hero = cloneData(learnSkill(state.hero, 'smash', content));
    state.hero.ap = 3;
    state.hero.learnedSkills.smash.objectiveCounts = { uses: 20, hits: 10, defeats: 1 };
    state.hero.health = 30;
    state.hero.mana = 2;
    state.hero.stamina = 4;
    const { host, storage } = await hostWith(state);
    await host.save('1');
    vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.progress({ type: 'RANK_UP_SKILL', skillId: 'smash' })).toBe(false);
    expect(host.getSnapshot().session!.toSave().hero.ap).toBe(3);
    expect(await host.retryProgression()).toBe(true);
    expect(host.getSnapshot().session!.toSave().hero).toMatchObject({
      ap: 0,
      health: 30,
      mana: 2,
      stamina: 4,
      learnedSkills: { smash: { rank: 'E', objectiveCounts: {} } },
    });
    await host.load('1');
    expect(host.getSnapshot().session!.toSave().hero).toEqual(state.hero);
  });
  it.each(['victory', 'defeat'] as const)(
    'atomically banks %s training with resources/rewards/pending-clear before dismissing battle',
    async (result) => {
      vi.useFakeTimers();
      const state = savedState();
      state.hero = cloneData(learnSkill(state.hero, 'smash', content));
      addItem(state.hero, 'iron-blade', 1, content);
      state.hero.equipment.weapon = 'weapon-1';
      const { host, storage, rows } = await hostWith(state);
      const session = host.getSnapshot().session!;
      session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
      session.dispatch({ type: 'INTERACT', objectId: 'east' });
      session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
      await host.flush();
      const checkpoint = session.toSave(),
        battle = host.getSnapshot().battle!,
        enemy = battle.engine.getEntity('slime-1')!;
      vi.spyOn(battle.engine.random, 'chance').mockReturnValue(true);
      if (result === 'victory') enemy.health!.current = 1;
      else {
        enemy.health = { current: 1000, max: 1000 };
        battle.engine.getEntity('player')!.health!.current = 1;
        Object.assign(enemy.combatant!, { attack: 1000, minDamage: 1000, maxDamage: 1000 });
      }
      battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'smash' });
      battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
      battle.dispatch({ type: 'CONFIRM_ACTION' });
      if (result === 'defeat') battle.advanceEnemyTurns();
      expect(battle.combat.result).toBe(result);
      const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
      expect(await host.returnFromBattle()).toBe(false);
      expect(host.getSnapshot().battle).toBe(battle);
      expect(session.toSave()).toEqual(checkpoint);
      const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
      expect(candidate.pending).toBeUndefined();
      expect(candidate.hero.learnedSkills.smash.objectiveCounts).toMatchObject({
        uses: 1,
        hits: 1,
      });
      expect(await host.retryProgression()).toBe(true);
      expect(host.getSnapshot().battle).toBeUndefined();
      expect(write).toHaveBeenCalledTimes(2);
      expect(host.getSnapshot().session!.toSave()).toEqual(candidate);
      expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign).toEqual(candidate);
      expect(await host.returnFromBattle()).toBe(false);
      expect(write).toHaveBeenCalledTimes(2);
    },
  );
  it('flushes earlier writes before critical candidates and blocks direct progression bypasses', async () => {
    vi.useFakeTimers();
    const { host, storage } = await hostWith();
    const session = host.getSnapshot().session!;
    expect(() =>
      session.dispatch({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toThrow('host');
    session.dispatch({ type: 'TRAVEL_TO', x: 12, y: 4 });
    session.dispatch({ type: 'INTERACT', objectId: 'combat-instructor' });
    const write = vi.spyOn(storage, 'write');
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(write.mock.calls[0][0].payload).campaign.hero.learnedSkills.smash,
    ).toBeUndefined();
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign.hero.learnedSkills.smash.rank).toBe(
      'F',
    );
  });
  it('publishes progression/AP events only after saving and never retries committed notification failures', async () => {
    const { host, storage } = await hostWith();
    await speakToInstructor(host);
    const initial = host.getSnapshot().session!;
    const events: string[] = [];
    const stop = host.subscribe(() => {
      const session = host.getSnapshot().session;
      if (session && session !== initial && !events.includes('attached')) {
        events.push('attached');
        session.engine.events.on('SKILL_LEARNED', () => {
          events.push('learned');
          throw new Error('Consumer failed');
        });
        session.engine.events.on('AP_CHANGED', () => {
          events.push('ap');
        });
      }
    });
    cleanups.push(stop);
    vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(
      await host.progress({ type: 'LEARN_SKILL', objectId: 'combat-instructor', skillId: 'smash' }),
    ).toBe(false);
    expect(events).toEqual([]);
    expect(await host.retryProgression()).toBe(true);
    expect(events).toEqual(['attached', 'learned', 'ap']);
    expect(host.getSnapshot().error).toContain('Progress saved');
    expect(host.getSnapshot().retryAvailable).toBe(false);
    expect(await host.retryProgression()).toBe(false);
    expect(host.getSnapshot().session!.toSave().hero.ap).toBe(8);
  });
  it('an audio refresh during a candidate write cannot schedule an older campaign over the committed result', async () => {
    vi.useFakeTimers();
    const { host, storage, rows } = await hostWith();
    await speakToInstructor(host);
    const initial = host.getSnapshot().session!;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalWrite = storage.write;
    const write = vi.spyOn(storage, 'write').mockImplementation(async (row) => {
      await gate;
      await originalWrite(row);
    });
    const saving = host.progress({
      type: 'LEARN_SKILL',
      objectId: 'combat-instructor',
      skillId: 'smash',
    });
    await settle();
    initial.setAudio({ enabled: true, music: 0.2, sfx: 0.3 });
    release();
    expect(await saving).toBe(true);
    await vi.advanceTimersByTimeAsync(500);
    expect(write).toHaveBeenCalledTimes(1);
    expect(
      parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign.hero.learnedSkills.smash
        .rank,
    ).toBe('F');
  });
  it('honors host generations when a critical save completes after unmount and another character starts', async () => {
    const { host, storage, rows } = await hostWith();
    await speakToInstructor(host);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalWrite = storage.write;
    vi.spyOn(storage, 'write').mockImplementation(async (row) => {
      await gate;
      await originalWrite(row);
    });
    const pending = host.progress({
      type: 'LEARN_SKILL',
      objectId: 'combat-instructor',
      skillId: 'smash',
    });
    await settle();
    cleanups.splice(0).forEach((c) => c());
    const other = await hostWith();
    release();
    expect(await pending).toBe(false);
    await settle();
    expect(other.host.getSnapshot().session!.toSave().hero.learnedSkills.smash).toBeUndefined();
    expect(
      parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign.hero.learnedSkills.smash
        .rank,
    ).toBe('F');
  });
});
