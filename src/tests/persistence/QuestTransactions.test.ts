import { cloneData } from '../../engine/cloneData';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { JourneySession } from '../../game/JourneySession';
import { addItem } from '../../engine/rpg/Character';
import { acceptQuest, reconcileQuests } from '../../engine/rpg/Quests';
import { learnSkill } from '../../engine/rpg/Skills';
import { encodeSave, parseSave, type CampaignState } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';
import type { ProgressionCommand } from '../../engine/commands';

const content = loadGameContent(),
  main = content.data.quests[0],
  seal = content.data.quests[1],
  side = content.data.quests[2];
const cleanups: (() => void)[] = [];
async function settle() {
  for (let i = 0; i < 80; i++) await Promise.resolve();
}
function state() {
  const session = new JourneySession(content);
  const saved = session.toSave();
  session.dispose();
  return saved;
}
async function hostWith(saved = state()) {
  const rows = new Map<string, SaveRow>();
  rows.set('auto', {
    id: 'auto',
    savedAt: new Date().toISOString(),
    payload: encodeSave(saved, content),
  });
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
  await settle();
  return { host, storage, rows };
}
function serviceState(worldId: string, objectId: string, edit?: (s: CampaignState) => void) {
  const saved = state(),
    world = content.data.worlds.find((w) => w.id === worldId)!,
    object = world.objects.find((o) => o.id === objectId)!;
  saved.worldId = world.id;
  saved.position = { x: object.x, y: object.y + 1 };
  saved.hero.gold = 100;
  edit?.(saved);
  return saved;
}
async function open(host: JourneyHost, objectId: string) {
  host.getSnapshot().session!.dispatch({ type: 'INTERACT', objectId });
  await host.flush();
}
afterEach(async () => {
  cleanups.splice(0).forEach((c) => c());
  await settle();
  await settleJourneySaves();
  vi.restoreAllMocks();
});

describe('saved quest acceptance and item delivery', () => {
  it('persists automatic availability reconciled on load without awarding a milestone reward', async () => {
    const saved = state();
    saved.hero = cloneData(learnSkill(saved.hero, 'sword-mastery', content));
    saved.hero.learnedSkills['sword-mastery'].rank = 'E';
    saved.hero.ap = 11;
    const { host, rows } = await hostWith(saved);
    expect(host.getSnapshot().session!.toSave().hero.quests['sword-milestone'].status).toBe(
      'available',
    );
    await host.flush();
    const recorded = parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign;
    expect(recorded.hero.quests['sword-milestone'].status).toBe('available');
    expect(recorded.hero.ap).toBe(11);
  });
  it('retains the accepted candidate on a failed save and starts objectives exactly once after retry', async () => {
    const { host, storage, rows } = await hostWith();
    await open(host, 'keeper');
    const initial = host.getSnapshot().session!,
      before = initial.toSave();
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(
      await host.progress({ type: 'ACCEPT_QUEST', questId: main.id, objectId: 'keeper' }),
    ).toBe(false);
    expect(initial.toSave()).toEqual(before);
    expect(host.getSnapshot().retryAvailable).toBe(true);
    expect(() => initial.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow(
      'Save pending',
    );
    const first = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(first.hero.quests[main.id].status).toBe('active');
    expect(await host.retryProgression()).toBe(true);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(first);
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign).toEqual(first);
    expect(
      await host.progress({ type: 'ACCEPT_QUEST', questId: main.id, objectId: 'keeper' }),
    ).toBe(false);
  });
  it('saves consumed inputs, rewards and receipt together and handles a write that succeeds before reporting failure', async () => {
    const saved = serviceState('healer-interior', 'healer-keeper');
    reconcileQuests(saved.hero, content, side.offerNpc);
    saved.hero = cloneData(acceptQuest(saved.hero, side, content));
    addItem(saved.hero, 'apple', 3, content);
    const { host, storage, rows } = await hostWith(saved);
    await open(host, 'healer-keeper');
    const initial = host.getSnapshot().session!,
      before = initial.toSave();
    const original = storage.write;
    const write = vi.spyOn(storage, 'write').mockImplementationOnce(async (row) => {
      await original(row);
      throw new Error('Connection interrupted after write');
    });
    expect(
      await host.progress({ type: 'CLAIM_QUEST', questId: side.id, objectId: 'healer-keeper' }),
    ).toBe(false);
    expect(initial.toSave()).toEqual(before);
    expect(host.getSnapshot().retryAvailable).toBe(true);
    const written = parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign;
    expect(written.hero).toMatchObject({
      gold: 110,
      experience: 5,
      inventory: { apple: 1, potion: 3 },
      quests: { [side.id]: { status: 'completed', claimId: `quest/${side.id}/once` } },
    });
    expect(await host.retryProgression()).toBe(true);
    expect(host.getSnapshot().session!.toSave()).toEqual(written);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(written);
    expect(await host.retryProgression()).toBe(false);
    expect(
      await host.progress({ type: 'CLAIM_QUEST', questId: side.id, objectId: 'healer-keeper' }),
    ).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
    const reloaded = new JourneySession(content, written);
    expect(reloaded.toSave().hero.quests[side.id].status).toBe('completed');
    reloaded.dispose();
  });
  it('does not write or consume delivery inputs when rewards exceed capacity', async () => {
    const saved = serviceState('healer-interior', 'healer-keeper');
    reconcileQuests(saved.hero, content, side.offerNpc);
    saved.hero = cloneData(acceptQuest(saved.hero, side, content));
    addItem(saved.hero, 'apple', 2, content);
    saved.hero.inventory.potion = 999;
    const { host, storage } = await hostWith(saved);
    await open(host, 'healer-keeper');
    const before = host.getSnapshot().session!.toSave();
    const write = vi.spyOn(storage, 'write');
    expect(
      await host.progress({ type: 'CLAIM_QUEST', questId: side.id, objectId: 'healer-keeper' }),
    ).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(host.getSnapshot().session!.toSave()).toEqual(before);
    expect(host.getSnapshot().retryAvailable).not.toBe(true);
  });
});

