import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { addItem, removeOwnedItem, dropOwnedItem, validateHero } from '../../engine/rpg/Character';
import { JourneySession } from '../../game/JourneySession';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';
import type { GameCommand } from '../../engine/commands';

const content = loadGameContent(),
  cleanups: (() => void)[] = [],
  sessions: JourneySession[] = [];
function state() {
  const session = new JourneySession(content);
  sessions.push(session);
  const saved = session.toSave();
  addItem(saved.hero, 'short-bow', 1, content);
  addItem(saved.hero, 'iron-blade', 1, content);
  addItem(saved.hero, 'arrow', 2, content);
  saved.hero.equipment.weapon = 'weapon-1';
  return saved;
}
async function settle() {
  for (let i = 0; i < 100; i++) await Promise.resolve();
}
async function hosted(equipped = false) {
  const saved = state();
  if (equipped) saved.hero.equipment.secondaryHand = 'arrow';
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
  await host.flush();
  return { host, storage, rows };
}
beforeEach(() => vi.useFakeTimers());
afterEach(async () => {
  cleanups.splice(0).forEach((c) => c());
  sessions.splice(0).forEach((s) => s.dispose());
  await settleJourneySaves();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('secondary-hand ammunition ownership and saves', () => {
  it('migrates v11 with arrows unequipped and preserves every previous campaign field', () => {
    const saved = state();
    Object.assign(saved.hero, { health: 20, mana: 3, stamina: 4, wounds: 5, fullness: 60 });
    const migrated = parseSave(
      { version: 11, savedAt: '2026-10-02T12:00:00.000Z', campaign: saved },
      content,
    );
    expect(migrated.version).toBe(12);
    expect(migrated.campaign).toEqual(saved);
    expect(migrated.campaign.hero.equipment.secondaryHand).toBeUndefined();
    expect(parseSave(JSON.parse(encodeSave(migrated.campaign, content)), content).campaign).toEqual(
      saved,
    );
  });
  it('round-trips equipped ammunition, rejects corrupt ownership and future saves', () => {
    const saved = state();
    saved.hero.equipment.secondaryHand = 'arrow';
    expect(parseSave(JSON.parse(encodeSave(saved, content)), content).campaign).toEqual(saved);
    for (const patch of [
      { equipment: { secondaryHand: 'arrow' } },
      { equipment: { weapon: 'weapon-2', secondaryHand: 'arrow' } },
      { equipment: { weapon: 'weapon-1', secondaryHand: 'potion' } },
      { inventory: { potion: 2 } },
    ])
      expect(() => validateHero({ ...saved.hero, ...patch }, content)).toThrow();
    expect(() =>
      parseSave({ version: 13, savedAt: '2026-10-02T12:00:00.000Z', campaign: saved }, content),
    ).toThrow();
  });
  it('rejects invalid equip commands with frozen checkpoint, ECS and RNG unchanged', () => {
    const saved = state(),
      journey = new JourneySession(content, saved);
    sessions.push(journey);
    const before = journey.getSnapshot(),
      entity = structuredClone(journey.engine.getEntity('player'));
    for (const command of [
      { type: 'EQUIP_AMMUNITION', itemId: 'potion' },
      { type: 'EQUIP_AMMUNITION', itemId: 'missing' },
      { type: 'EQUIP_AMMUNITION', itemId: '' },
      { type: 'UNEQUIP_ITEM', slot: 'invalid' },
    ] as unknown as GameCommand[]) {
      expect(() => journey.dispatch(command)).toThrow();
      expect(journey.getSnapshot()).toBe(before);
      expect(journey.engine.random.snapshot()).toEqual(before.state.randomState);
      expect(journey.engine.getEntity('player')).toEqual(entity);
    }
    journey.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' });
    expect(() => journey.dispatch({ type: 'EQUIP_AMMUNITION', itemId: 'arrow' })).toThrow(
      'Equip a bow',
    );
  });
  it('protects equipped arrows from dropping, selling, offering and deliveries; swapping or removing the bow frees them', () => {
    const saved = state(),
      journey = new JourneySession(content, saved);
    sessions.push(journey);
    journey.dispatch({ type: 'EQUIP_AMMUNITION', itemId: 'arrow' });
    const before = journey.getSnapshot(),
      hero = journey.toSave().hero;
    expect(Object.isFrozen(before.state.hero.equipment)).toBe(true);
    expect(() => removeOwnedItem(hero, { itemId: 'arrow' }, 1)).toThrow();
    expect(() => dropOwnedItem(hero, { itemId: 'arrow' }, 1, content)).toThrow();
    expect(() =>
      journey.dispatch({ type: 'DROP_ITEM', item: { itemId: 'arrow' }, quantity: 1 }),
    ).toThrow();
    expect(journey.getSnapshot()).toBe(before);
    journey.dispatch({ type: 'EQUIP_WEAPON', weaponId: 'weapon-2' });
    expect(journey.getSnapshot().state.hero.equipment.secondaryHand).toBeUndefined();
    expect(before.state.hero.equipment.secondaryHand).toBe('arrow');
    expect(journey.getSnapshot().state.hero.inventory.arrow).toBe(2);
    journey.dispatch({ type: 'EQUIP_WEAPON', weaponId: 'weapon-1' });
    journey.dispatch({ type: 'EQUIP_AMMUNITION', itemId: 'arrow' });
    journey.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' });
    expect(journey.getSnapshot().state.hero.equipment).toEqual({});
  });
  it('retries the exact equipped candidate without publishing early, consuming supplies, healing, or drawing RNG', async () => {
    const { host, storage, rows } = await hosted();
    const initial = host.getSnapshot().session!,
      before = initial.getSnapshot();
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.progress({ type: 'EQUIP_AMMUNITION', itemId: 'arrow' })).toBe(false);
    expect(initial.getSnapshot()).toBe(before);
    expect(host.getSnapshot().retryAvailable).toBe(true);
    expect(() => initial.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' })).toThrow(
      'Save pending',
    );
    expect(await host.retryProgression()).toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
    const first = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(first);
    expect(first).toEqual({
      ...initial.toSave(),
      hero: { ...initial.toSave().hero, equipment: { weapon: 'weapon-1', secondaryHand: 'arrow' } },
    });
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign).toEqual(first);
  });
  it.each(['victory', 'defeat'] as const)(
    'isolates spent arrows until %s settles, and retries the same result exactly once',
    async (result) => {
      const { host, storage } = await hosted(true);
      const initial = host.getSnapshot().session!;
      initial.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
      initial.dispatch({ type: 'INTERACT', objectId: 'east' });
      initial.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
      await host.flush();
      const battle = host.getSnapshot().battle!,
        checkpoint = initial.toSave();
      expect(await host.progress({ type: 'EQUIP_AMMUNITION', itemId: 'arrow' })).toBe(false);
      const player = battle.engine.getEntity('player')!,
        enemy = battle.engine.getEntity('slime-1')!;
      player.inventory!.arrow = 1;
      vi.spyOn(battle.engine.random, 'chance').mockReturnValue(true);
      if (result === 'victory') enemy.health!.current = 1;
      else {
        enemy.health = { current: 1000, max: 1000 };
        player.health!.current = 1;
        Object.assign(enemy.combatant!, { attack: 1000, minDamage: 1000, maxDamage: 1000 });
      }
      battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
      battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
      battle.dispatch({ type: 'CONFIRM_ACTION' });
      if (result === 'defeat') battle.advanceEnemyTurns();
      expect(battle.combat.result).toBe(result);
      expect(player.inventory!.arrow).toBeUndefined();
      expect(initial.toSave()).toEqual(checkpoint);
      const restarted = new JourneySession(content, checkpoint);
      sessions.push(restarted);
      const freshBattle = restarted.createBattle();
      expect(freshBattle.engine.getEntity('player')!.inventory!.arrow).toBe(2);
      expect(freshBattle.engine.getEntity('player')!.ammunitionItemId).toBe('arrow');
      freshBattle.dispose();
      const random = battle.engine.random.snapshot();
      const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
      expect(await host.returnFromBattle([])).toBe(false);
      expect(initial.toSave()).toEqual(checkpoint);
      expect(await host.retryProgression()).toBe(true);
      expect(write).toHaveBeenCalledTimes(2);
      expect(JSON.parse(write.mock.calls[0][0].payload).campaign).toEqual(
        JSON.parse(write.mock.calls[1][0].payload).campaign,
      );
      const committed = host.getSnapshot().session!.getSnapshot().state.hero;
      expect(committed.inventory.arrow).toBeUndefined();
      expect(committed.equipment.secondaryHand).toBeUndefined();
      expect(committed.weapons['weapon-1'].durability).toBe(39);
      expect(battle.engine.random.snapshot()).toEqual(random);
    },
  );
});
