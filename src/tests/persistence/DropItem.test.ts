import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';

const content = loadGameContent(), cleanups: (() => void)[] = [];
async function settle() { for (let i = 0; i < 100; i++) await Promise.resolve(); }
async function setup() {
  const initial = new JourneySession(content), saved = initial.toSave(); initial.dispose();
  const rows = new Map<string, SaveRow>([['auto', { id: 'auto', savedAt: new Date().toISOString(), payload: encodeSave(saved, content) }]]);
  const storage: SaveStorage = { async read(id) { return rows.get(id); }, async list() { return [...rows.values()]; }, async write(row) { rows.set(row.id, row); }, async close() {} };
  const host = new JourneyHost(content, async () => storage); cleanups.push(host.subscribe(vi.fn())); await settle(); return { host, rows, storage };
}
afterEach(async () => { cleanups.splice(0).forEach((c) => c()); await settleJourneySaves(); vi.restoreAllMocks(); });

describe('durable inventory drops', () => {
  it('retains the original pack on failed write and retries exactly the same drop once', async () => {
    const { host, storage, rows } = await setup(), initial = host.getSnapshot().session!, before = initial.toSave();
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.progress({ type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 1 })).toBe(false);
    expect(initial.toSave()).toEqual(before); expect(host.getSnapshot()).toMatchObject({ session: initial, retryAvailable: true });
    expect(await host.progress({ type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 1 })).toBe(false);
    expect(() => initial.dispatch({ type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: 'potion' })).toThrow('Save pending');
    expect(await host.retryProgression()).toBe(true); expect(write).toHaveBeenCalledTimes(2);
    const expected = structuredClone(before); expected.hero.inventory.potion--;
    expect(host.getSnapshot().session!.toSave()).toEqual(expected);
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign).toEqual(expected);
    expect(JSON.parse(write.mock.calls[0][0].payload).campaign).toEqual(JSON.parse(write.mock.calls[1][0].payload).campaign);
    expect(() => host.getSnapshot().session!.dispatch({ type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 1 })).toThrow('host');
  });
  it('rejects battle drops without changing entry inventory, live state or RNG', async () => {
    const { host, storage } = await setup(), journey = host.getSnapshot().session!;
    journey.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 }); journey.dispatch({ type: 'INTERACT', objectId: 'east' }); journey.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 }); await host.flush();
    const battle = host.getSnapshot().battle!, before = journey.toSave(), live = structuredClone(battle.engine.getEntity('player')!), random = battle.engine.random.snapshot();
    const write = vi.spyOn(storage, 'write');
    expect(await host.progress({ type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 1 })).toBe(false);
    expect(write).not.toHaveBeenCalled(); expect(journey.toSave()).toEqual(before); expect(battle.engine.getEntity('player')).toEqual(live); expect(battle.engine.random.snapshot()).toEqual(random);
  });
});
