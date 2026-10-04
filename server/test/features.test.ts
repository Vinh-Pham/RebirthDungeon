import { env } from 'cloudflare:workers';
import { applyD1Migrations, reset } from 'cloudflare:test';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { app } from '../src/index.js';
import { register } from './auth-helpers.js';
import { gameContent } from '@rebirth/game-core/online/TestRuntime';
import { GAME_CONTENT_VERSION } from '@rebirth/game-core/online/Contracts';
import {
  GAME_FEATURES,
  CONTENT_COLLECTIONS,
  featureResponseSchema,
  CreationResponseSchema,
  MutationResponseSchema,
  contentProperty,
} from '@rebirth/game-core/online/Features';
import {
  actionDefinitions,
  previewDefinitions,
  actionRequest,
} from '@rebirth/game-core/online/Actions';
import { ContentRepository, seedCatalog } from '../src/game/content.js';
import { GameRepository } from '../src/game/repository.js';
import { projectAll } from '../src/game/projections.js';
const req = (path: string, cookie?: string, body?: unknown) =>
  app.request(
    '/api/game' + path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env,
  );
beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  await seedCatalog(env.DB, gameContent.data);
});
afterEach(() => vi.restoreAllMocks());
async function fixture() {
  const owner = await register();
  const response = await req('/characters', owner.cookie, {
    commandId: crypto.randomUUID(),
    name: 'Player',
    talent: 'warrior',
    age: 12,
  });
  expect(response.status, await response.clone().text()).toBe(200);
  return { ...owner, ...CreationResponseSchema.parse(await response.json()) };
}
it('reads each feature without the aggregate loader, with ownership and revision guards', async () => {
  const f = await fixture(),
    id = f.character.id,
    repo = new GameRepository(env.DB, f.user.id);
  const loaded = await repo.load(id),
    expected = projectAll(
      loaded.state,
      loaded.character,
      loaded.runtime,
      loaded.content,
    );
  const aggregate = vi
    .spyOn(GameRepository.prototype, 'load')
    .mockRejectedValue(new Error('Aggregate reads forbidden'));
  for (const feature of GAME_FEATURES) {
    const path =
      '/characters/' + id + (feature === 'character' ? '' : '/' + feature);
    const response = await req(path + '?expectedRevision=1', f.cookie);
    expect(
      response.status,
      feature + ': ' + (await response.clone().text()),
    ).toBe(200);
    const parsed = featureResponseSchema(feature).parse(await response.json());
    expect(parsed.data, feature).toEqual(expected[feature]);
    expect(parsed.revision).toBe(1);
    expect((await req(path + '?expectedRevision=0', f.cookie)).status).toBe(
      409,
    );
  }
  expect(aggregate).not.toHaveBeenCalled();
  aggregate.mockRestore();
  const other = await register('other@example.com');
  for (const feature of GAME_FEATURES)
    expect(
      (
        await req(
          '/characters/' + id + (feature === 'character' ? '' : '/' + feature),
          other.cookie,
        )
      ).status,
    ).toBe(404);
  expect(expected.encounter).toBeNull();
  expect(expected.dungeon).toBeNull();
  expect(JSON.stringify(expected)).not.toContain('randomState');
  expect(JSON.stringify(expected)).not.toContain('nextOperationId');
});
it('returns affected features, replays current slices, and documents all feature action routes', async () => {
  const f = await fixture(),
    id = f.character.id;
  const input = {
    commandId: crypto.randomUUID(),
    expectedRevision: 1,
    command: { type: 'MOVE', dx: 1, dy: 0 },
  } as const;
  const perform = (request: ReturnType<typeof actionRequest>) =>
    app.request(
      request.path,
      {
        method: 'POST',
        headers: { Cookie: f.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      },
      env,
    );
  const request = actionRequest(id, input),
    first = await perform(request);
  expect(first.status, await first.clone().text()).toBe(200);
  const result = MutationResponseSchema.parse(await first.json());
  expect(result.updates.journey?.position).toEqual({ x: 3, y: 3 });
  expect(result.updates.character.revision).toBe(2);
  expect(result.updates.inventory).toBeUndefined();
  expect(
    (
      await perform(
        actionRequest(id, {
          ...input,
          commandId: crypto.randomUUID(),
          expectedRevision: 2,
          command: { type: 'MOVE', dx: -1, dy: 0 },
        }),
      )
    ).status,
  ).toBe(200);
  const again = MutationResponseSchema.parse(
    await (await perform(request)).json(),
  );
  expect(again.receipt).toEqual(result.receipt);
  expect(again.snapshotRevision).toBe(3);
  expect(again.updates.journey?.position).toEqual({ x: 2, y: 3 });
  const recorded = await env.DB.prepare(
    'SELECT feature FROM game_command_receipt_features WHERE command_id=?',
  )
    .bind(input.commandId)
    .all<{ feature: string }>();
  expect(recorded.results.map((r) => r.feature).sort()).toEqual(
    Object.keys(result.updates).sort(),
  );
  for (const suffix of ['/commands', '/previews'])
    expect((await req('/characters/' + id + suffix, f.cookie, {})).status).toBe(
      404,
    );
  const spec = await (await app.request('/openapi.json', {}, env)).json<any>();
  for (const definition of [...actionDefinitions, ...previewDefinitions])
    expect(
      spec.paths['/api/game/characters/{id}' + definition.path]?.post,
      definition.path,
    ).toBeTruthy();
  for (const feature of GAME_FEATURES)
    expect(
      spec.paths[
        '/api/game/characters/{id}' +
          (feature === 'character' ? '' : '/' + feature)
      ].get,
    ).toBeTruthy();
});
it('reconstructs immutable releases and collection endpoints with idempotent checksums', async () => {
  const catalog = new ContentRepository(env.DB, env.CACHE),
    registry = await catalog.load(GAME_CONTENT_VERSION);
  expect(registry.data).toEqual(gameContent.data);
  expect(await seedCatalog(env.DB, gameContent.data)).toBe(false);
  const updated = structuredClone(gameContent.data);
  updated.items[0].name += ' changed';
  await expect(seedCatalog(env.DB, updated)).rejects.toThrow(
    'cannot be reused',
  );
  const invalid = structuredClone(gameContent.data);
  invalid.enemies[0].skills = ['missing-skill'];
  await expect(seedCatalog(env.DB, invalid, 'invalid')).rejects.toThrow();
  for (const sql of [
    "UPDATE game_content_items SET name='changed'",
    'DELETE FROM game_content_items',
    "UPDATE game_content_releases SET checksum='changed'",
    'DELETE FROM game_content_releases',
  ])
    await expect(env.DB.prepare(sql).run()).rejects.toThrow('immutable');
  const owner = await register();
  for (const collection of CONTENT_COLLECTIONS) {
    const response = await req(
      '/content/' + GAME_CONTENT_VERSION + '/' + collection,
      owner.cookie,
    );
    expect(response.status, collection).toBe(200);
    expect((await response.json<{ data: unknown }>()).data).toEqual(
      registry.data[contentProperty(collection)],
    );
  }
  const manifest = await (await req('/content', owner.cookie)).json<any>();
  expect(manifest.collections).toEqual([...CONTENT_COLLECTIONS]);
  expect(manifest.catalog).toBeUndefined();
  await env.DB.prepare(
    "DELETE FROM game_content_configuration WHERE key='active'",
  ).run();
  expect(
    (
      await req('/characters', owner.cookie, {
        commandId: crypto.randomUUID(),
        name: 'Player',
        talent: 'warrior',
        age: 12,
      })
    ).status,
  ).toBe(503);
});
it('queries character-owned features through the explicit Drizzle relation registry', async () => {
  const f = await fixture();
  const { gameDatabase } = await import('../src/db/game.js');
  const row = await gameDatabase(env.DB).query.gameCharacters.findFirst({
    where: { id: f.character.id },
    with: {
      owner: true,
      progression: true,
      resources: true,
      inventory: true,
      skills: true,
      quests: true,
      release: true,
    },
  });
  expect(row?.owner.id).toBe(f.user.id);
  expect(row?.progression.level).toBe(1);
  expect(row?.inventory).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ item_id: 'potion', quantity: 2 }),
    ]),
  );
  expect(row?.release.content_version).toBe(GAME_CONTENT_VERSION);
});
it('validates immutable KV catalog hits and falls back to D1 after corrupt cache entries', async () => {
  const repository = new ContentRepository(env.DB, env.CACHE);
  const release = await repository.release(GAME_CONTENT_VERSION);
  const key = `game:catalog:v1:${GAME_CONTENT_VERSION}:${release.checksum}`;
  await repository.load(GAME_CONTENT_VERSION);
  const read = vi.spyOn(ContentRepository.prototype, 'read');
  expect(
    (await new ContentRepository(env.DB, env.CACHE).load(GAME_CONTENT_VERSION))
      .data,
  ).toEqual(gameContent.data);
  expect(read).not.toHaveBeenCalled();
  await env.CACHE.put(key, JSON.stringify({ items: [] }));
  expect(
    (await new ContentRepository(env.DB, env.CACHE).load(GAME_CONTENT_VERSION))
      .data,
  ).toEqual(gameContent.data);
  expect(read).toHaveBeenCalledTimes(1);
});
