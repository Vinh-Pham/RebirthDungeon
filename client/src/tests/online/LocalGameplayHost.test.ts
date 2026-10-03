import { expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { JourneySession } from '../../game/JourneySession';
import { JourneyHost, settleJourneySaves } from '../../game/JourneyHost';
import { LocalGameplayHost } from '../../game/LocalGameplayHost';
import {
  SaveRepository,
  type SaveRow,
  type SaveSlot,
  type SaveStorage,
} from '../../persistence/SaveRepository';

it('local manual loads preserve saved balances and invalidate previous session previews', async () => {
  const content = loadGameContent(),
    rows = new Map<SaveSlot, SaveRow>();
  const storage: SaveStorage = {
    read: async (slot) => rows.get(slot),
    write: async (row) => {
      rows.set(row.id, row);
    },
    list: async () => [...rows.values()],
    close: async () => {},
  };
  const seed = new JourneySession(content);
  await new SaveRepository(storage, content).save('auto', seed.toSave());
  const manual = seed.toSave();
  manual.hero.gold = 42;
  await new SaveRepository(storage, content).save('1', manual);
  seed.dispose();
  const owned = new JourneyHost(content, async () => storage, 'Local'),
    host = new LocalGameplayHost(owned, 'local');
  const stop = host.subscribe(vi.fn());
  try {
    await vi.waitFor(() => expect(host.getSnapshot().session).toBeDefined());
    const before = host.getSnapshot().session!;
    const selection = { type: 'EQUIPMENT' as const, item: { weaponId: 'unused' } };
    const key = before.previewKey(selection),
      revision = before.getSnapshot().revision;
    await host.load('1');
    const after = host.getSnapshot().session!;
    expect(after.getSnapshot().revision).toBeGreaterThan(revision);
    expect(before.getSnapshot().state.hero.gold).toBe(0);
    expect(after.getSnapshot().state.hero.gold).toBe(42);
    expect(after.previewKey(selection)).not.toEqual(key);
    expect(host.source).toBe('local');
  } finally {
    stop();
    await settleJourneySaves();
  }
});