describe('durable shops and offerings', () => {
  const cases: {
    name: string;
    world: string;
    object: string;
    command: ProgressionCommand;
    edit?: (s: CampaignState) => void;
    check(s: CampaignState): void;
  }[] = [
    {
      name: 'purchase',
      world: 'grocery-interior',
      object: 'grocery-keeper',
      command: { type: 'BUY_ITEM', objectId: 'grocery-keeper', itemId: 'bread', quantity: 2 },
      check(s) {
        expect(s.hero).toMatchObject({ gold: 92, inventory: { bread: 2 } });
      },
    },
    {
      name: 'sale',
      world: 'general-interior',
      object: 'general-keeper',
      command: {
        type: 'SELL_ITEM',
        objectId: 'general-keeper',
        item: { itemId: 'potion' },
        quantity: 1,
      },
      check(s) {
        expect(s.hero).toMatchObject({ gold: 105, inventory: { potion: 1 } });
      },
    },
    {
      name: 'repair',
      world: 'blacksmith-interior',
      object: 'blacksmith-keeper',
      command: { type: 'REPAIR_WEAPON', objectId: 'blacksmith-keeper', weaponId: 'weapon-1' },
      edit(s) {
        addItem(s.hero, 'iron-blade', 1, content);
        s.hero.equipment.weapon = 'weapon-1';
        s.hero.weapons['weapon-1'].durability = 30;
      },
      check(s) {
        expect(s.hero).toMatchObject({
          gold: 92,
          weapons: { 'weapon-1': { durability: 60 } },
          equipment: { weapon: 'weapon-1' },
        });
      },
    },
    {
      name: 'healing',
      world: 'healer-interior',
      object: 'healer-keeper',
      command: { type: 'HEAL', objectId: 'healer-keeper' },
      edit(s) {
        s.hero.health = 10;
        s.hero.mana = 1;
        s.hero.stamina = 1;
        s.hero.wounds = 20;
        s.hero.fullness = 50;
      },
      check(s) {
        expect(s.hero).toMatchObject({
          gold: 90,
          health: 118,
          mana: 98,
          stamina: 113,
          wounds: 0,
          fullness: 100,
        });
      },
    },
    {
      name: 'offering',
      world: 'refuge',
      object: 'dungeon-entrance',
      command: { type: 'OFFER_ITEM', objectId: 'dungeon-entrance', item: { itemId: 'potion' } },
      check(s) {
        expect(s.hero.inventory.potion).toBe(1);
        expect(s.dungeon?.blueprint.definitionId).toBe('moss-depths');
      },
    },
  ];
  it.each(cases)(
    'retries a $name with identical items/gold/RNG and blocks direct bypasses',
    async ({ world, object, command, edit, check }) => {
      const { host, storage } = await hostWith(serviceState(world, object, edit));
      await open(host, object);
      const initial = host.getSnapshot().session!,
        before = initial.toSave();
      expect(() => initial.dispatch(command)).toThrow('host');
      expect(() => initial.engine.dispatch(command)).toThrow('host');
      const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
      expect(await host.progress(command)).toBe(false);
      expect(initial.toSave()).toEqual(before);
      const first = JSON.parse(write.mock.calls[0][0].payload).campaign;
      check(first);
      expect(await host.retryProgression()).toBe(true);
      expect(host.getSnapshot().session!.toSave()).toEqual(first);
      expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(first);
      expect(write).toHaveBeenCalledTimes(2);
      if (command.type !== 'OFFER_ITEM') expect(first.randomState).toEqual(before.randomState);
    },
  );
  it('revalidates stale NPC confirmation after moving', async () => {
    const { host, storage } = await hostWith(serviceState('grocery-interior', 'grocery-keeper'));
    await open(host, 'grocery-keeper');
    const session = host.getSnapshot().session!;
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: 0, dy: 1 });
    await host.flush();
    const before = session.toSave(),
      write = vi.spyOn(storage, 'write');
    expect(
      await host.progress({
        type: 'BUY_ITEM',
        objectId: 'grocery-keeper',
        itemId: 'bread',
        quantity: 1,
      }),
    ).toBe(false);
    expect(session.toSave()).toEqual(before);
    expect(write).not.toHaveBeenCalled();
  });
});

