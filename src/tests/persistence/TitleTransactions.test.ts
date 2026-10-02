import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { JourneySession } from '../../game/JourneySession';
import { addItem } from '../../engine/rpg/Character';
import { awardTitle, reconcileTitles } from '../../engine/rpg/Titles';
import { encodeSave, parseSave, type CampaignState } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';

const content = loadGameContent(),
  cleanup: (() => void)[] = [];
async function settle() {
  for (let i = 0; i < 100; i++) await Promise.resolve();
}
function state(registry = content) {
  const session = new JourneySession(registry);
  const saved = session.toSave();
  session.dispose();
  return saved;
}
async function hostWith(saved = state(), registry = content, failFirst = false) {
  const rows = new Map<string, SaveRow>();
  rows.set('auto', {
    id: 'auto',
    savedAt: new Date().toISOString(),
    payload: encodeSave(saved, registry),
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
  const write = vi.spyOn(storage, 'write');
  if (failFirst) write.mockRejectedValueOnce(new Error('Disk full'));
  const host = new JourneyHost(registry, async () => storage);
  cleanup.push(host.subscribe(vi.fn()));
  await settle();
  return { host, storage, rows, write };
}
afterEach(async () => {
  cleanup.splice(0).forEach((c) => c());
  await settle();
  await settleJourneySaves();
  vi.restoreAllMocks();
});

describe('durable title selection and coupons', () => {
  it('retains exact selection and resource clamps on a failed write and publishes only after retry', async () => {
    const saved = state();
    awardTitle(saved.hero, 'guardian-breaker', 'test', content);
    saved.hero.mana = 98;
    const { host, storage, rows } = await hostWith(saved);
    const session = host.getSnapshot().session!,
      before = session.toSave();
    const command = {
      type: 'SELECT_TITLE' as const,
      slot: 'first' as const,
      titleId: 'guardian-breaker',
    };
    expect(() => session.dispatch(command)).toThrow('host');
    expect(() => session.engine.dispatch(command)).toThrow('host');
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.progress(command)).toBe(false);
    expect(session.toSave()).toEqual(before);
    expect(host.getSnapshot().notice).toBeUndefined();
    expect(host.getSnapshot().pendingResult).toContain('Guardian Breaker');
    const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(candidate.hero).toMatchObject({
      mana: 93,
      gold: 0,
      ap: 5,
      titleCollection: { selected: { first: 'guardian-breaker' } },
    });
    expect(() => session.dispatch({ type: 'REST', entityId: 'player' })).toThrow('Save pending');
    expect(await host.retryProgression()).toBe(true);
    expect(host.getSnapshot().session!.toSave()).toEqual(candidate);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign).toEqual(candidate);
    expect(host.getSnapshot().notice).toContain('Guardian Breaker');
    expect(await host.retryProgression()).toBe(false);
    expect(await host.progress({ type: 'SELECT_TITLE', slot: 'first' })).toBe(true);
    expect(host.getSnapshot().session!.toSave().hero.mana).toBe(93);
  });
  it('saves coupon consumption, ownership and acquisition together exactly once, including uncertain writes', async () => {
    const saved = state();
    addItem(saved.hero, 'lantern-title-coupon', 2, content);
    reconcileTitles(saved.hero, content, 'test');
    const { host, storage, rows } = await hostWith(saved),
      session = host.getSnapshot().session!,
      before = session.toSave();
    const write = vi.spyOn(storage, 'write').mockImplementationOnce(async (row) => {
      rows.set(row.id, row);
      throw new Error('Lost connection after write');
    });
    expect(
      await host.progress({ type: 'UNLOCK_TITLE_COUPON', itemId: 'lantern-title-coupon' }),
    ).toBe(false);
    expect(session.toSave()).toEqual(before);
    const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(candidate.hero).toMatchObject({
      inventory: { 'lantern-title-coupon': 1 },
      earnedTitles: ['lantern-companion'],
      titleCollection: {
        selected: {},
        records: { 'lantern-companion': { source: 'coupon/lantern-title-coupon/once' } },
      },
    });
    expect(await host.retryProgression()).toBe(true);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
    expect(
      await host.progress({ type: 'UNLOCK_TITLE_COUPON', itemId: 'lantern-title-coupon' }),
    ).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
    expect(host.getSnapshot().session!.toSave().hero.inventory['lantern-title-coupon']).toBe(1);
  });
  it('provides a one-time coupon follow-up for older heroes that already claimed provisions', async () => {
    const saved = state();
    saved.hero.quests['refuge-preparations'] = {
      status: 'completed',
      stageId: 'bring-provisions',
      counts: { 'grocery-visit': 1 },
      claimId: 'quest/refuge-preparations/once',
    };
    const { host } = await hostWith(saved);
    const interact = () =>
      host.getSnapshot().session!.dispatch({ type: 'INTERACT', objectId: 'keeper' });
    interact();
    await host.flush();
    expect(
      await host.progress({ type: 'ACCEPT_QUEST', questId: 'lantern-watch', objectId: 'keeper' }),
    ).toBe(true);
    expect(
      host.getSnapshot().session!.toSave().hero.inventory['lantern-title-coupon'],
    ).toBeUndefined();
    interact();
    await host.flush();
    expect(
      await host.progress({ type: 'CLAIM_QUEST', questId: 'lantern-watch', objectId: 'keeper' }),
    ).toBe(true);
    const claimed = host.getSnapshot().session!.toSave();
    expect(claimed.hero.inventory['lantern-title-coupon']).toBe(1);
    expect(claimed.hero.earnedTitles).toEqual([]);
    expect(claimed.hero.titleCollection.discovered).toContain('lantern-companion');
    expect(
      await host.progress({ type: 'CLAIM_QUEST', questId: 'lantern-watch', objectId: 'keeper' }),
    ).toBe(false);
    expect(host.getSnapshot().session!.toSave()).toEqual(claimed);
  });
  it('keeps title coupons out of sales and offerings without spending inventory or RNG', async () => {
    const saved = state();
    addItem(saved.hero, 'lantern-title-coupon', 1, content);
    saved.position = { x: 7, y: 5 };
    const { host } = await hostWith(saved);
    host.getSnapshot().session!.dispatch({ type: 'INTERACT', objectId: 'dungeon-entrance' });
    await host.flush();
    const before = host.getSnapshot().session!.toSave();
    expect(
      await host.progress({
        type: 'OFFER_ITEM',
        objectId: 'dungeon-entrance',
        item: { itemId: 'lantern-title-coupon' },
      }),
    ).toBe(false);
    expect(host.getSnapshot().session!.toSave()).toEqual(before);
    const general = content.data.worlds.find((w) => w.id === 'general-interior')!,
      keeper = general.objects.find((o) => o.id === 'general-keeper')!;
    const trade = { ...saved, worldId: general.id, position: { x: keeper.x, y: keeper.y + 1 } };
    const second = await hostWith(trade);
    second.host.getSnapshot().session!.dispatch({ type: 'INTERACT', objectId: keeper.id });
    await second.host.flush();
    const tradeBefore = second.host.getSnapshot().session!.toSave();
    expect(
      await second.host.progress({
        type: 'SELL_ITEM',
        objectId: keeper.id,
        item: { itemId: 'lantern-title-coupon' },
        quantity: 1,
      }),
    ).toBe(false);
    expect(second.host.getSnapshot().session!.toSave()).toEqual(tradeBefore);
  });
  it('revalidates town access and rejects selection or coupon redemption during a dungeon and pending encounter', async () => {
    const saved = state();
    awardTitle(saved.hero, 'first-delver', 'test', content);
    addItem(saved.hero, 'lantern-title-coupon', 1, content);
    saved.position = { x: 7, y: 5 };
    const { host, storage } = await hostWith(saved);
    host.getSnapshot().session!.dispatch({ type: 'INTERACT', objectId: 'dungeon-entrance' });
    await host.flush();
    expect(
      await host.progress({
        type: 'OFFER_ITEM',
        objectId: 'dungeon-entrance',
        item: { itemId: 'potion' },
      }),
    ).toBe(true);
    const before = host.getSnapshot().session!.toSave();
    const write = vi.spyOn(storage, 'write');
    write.mockClear();
    expect(
      await host.progress({ type: 'SELECT_TITLE', slot: 'first', titleId: 'first-delver' }),
    ).toBe(false);
    expect(
      await host.progress({ type: 'UNLOCK_TITLE_COUPON', itemId: 'lantern-title-coupon' }),
    ).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(host.getSnapshot().session!.toSave()).toEqual(before);
  });
});

