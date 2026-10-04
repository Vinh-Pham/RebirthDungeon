import { expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { GameAPI } from '../../online/API';
import { OnlineAccess } from '../../online/Access';
import {
  applyUpdates,
  cachedFeature,
  characterOptions,
  coherentCharacter,
  featureOptions,
  gameKeys,
  refreshFeatures,
} from '../../online/queries';
import { publicFeatures } from '@rebirth/game-core/online/PublicFeatures';
import { newOnlineState, publicView, gameContent } from '@rebirth/game-core/online/TestRuntime';
import { CORE_FEATURES, type GameFeature } from '@rebirth/game-core/online/Features';
const id = 'dd46a450-bc4b-42bf-aab4-e58c7ccdfc7b';
function fixture() {
  const access = new OnlineAccess();
  access.accept('user', access.getSnapshot());
  let revision = 1;
  const state = newOnlineState(12345, 'Player', 'warrior');
  const metadata = () => ({
    id,
    name: 'Player',
    talent: 'warrior' as const,
    age: 12,
    revision,
    contentVersion: 'rebirth-13.1',
    createdAt: 0,
    updatedAt: 0,
  });
  const data = () => publicFeatures(publicView(state, metadata()), gameContent, { receipts: [] });
  let conflict = false;
  const paths: string[] = [];
  const api = new GameAPI({
    origin: 'https://api.example.com',
    access,
    onUnauthorized: () => access.invalidate(),
    credentials: async () => ({ credentials: 'omit' }),
    fetch: vi.fn(async (input) => {
      const url = new URL(String(input)),
        feature = (url.pathname.split('/')[5] ?? 'character') as GameFeature;
      paths.push(url.pathname);
      if (conflict && feature === 'resources') {
        conflict = false;
        revision++;
        return Response.json({ message: 'Changed' }, { status: 409 });
      }
      const expected = url.searchParams.get('expectedRevision');
      if (expected !== null && Number(expected) !== revision)
        return Response.json({ message: 'Changed' }, { status: 409 });
      return Response.json({
        apiVersion: 2,
        characterId: id,
        revision,
        contentVersion: metadata().contentVersion,
        data: data()[feature],
      });
    }),
  });
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const receipt = (baseRevision: number) => ({
    commandId: crypto.randomUUID(),
    characterId: id,
    baseRevision,
    committedRevision: baseRevision + 1,
    createdAt: 0,
    outcome: { message: 'Committed', events: [] },
  });
  return {
    api,
    access,
    queries,
    paths,
    data,
    receipt,
    setRevision: (value: number) => {
      revision = value;
    },
    conflict: () => {
      conflict = true;
    },
  };
}
it('bootstraps only core slices and never fabricates unloaded inventory after actions', async () => {
  const f = fixture();
  await f.queries.fetchQuery(characterOptions(f.api, f.access, 'user', id, f.queries));
  expect(f.paths).toHaveLength(CORE_FEATURES.length);
  expect(cachedFeature(f.queries, f.api, 'user', id, 'inventory')).toBeUndefined();
  f.setRevision(2);
  const data = f.data();
  await applyUpdates(f.queries, f.api, f.access, 'user', {
    apiVersion: 2,
    receipt: f.receipt(1),
    snapshotRevision: 2,
    updates: { character: data.character, resources: data.resources },
  });
  expect(f.paths).toHaveLength(CORE_FEATURES.length);
  expect(coherentCharacter(f.queries, f.api, 'user', id)?.view.character.revision).toBe(2);
  expect(cachedFeature(f.queries, f.api, 'user', id, 'inventory')).toBeUndefined();
  await f.queries.fetchQuery(featureOptions(f.api, f.access, 'user', id, 'inventory', 2));
  expect(cachedFeature(f.queries, f.api, 'user', id, 'inventory')?.data).toEqual(data.inventory);
  f.queries.clear();
});
it('refreshes revision gaps with guarded reads before publishing coherent gameplay', async () => {
  const f = fixture();
  await refreshFeatures(f.queries, f.api, f.access, 'user', id);
  await f.queries.fetchQuery(featureOptions(f.api, f.access, 'user', id, 'inventory', 1));
  f.setRevision(4);
  const data = f.data();
  await applyUpdates(f.queries, f.api, f.access, 'user', {
    apiVersion: 2,
    receipt: f.receipt(1),
    snapshotRevision: 4,
    updates: { character: data.character, journey: data.journey },
  });
  expect(coherentCharacter(f.queries, f.api, 'user', id)?.view.character.revision).toBe(4);
  expect(cachedFeature(f.queries, f.api, 'user', id, 'inventory')?.revision).toBe(4);
  expect(cachedFeature(f.queries, f.api, 'user', id, 'skills')).toBeUndefined();
  f.conflict();
  await refreshFeatures(f.queries, f.api, f.access, 'user', id);
  expect(coherentCharacter(f.queries, f.api, 'user', id)?.view.character.revision).toBe(5);
  f.queries.clear();
});
it('rejects older feature reads and clears removed encounter state using null', async () => {
  const f = fixture();
  await refreshFeatures(f.queries, f.api, f.access, 'user', id);
  const options = featureOptions(f.api, f.access, 'user', id, 'encounter');
  const current = cachedFeature(f.queries, f.api, 'user', id, 'encounter')!;
  expect(
    options.structuralSharing && typeof options.structuralSharing === 'function'
      ? options.structuralSharing({ ...current, revision: 5 }, { ...current, revision: 2 })
      : undefined,
  ).toMatchObject({ revision: 5 });
  f.setRevision(2);
  const data = f.data();
  await applyUpdates(f.queries, f.api, f.access, 'user', {
    apiVersion: 2,
    receipt: f.receipt(1),
    snapshotRevision: 2,
    updates: { character: data.character, encounter: null },
  });
  expect(cachedFeature(f.queries, f.api, 'user', id, 'encounter')?.data).toBeNull();
  expect(
    f.queries.getQueryData(gameKeys.feature(f.api.origin, 'other', id, 'encounter')),
  ).toBeUndefined();
  f.queries.clear();
});

it('preserves independently newer slices when an older action arrives and refreshes the gap', async () => {
  const f = fixture();
  await refreshFeatures(f.queries, f.api, f.access, 'user', id);
  f.setRevision(2);
  const data = f.data();
  f.setRevision(3);
  await f.queries.fetchQuery(featureOptions(f.api, f.access, 'user', id, 'inventory'));
  await applyUpdates(f.queries, f.api, f.access, 'user', {
    apiVersion: 2,
    receipt: f.receipt(1),
    snapshotRevision: 2,
    updates: { character: data.character, inventory: data.inventory },
  });
  expect(coherentCharacter(f.queries, f.api, 'user', id)?.view.character.revision).toBe(3);
  expect(cachedFeature(f.queries, f.api, 'user', id, 'inventory')?.revision).toBe(3);
  f.queries.clear();
});
