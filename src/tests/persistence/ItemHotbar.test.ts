import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { setItemHotbar } from '../../engine/rpg/Inventory';
import { validateHero } from '../../engine/rpg/Character';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';

const content = loadGameContent(),
  cleanups: (() => void)[] = [];
async function settle() {
  for (let i = 0; i < 100; i++) await Promise.resolve();
}
function state() {
  const session = new JourneySession(content);
  const result = session.toSave();
  session.dispose();
  return result;
}
async function setup() {
  const saved = state();
  saved.hero.health = 30;
  saved.hero.mana = 2;
  saved.hero.stamina = 4;
  const rows = new Map<string, SaveRow>([
    [
      'auto',
      { id: 'auto', savedAt: new Date().toISOString(), payload: encodeSave(saved, content) },
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
  await settle();
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
afterEach(async () => {
  cleanups.splice(0).forEach((c) => c());
  await settleJourneySaves();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('saved consumable hotbars', () => {
  it('migrates v10 without changing depleted resources, progression, RNG or pending encounter', () => {
    const session = new JourneySession(content);
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    session.dispatch({ type: 'INTERACT', objectId: 'east' });
    session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    const saved = session.toSave();
    session.dispose();
    Object.assign(saved.hero, { health: 30, mana: 2, stamina: 4, wounds: 10, fullness: 60 });
    const { itemHotbar, ...hero } = saved.hero;
    void itemHotbar;
    const migrated = parseSave(
      { version: 10, savedAt: '2026-10-02T12:00:00.000Z', campaign: { ...saved, hero } },
      content,
    );
    expect(migrated.version).toBe(12);
    expect(migrated.campaign).toEqual(saved);
    expect(
      parseSave(JSON.parse(encodeSave(migrated.campaign, content, migrated.savedAt)), content),
    ).toEqual(migrated);
  });
  it('rejects non-battle supplies, unknown, duplicate and malformed slots; depletion remains valid', () => {
    const saved = state();
    saved.hero.inventory.apple = 1;
    for (const id of ['apple', 'iron-blade', 'unknown', 'mana-potion']) {
      const before = structuredClone(saved.hero);
      expect(() => setItemHotbar(saved.hero, id, true, content)).toThrow();
      expect(saved.hero).toEqual(before);
    }
    for (const itemHotbar of [['potion', 'potion'], ['apple'], ['unknown']])
      expect(() => validateHero({ ...saved.hero, itemHotbar }, content)).toThrow();
    setItemHotbar(saved.hero, 'potion', true, content);
    setItemHotbar(saved.hero, 'potion', true, content);
    expect(saved.hero.itemHotbar).toEqual(['potion']);
    delete saved.hero.inventory.potion;
    expect(validateHero(saved.hero, content).itemHotbar).toEqual(['potion']);
    setItemHotbar(saved.hero, 'potion', false, content);
    expect(saved.hero.itemHotbar).toEqual([]);
  });
  it('durably adds/removes without consuming, healing or granting progression; manual saves restore slots', async () => {
    const { host, rows } = await setup();
    const before = host.getSnapshot().session!.toSave();
    expect(await host.progress({ type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true })).toBe(
      true,
    );
    const assigned = { ...before, hero: { ...before.hero, itemHotbar: ['potion'] } };
    expect(host.getSnapshot().session!.toSave()).toEqual(assigned);
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign).toEqual(assigned);
    await host.save('1');
    expect(
      await host.progress({ type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: false }),
    ).toBe(true);
    expect(host.getSnapshot().session!.toSave()).toEqual(before);
    await host.load('1');
    expect(host.getSnapshot().session!.toSave()).toEqual(assigned);
    expect(() =>
      host
        .getSnapshot()
        .session!.dispatch({ type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: false }),
    ).toThrow('host');
  });
  it('retains failed battle assignments for exact retry without resetting the live encounter or banking its gains', async () => {
    vi.useFakeTimers();
    const { host, storage } = await setup(),
      battle = await enterBattle(host);
    const initial = host.getSnapshot().session!,
      checkpoint = initial.toSave(),
      player = battle.engine.getEntity('player')!;
    // Uncommitted battle state must survive a configuration save but never enter the checkpoint.
    player.health!.current = 10;
    player.inventory!.potion = 1;
    const before = structuredClone(player),
      random = battle.engine.random.snapshot(),
      view = battle.getSnapshot();
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.progress({ type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true })).toBe(
      false,
    );
    expect(host.getSnapshot()).toMatchObject({ session: initial, battle, retryAvailable: true });
    expect(player).toEqual(before);
    expect(initial.toSave()).toEqual(checkpoint);
    expect(battle.canAcceptPlayerInput(0)).toBe(false);
    expect(() => battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' })).toThrow(
      'Save pending',
    );
    expect(await host.retryProgression()).toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
    const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
    expect(candidate).toEqual({
      ...checkpoint,
      hero: { ...checkpoint.hero, itemHotbar: ['potion'] },
    });
    expect(host.getSnapshot().battle).toBe(battle);
    expect(player).toEqual({ ...before, itemHotbar: ['potion'] });
    expect(battle.engine.random.snapshot()).toEqual(random);
    expect(battle.getSnapshot().actionCount).toBe(view.actionCount);
    expect(battle.training.snapshot()).toEqual({});
    expect(battle.canAcceptPlayerInput(0)).toBe(true);
    expect(battle.selectPlayerAction({ action: 'item', itemId: 'potion' }, 0)).toBe(true);
    delete player.inventory!.potion;
    expect(await host.progress({ type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true })).toBe(
      false,
    );
    expect(host.getSnapshot().error).toContain('inventory');
    expect(
      await host.progress({ type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: false }),
    ).toBe(true);
    expect(host.getSnapshot().battle).toBe(battle);
    expect(player.itemHotbar).toEqual([]);
    const restored = new JourneySession(content, host.getSnapshot().session!.toSave());
    const restarted = restored.createBattle();
    expect(restarted.engine.getEntity('player')!.inventory).toEqual(checkpoint.hero.inventory);
    expect(restarted.engine.getEntity('player')!.health!.current).toBe(checkpoint.hero.health);
    expect(restarted.engine.getEntity('player')!.itemHotbar).toEqual([]);
    restarted.dispose();
    restored.dispose();
  });
  it('banks item consumption with the encounter result only after its durable retry succeeds', async () => {
    vi.useFakeTimers();
    const { host, storage } = await setup();
    expect(await host.progress({ type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true })).toBe(
      true,
    );
    const battle = await enterBattle(host),
      checkpoint = host.getSnapshot().session!.toSave();
    const player = battle.engine.getEntity('player')!,
      enemy = battle.engine.getEntity('slime-1')!;
    battle.selectPlayerAction({ action: 'item', itemId: 'potion' }, 0);
    expect(player.inventory!.potion).toBe(checkpoint.hero.inventory.potion - 1);
    expect(host.getSnapshot().session!.toSave()).toEqual(checkpoint);
    battle.advanceEnemyTurns();
    await vi.runAllTimersAsync();
    enemy.health!.current = 1;
    vi.spyOn(battle.engine.random, 'chance').mockReturnValue(true);
    expect(
      battle.executePlayerAction({ action: 'attack' }, enemy.id, battle.combat.completedActions),
    ).toBe(true);
    expect(battle.combat.result).toBe('victory');
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.returnFromBattle([])).toBe(false);
    expect(host.getSnapshot().session!.toSave()).toEqual(checkpoint);
    expect(await host.retryProgression()).toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
    const saved = host.getSnapshot().session!.toSave();
    expect(saved.pending).toBeUndefined();
    expect(saved.hero.itemHotbar).toEqual(['potion']);
    expect(saved.hero.inventory.potion).toBe(checkpoint.hero.inventory.potion - 1);
    expect(JSON.parse(write.mock.calls[0][0].payload).campaign).toEqual(saved);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(saved);
  });
});
