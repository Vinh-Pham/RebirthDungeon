import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { addItem, type Hero } from '../../engine/rpg/Character';
import { applyEnchant, burnEquipment } from '../../engine/rpg/Enchants';
import { learnSkill } from '../../engine/rpg/Skills';
import { JourneyHost } from '../../game/JourneyHost';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';
const content = loadGameContent(); const stops: (() => void)[] = [];
async function settle() { for (let i = 0; i < 100; i++) await Promise.resolve(); }
function townState(edit?: (hero: Hero) => void) {
  const initial = new JourneySession(content); const state = initial.toSave(); initial.dispose();
  state.worldId = 'blacksmith-interior'; const keeper = content.data.worlds.find((w) => w.id === state.worldId)!.objects.find((o) => o.id === 'blacksmith-keeper')!; state.position = { x: keeper.x, y: keeper.y + 1 };
  state.hero = learnSkill(state.hero, 'enchant', content); addItem(state.hero, 'iron-blade', 2, content); state.hero.equipment.weapon = 'weapon-1';
  for (const id of ['keen-scroll', 'resilience-scroll', 'enchant-powder', 'mana-herb', 'holy-water']) addItem(state.hero, id, 5, content); edit?.(state.hero); return state;
}
async function hostWith(state = townState()) {
  const rows = new Map<string, SaveRow>([['auto', { id: 'auto', savedAt: new Date().toISOString(), payload: encodeSave(state, content) }]]);
  const storage: SaveStorage = { async read(id) { return rows.get(id); }, async list() { return [...rows.values()]; }, async write(row) { rows.set(row.id, row); }, async close() {} };
  const host = new JourneyHost(content, async () => storage); stops.push(host.subscribe(() => {})); await settle(); return { host, storage, rows };
}
async function speak(host: JourneyHost) { host.getSnapshot().session!.dispatch({ type: 'INTERACT', objectId: 'blacksmith-keeper' }); await host.flush(); }
function command(host: JourneyHost) {
  const view = host.getSnapshot().session!.getSnapshot();
  return { type: 'APPLY_ENCHANT' as const, objectId: 'blacksmith-keeper', target: { weaponId: 'weapon-1' }, scrollId: 'resilience-scroll', powderId: 'enchant-powder', operationId: `enchant-${view.state.hero.enchanting.nextOperationId}`, revision: view.revision };
}
afterEach(async () => { stops.splice(0).forEach((stop) => stop()); await settle(); vi.restoreAllMocks(); });

