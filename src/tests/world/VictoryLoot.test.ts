import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { JourneySession } from '../../game/JourneySession';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import type { BattleSession } from '../../game/BattleSession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';

const content = loadGameContent();
const journeys: JourneySession[] = [],
  battles: BattleSession[] = [],
  cleanups: (() => void)[] = [];
afterEach(async () => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  await settleJourneySaves();
  battles.splice(0).forEach((battle) => battle.dispose());
  journeys.splice(0).forEach((journey) => journey.dispose());
  vi.restoreAllMocks();
});
function dropsContent(twoEnemies = false) {
  const raw = structuredClone(content.data),
    slime = raw.enemies.find((enemy) => enemy.id === 'slime')!;
  slime.gold = 0;
  slime.loot = ['potion', 'bread', 'iron-blade', 'moss-mail'].map((itemId) => ({
    itemId,
    chance: 1,
    min: 1,
    max: 1,
  }));
  if (twoEnemies)
    raw.maps
      .find((map) => map.id === 'chamber')!
      .spawns.push({ entityId: 'slime-2', kind: 'enemy', definitionId: 'slime', x: 7, y: 2 });
  return new ContentRegistry(raw);
}
function start(registry = content, saved?: ReturnType<JourneySession['toSave']>) {
  const journey = new JourneySession(registry, saved);
  journeys.push(journey);
  journey.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
  journey.dispatch({ type: 'INTERACT', objectId: 'east' });
  journey.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
  const battle = journey.createBattle();
  battles.push(battle);
  return { journey, battle };
}
function kill(battle: BattleSession, targetId: string) {
  const player = battle.engine.getEntity('player')!;
  player.combatant!.hitChance = 1;
  player.combatant!.attack = 10000;
  battle.engine.getEntity(targetId)!.health!.current = 1;
  battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
  battle.dispatch({ type: 'SELECT_TARGET', targetId });
  battle.dispatch({ type: 'CONFIRM_ACTION' });
}
function win(battle: BattleSession) {
  while (!battle.combat.result) {
    if (battle.battle.phase === 'enemyTurn') battle.advanceEnemyTurns();
    else kill(battle, battle.battle.validTargetIds({ action: 'attack' })[0]);
  }
  expect(battle.combat.result).toBe('victory');
}
async function settle() {
  for (let i = 0; i < 80; i++) await Promise.resolve();
}