describe('durable title catch-up and encounter evidence', () => {
  const registry = new ContentRegistry({
    ...content.data,
    titles: [
      ...content.data.titles,
      {
        id: 'level-two',
        name: 'Second step',
        description: 'Reach level two',
        slot: 'first',
        award: { kind: 'level', minimum: 2 },
      },
      {
        id: 'chamber-win',
        name: 'Chamber winner',
        description: 'Win the chamber',
        slot: 'first',
        award: { kind: 'encounter', mapId: 'chamber', minimum: 1 },
      },
    ],
  });
  it('catches up reliable saved state before publishing, while an event title requires recorded evidence', async () => {
    const saved = state(registry);
    saved.hero.level = 2;
    saved.hero.cumulativeLevel = 2;
    const { host, write } = await hostWith(saved, registry, true);
    expect(host.getSnapshot().session!.toSave().hero.earnedTitles).toEqual([]);
    expect(host.getSnapshot().retryAvailable).toBe(true);
    expect(host.getSnapshot().notice).toBeUndefined();
    const first = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(first.hero.earnedTitles).toEqual(['level-two']);
    expect(first.hero.titleCollection.selected).toEqual({});
    expect(await host.retryProgression()).toBe(true);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(first);
    expect(host.getSnapshot().session!.toSave().hero.earnedTitles).not.toContain('chamber-win');
  });
  it.each(['victory', 'defeat'] as const)(
    'discards unfinished attempts and saves %s title evidence with resources once',
    async (result) => {
      const saved = state(registry);
      awardTitle(saved.hero, 'guardian-breaker', 'test', registry);
      const { host, storage } = await hostWith(saved, registry);
      expect(
        await host.progress({ type: 'SELECT_TITLE', slot: 'first', titleId: 'guardian-breaker' }),
      ).toBe(true);
      const session = host.getSnapshot().session!;
      session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
      session.dispatch({ type: 'INTERACT', objectId: 'east' });
      session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
      await host.flush();
      const checkpoint = session.toSave(),
        battle = host.getSnapshot().battle!;
      expect(
        battle
          .getSnapshot()
          .character!.source.titles?.some((e) => e.name === 'the Guardian Breaker'),
      ).toBe(true);
      const restart = new JourneySession(registry, checkpoint),
        restarted = restart.createBattle();
      battle.titles.damage('player', 1);
      expect(restarted.titles.snapshot().flawless).toBe(true);
      expect(restart.toSave().hero.earnedTitles).not.toContain('chamber-win');
      restarted.dispose();
      restart.dispose();
      expect(await host.progress({ type: 'SELECT_TITLE', slot: 'first' })).toBe(false);
      const enemy = battle.engine.getEntity('slime-1')!;
      vi.spyOn(battle.engine.random, 'chance').mockReturnValue(true);
      if (result === 'victory') enemy.health!.current = 1;
      else {
        battle.engine.getEntity('player')!.health!.current = 1;
        Object.assign(enemy.combatant!, { attack: 1000, minDamage: 1000, maxDamage: 1000 });
      }
      battle.dispatch({
        type: 'SELECT_ACTION',
        action: result === 'victory' ? 'attack' : 'defend',
      });
      battle.dispatch({
        type: 'SELECT_TARGET',
        targetId: result === 'victory' ? 'slime-1' : 'player',
      });
      battle.dispatch({ type: 'CONFIRM_ACTION' });
      if (result === 'defeat') battle.advanceEnemyTurns();
      expect(battle.combat.result).toBe(result);
      const write = vi.spyOn(storage, 'write');
      write.mockClear();
      write.mockRejectedValueOnce(new Error('Disk full'));
      expect(await host.returnFromBattle()).toBe(false);
      expect(session.toSave()).toEqual(checkpoint);
      const candidate: CampaignState = JSON.parse(write.mock.calls[0][0].payload).campaign;
      expect(candidate.hero.earnedTitles.includes('chamber-win')).toBe(result === 'victory');
      expect(candidate.hero.earnedTitles).toContain('guardian-breaker');
      expect(candidate.hero.titleCollection.evidence['encounter/chamber/completed']).toBe(1);
      expect(candidate.hero.titleCollection.evidence['encounter/chamber/victory']).toBe(
        result === 'victory' ? 1 : undefined,
      );
      expect(await host.retryProgression()).toBe(true);
      expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
      expect(await host.returnFromBattle()).toBe(false);
      expect(write).toHaveBeenCalledTimes(2);
    },
  );
});
