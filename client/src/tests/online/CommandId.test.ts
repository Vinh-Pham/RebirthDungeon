import { afterEach, expect, it, vi } from 'vitest';
import { createCommandId } from '../../online/commandId.web';
afterEach(() => vi.unstubAllGlobals());
it('creates valid version 4 IDs on LAN HTTP without crypto.randomUUID', () => {
  const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(0xff));
  vi.stubGlobal('crypto', { getRandomValues });
  expect(createCommandId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  expect(getRandomValues).toHaveBeenCalledOnce();
});
it('uses fresh cryptographic bytes for each command without weakening randomness on failure', () => {
  const ids = new Set(Array.from({ length: 100 }, () => createCommandId()));
  expect(ids.size).toBe(100);
  for (const id of ids)
    expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  vi.stubGlobal('crypto', {
    getRandomValues: () => {
      throw new Error('Random source unavailable');
    },
  });
  expect(createCommandId).toThrow('Random source unavailable');
});