describe('victory loot selection', () => {
  it('waits for every monster and previews detached, stable rewards without changing the campaign or RNG', () => {
    const { journey, battle } = start(dropsContent(true));
    const before = journey.toSave();
    expect(() => journey.previewVictoryLoot(battle)).toThrow('not ready');
    kill(battle, 'slime-1');
    expect(battle.combat.result).toBeUndefined();
    expect(() => journey.previewVictoryLoot(battle)).toThrow('not ready');
    battle.advanceEnemyTurns();
    kill(battle, 'slime-2');
    const loot = journey.previewVictoryLoot(battle);
    expect(loot).toEqual({
      gold: 5,
      experience: 48,
      items: ['potion', 'bread', 'iron-blade', 'moss-mail'].map((itemId) => ({
        itemId,
        quantity: 2,
        collectable: 2,
      })),
    });
    expect(journey.previewVictoryLoot(battle)).toEqual(loot);
    loot.items[0].quantity = 999;
    loot.gold = 999;
    expect(journey.previewVictoryLoot(battle).gold).toBe(5);
    expect(journey.previewVictoryLoot(battle).items[0].quantity).toBe(2);
    expect(journey.toSave()).toEqual(before);
    expect(journey.engine.random.snapshot()).toEqual(before.randomState);
  });
  it('defaults to all drops and allocates weapon and armor copies only on confirmation', () => {
    const { journey, battle } = start(dropsContent(true));
    win(battle);
    const loot = journey.previewVictoryLoot(battle);
    expect(journey.toSave().hero.weapons).toEqual({});
    journey.finishBattle(battle);
    const hero = journey.toSave().hero;
    expect(hero).toMatchObject({
      gold: loot.gold,
      inventory: { potion: 4, bread: 2 },
      nextWeaponId: 3,
      nextArmorId: 3,
    });
    expect(Object.values(hero.weapons)).toHaveLength(2);
    expect(Object.values(hero.armors)).toHaveLength(2);
    expect(journey.toSave().pending).toBeUndefined();
    expect(() => journey.finishBattle(battle)).toThrow('not ready');
    expect(() => journey.previewVictoryLoot(battle)).toThrow('not ready');
  });
  it('takes only the selected stacks, while gold, XP and consumed battle items still apply', () => {
    const { journey, battle } = start(dropsContent());
    win(battle);
    battle.engine.getEntity('player')!.inventory!.potion = 1;
    const loot = journey.previewVictoryLoot(battle);
    journey.finishBattle(battle, ['iron-blade']);
    expect(journey.toSave().hero).toMatchObject({
      gold: 5,
      level: 1,
      experience: 24,
      inventory: { potion: 1 },
      nextWeaponId: 2,
      armors: {},
    });
    expect(journey.toSave().hero.inventory.bread).toBeUndefined();
    expect(Object.values(journey.toSave().hero.weapons)).toEqual([
      { itemId: 'iron-blade', durability: 60 },
    ]);
    expect(loot.experience).toBe(24);
  });
  it('allows leaving every item behind and still awards a positive gold reward without any item drops', () => {
    const { journey, battle } = start(dropsContent());
    win(battle);
    journey.finishBattle(battle, []);
    expect(journey.toSave().hero).toMatchObject({
      gold: 5,
      inventory: { potion: 2 },
      weapons: {},
      armors: {},
    });
    const raw = structuredClone(content.data);
    raw.enemies[0].gold = 0;
    raw.enemies[0].loot = [];
    const empty = start(new ContentRegistry(raw));
    win(empty.battle);
    expect(empty.journey.previewVictoryLoot(empty.battle)).toMatchObject({ gold: 5, items: [] });
    empty.journey.finishBattle(empty.battle, []);
    expect(empty.journey.toSave().hero.gold).toBe(5);
  });
  it('rejects unknown and duplicate selections without spending RNG, then allows correction', () => {
    const { journey, battle } = start(dropsContent());
    win(battle);
    const before = journey.toSave();
    for (const ids of [['missing'], ['potion', 'potion']]) {
      expect(() => journey.finishBattle(battle, ids)).toThrow('available victory loot');
      expect(journey.toSave()).toEqual(before);
      expect(journey.engine.random.snapshot()).toEqual(before.randomState);
    }
    journey.finishBattle(battle, ['bread']);
    expect(journey.toSave().hero.inventory.bread).toBe(1);
  });
  it('shows full and partially full stacks and never exceeds inventory limits', () => {
    const registry = dropsContent(true),
      initial = new JourneySession(registry);
    journeys.push(initial);
    const saved = initial.toSave();
    saved.hero.inventory.potion = 999;
    saved.hero.inventory.bread = 998;
    const { journey, battle } = start(registry, saved);
    win(battle);
    expect(journey.previewVictoryLoot(battle).items.slice(0, 2)).toEqual([
      { itemId: 'potion', quantity: 2, collectable: 0 },
      { itemId: 'bread', quantity: 2, collectable: 1 },
    ]);
    expect(() => journey.finishBattle(battle, ['potion'])).toThrow('available victory loot');
    journey.finishBattle(battle);
    expect(journey.toSave().hero.inventory).toEqual({ potion: 999, bread: 999 });
  });
  it('does not offer victory loot after defeat', () => {
    const { journey, battle } = start();
    battle.engine.getEntity('player')!.health!.current = 1;
    Object.assign(battle.engine.getEntity('slime-1')!.combatant!, {
      attack: 10000,
      minDamage: 10000,
      maxDamage: 10000,
      hitChance: 1,
    });
    battle.dispatch({ type: 'SELECT_ACTION', action: 'defend' });
    battle.dispatch({ type: 'SELECT_TARGET', targetId: 'player' });
    battle.dispatch({ type: 'CONFIRM_ACTION' });
    battle.advanceEnemyTurns();
    expect(battle.combat.result).toBe('defeat');
    expect(() => journey.previewVictoryLoot(battle)).toThrow('after victory');
    journey.finishBattle(battle);
    expect(journey.toSave().hero.gold).toBe(0);
  });
});

describe('durable loot confirmation', () => {
  it('saves the selected loot once, retains it after a failed write, rejects duplicate submissions and never rerolls on retry', async () => {
    const registry = dropsContent(),
      initial = new JourneySession(registry);
    journeys.push(initial);
    const rows = new Map<string, SaveRow>();
    rows.set('auto', {
      id: 'auto',
      savedAt: new Date().toISOString(),
      payload: encodeSave(initial.toSave(), registry),
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
    const host = new JourneyHost(registry, async () => storage);
    cleanups.push(host.subscribe(vi.fn()));
    await settle();
    const journey = host.getSnapshot().session!;
    journey.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    journey.dispatch({ type: 'INTERACT', objectId: 'east' });
    journey.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    await host.flush();
    const checkpoint = journey.toSave(),
      battle = host.getSnapshot().battle!;
    win(battle);
    const offered = journey.previewVictoryLoot(battle);
    let rejectWrite!: (error: Error) => void;
    const write = vi.spyOn(storage, 'write').mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectWrite = reject;
        }),
    );
    const confirming = host.returnFromBattle(['iron-blade']);
    await settle();
    expect(await host.returnFromBattle(['bread'])).toBe(false);
    expect(write).toHaveBeenCalledTimes(1);
    rejectWrite(new Error('Disk full'));
    expect(await confirming).toBe(false);
    expect(host.getSnapshot().retryAvailable).toBe(true);
    expect(journey.toSave()).toEqual(checkpoint);
    const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(candidate.hero.gold).toBe(offered.gold);
    expect(candidate.hero.inventory).toEqual({ potion: 2 });
    expect(candidate.hero.weapons['weapon-1'].itemId).toBe('iron-blade');
    expect(candidate.hero.inventory.bread).toBeUndefined();
    // A new selection supplied during retry cannot alter the retained confirmation.
    expect(await host.returnFromBattle(['bread'])).toBe(true);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), registry).campaign).toEqual(candidate);
    expect(host.getSnapshot().battle).toBeUndefined();
    expect(await host.returnFromBattle()).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
  });
});
