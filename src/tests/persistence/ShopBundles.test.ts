import { expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';

it('retains and retries the exact arrow bundle purchase without charging or granting twice', async () => {
  const content = loadGameContent();
  const initial = new JourneySession(content);
  const state = initial.toSave();
  initial.dispose();
  state.hero.gold = 150;
  state.worldId = 'blacksmith-interior';
  const keeper = content.data.worlds
    .find((world) => world.id === state.worldId)!
    .objects.find((object) => object.id === 'blacksmith-keeper')!;
  state.position = { x: keeper.x, y: keeper.y + 1 };
  const rows = new Map<string, SaveRow>([
    [
      'auto',
      { id: 'auto', savedAt: new Date().toISOString(), payload: encodeSave(state, content) },
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
  const stop = host.subscribe(() => {});
  try {
    for (let i = 0; i < 100; i++) await Promise.resolve();
    const session = host.getSnapshot().session!;
    session.dispatch({ type: 'INTERACT', objectId: 'blacksmith-keeper' });
    await host.flush();
    const before = session.toSave();
    const fork = vi.spyOn(session, 'progressionCandidate');
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    const command = {
      type: 'BUY_ITEM' as const,
      objectId: 'blacksmith-keeper',
      itemId: 'arrow',
      quantity: 200,
      bundleSize: 100,
    };
    expect(await host.progress(command)).toBe(false);
    expect(session.toSave()).toEqual(before);
    expect(host.getSnapshot()).toMatchObject({ retryAvailable: true, error: 'Disk full' });
    const candidate = JSON.parse(write.mock.calls[0][0].payload).campaign;
    expect(candidate.hero).toMatchObject({ gold: 0, inventory: { arrow: 200 } });
    expect(candidate.randomState).toEqual(before.randomState);
    expect(await host.progress(command)).toBe(false);
    expect(await host.retryProgression()).toBe(true);
    expect(fork).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(2);
    expect(JSON.parse(write.mock.calls[1][0].payload).campaign).toEqual(candidate);
    expect(host.getSnapshot().session!.toSave()).toEqual(candidate);
    expect(parseSave(JSON.parse(rows.get('auto')!.payload), content).campaign).toEqual(candidate);
    await host.load('auto');
    expect(host.getSnapshot().session!.toSave()).toEqual(candidate);
  } finally {
    stop();
    await settleJourneySaves();
    vi.restoreAllMocks();
  }
});