describe('durable enchant operations', () => {
  it('learns Enchant F with zero training and no starter AP grant, resource recovery or battle adapter', () => {
    const session = new JourneySession(content); const before = session.toSave().hero;
    try { session.dispatch({ type: 'INTERACT', objectId: 'keeper' }); session.dispatch({ type: 'LEARN_SKILL', objectId: 'keeper', skillId: 'enchant' });
      expect(session.toSave().hero).toMatchObject({ ap: before.ap, mana: before.mana, learnedSkills: { enchant: { rank: 'F', objectiveCounts: {} } } });
      expect(session.getSnapshot().message).toContain('zero'); expect(session.toSave().hero.claimedMilestones).toEqual([]);
    } finally { session.dispose(); }
  });
  it('rejects an unopened service, a stale campaign revision and dungeon/pending contexts without costs or draws', async () => {
    const { host } = await hostWith(); const before = host.getSnapshot().session!.toSave();
    expect(await host.progress(command(host))).toBe(false); expect(host.getSnapshot().session!.toSave()).toEqual(before);
    await speak(host); const old = command(host), session = host.getSnapshot().session!;
    session.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' }); const changed = session.toSave();
    expect(await host.progress(old)).toBe(false); expect(host.getSnapshot().error).toContain('campaign changed'); expect(session.toSave()).toEqual(changed);
    session.dispatch({ type: 'TRAVEL_TO', x: 4, y: 6 }); session.dispatch({ type: 'INTERACT', objectId: 'exit' });
    const altar = session.map.objects.find((o) => o.id === 'dungeon-entrance')!; session.dispatch({ type: 'TRAVEL_TO', x: altar.x, y: altar.y + 1 }); session.dispatch({ type: 'INTERACT', objectId: altar.id });
    expect(await host.progress({ type: 'OFFER_ITEM', objectId: altar.id, item: { itemId: 'potion' } })).toBe(true);
    const dungeon = host.getSnapshot().session!.toSave(); expect(await host.progress(command(host))).toBe(false); expect(host.getSnapshot().session!.toSave()).toEqual(dungeon);
  });
  it('retains the exact application/RNG/training/receipt candidate on failed writes and publishes only after retry', async () => {
    const { host, storage, rows } = await hostWith(); await speak(host); const initial = host.getSnapshot().session!, before = initial.toSave(), request = command(host);
    const expected = applyEnchant(before.hero, request, content).hero;
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.progress(request)).toBe(false); expect(write).toHaveBeenCalledTimes(1);
    const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(candidate.hero).toEqual(expected); expect(candidate.randomState).toEqual(before.randomState);
    expect(host.getSnapshot()).toMatchObject({ session: initial, retryAvailable: true, error: 'Disk full', pendingResult: expected.enchanting.receipts[0].message });
    expect(initial.toSave()).toEqual(before); expect(() => initial.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' })).toThrow('Save pending');
    expect(await host.progress(request)).toBe(false); expect(await host.flushForExit()).toBe(false);
    expect(await host.retryProgression()).toBe(true); expect(write).toHaveBeenCalledTimes(2);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign.hero).toEqual(expected);
    expect(host.getSnapshot().session!.toSave().hero).toEqual(expected); expect(host.getSnapshot().pendingResult).toBeUndefined();
    expect(await host.progress(request)).toBe(true); expect(host.getSnapshot().session!.toSave().hero).toEqual(expected);
    await host.load('auto'); expect(await host.progress(request)).toBe(true); expect(host.getSnapshot().session!.toSave().hero).toEqual(expected);
  });
  it('commits destructive burning, cleared equipment, materials, outputs and RNG in the same retained save', async () => {
    const { host, storage } = await hostWith(townState((hero) => { hero.weapons['weapon-1'].prefix = { enchantId: 'keen', values: { edge: 2 } }; hero.weapons['weapon-1'].suffix = { enchantId: 'resilience', values: { guard: 3, resolve: 2 } }; }));
    await speak(host); const initial = host.getSnapshot().session!, before = initial.toSave(), request = { ...command(host), type: 'BURN_EQUIPMENT' as const }, expected = burnEquipment(before.hero, request, content).hero;
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Offline'));
    expect(await host.progress(request)).toBe(false); expect(initial.toSave()).toEqual(before);
    expect(JSON.parse(write.mock.calls[0][0].payload).campaign.hero).toEqual(expected);
    expect(await host.retryProgression()).toBe(true); expect(host.getSnapshot().session!.toSave().hero).toEqual(expected);
    expect(expected.weapons['weapon-1']).toBeUndefined(); expect(expected.equipment.weapon).toBeUndefined();
    expect(await host.progress(request)).toBe(true); expect(host.getSnapshot().session!.toSave().hero).toEqual(expected);
  });
  it('persists instance locks and blocks removal or enchanting while allowing equipment assignment', async () => {
    const { host } = await hostWith(); await speak(host);
    expect(await host.progress({ type: 'LOCK_EQUIPMENT', target: { weaponId: 'weapon-1' }, locked: true })).toBe(true);
    const session = host.getSnapshot().session!, before = session.toSave(); expect(before.hero.weapons['weapon-1'].locked).toBe(true);
    expect(await host.progress(command(host))).toBe(false); expect(host.getSnapshot().session!.toSave()).toEqual(before);
    session.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' }); session.dispatch({ type: 'EQUIP_WEAPON', weaponId: 'weapon-1' });
    expect(session.toSave().hero.equipment.weapon).toBe('weapon-1'); expect(session.toSave().hero.weapons['weapon-1'].locked).toBe(true);
  });
});