describe('durable completed-encounter quest evidence', () => {
  it.each(['victory', 'defeat'] as const)(
    'banks %s practice with resources and loot once, and discards an unfinished attempt on reload',
    async (result) => {
      const saved = state();
      saved.hero = cloneData(learnSkill(saved.hero, 'smash', content));
      addItem(saved.hero, 'iron-blade', 1, content);
      saved.hero.equipment.weapon = 'weapon-1';
      saved.hero.quests[main.id] = {
        status: 'completed',
        stageId: 'bring-provisions',
        counts: { 'grocery-visit': 1 },
        claimId: `quest/${main.id}/once`,
      };
      reconcileQuests(saved.hero, content);
      saved.hero = cloneData(acceptQuest(saved.hero, seal, content));
      const { host, storage } = await hostWith(saved),
        session = host.getSnapshot().session!;
      session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
      session.dispatch({ type: 'INTERACT', objectId: 'east' });
      session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
      await host.flush();
      const checkpoint = session.toSave(),
        battle = host.getSnapshot().battle!,
        player = battle.engine.getEntity('player')!,
        enemy = battle.engine.getEntity('slime-1')!;
      vi.spyOn(battle.engine.random, 'chance').mockReturnValue(true);
      if (result === 'victory') enemy.health!.current = 1;
      else {
        player.health!.current = 1;
        Object.assign(enemy.combatant!, { attack: 1000, minDamage: 1000, maxDamage: 1000 });
      }
      battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'smash' });
      battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
      battle.dispatch({ type: 'CONFIRM_ACTION' });
      expect(battle.quests.snapshot()[seal.id].counts['practice-smash']).toBe(1);
      expect(session.toSave().hero.quests[seal.id].counts).toEqual({});
      const restart = new JourneySession(content, checkpoint),
        fresh = restart.createBattle();
      expect(fresh.quests.snapshot()).toEqual({});
      fresh.dispose();
      restart.dispose();
      if (result === 'defeat') battle.advanceEnemyTurns();
      expect(battle.combat.result).toBe(result);
      const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
      expect(await host.returnFromBattle()).toBe(false);
      expect(session.toSave()).toEqual(checkpoint);
      const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
      expect(candidate.hero.quests[seal.id].counts['practice-smash']).toBe(1);
      expect(candidate.hero.learnedSkills.smash.objectiveCounts.uses).toBe(1);
      expect(await host.retryProgression()).toBe(true);
      expect(host.getSnapshot().session!.toSave()).toEqual(candidate);
      expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
      expect(await host.returnFromBattle()).toBe(false);
    },
  );
});
