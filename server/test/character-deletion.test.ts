import { env } from 'cloudflare:workers';
import { applyD1Migrations, reset } from 'cloudflare:test';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DeletionResponseSchema } from '@rebirth/game-core/online/Contracts';
import { GAME_FEATURES } from '@rebirth/game-core/online/Features';
import { gameContent } from '@rebirth/game-core/online/TestRuntime';
import { app } from '../src/index.js';
import { seedCatalog } from '../src/game/content.js';
import { GameRepository } from '../src/game/repository.js';
import { GameExecution } from '../src/game/execution.js';
import { gameTables } from '../src/game/tables.js';
import { register } from './auth-helpers.js';

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  await seedCatalog(env.DB, gameContent.data);
});
afterEach(() => vi.restoreAllMocks());

function request(
  path: string,
  cookie?: string,
  method = 'GET',
  body?: unknown,
  origin?: string,
) {
  return app.request(
    '/api/game' + path,
    {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
}
async function create(cookie: string) {
  const commandId = crypto.randomUUID();
  const body = { commandId, name: 'Player', talent: 'warrior', age: 12 };
  const response = await request('/characters', cookie, 'POST', body);
  expect(response.status, await response.clone().text()).toBe(200);
  const result = await response.json<{ character: { id: string } }>();
  return { id: result.character.id, body };
}

it('soft deletes idempotently, retains progress, and hides every character read and action', async () => {
  const { cookie, user } = await register();
  const { id, body } = await create(cookie);
  const other = await create(cookie);
  const repository = new GameRepository(env.DB, user.id);
  const before = await repository.load(id);
  const response = await request('/characters/' + id, cookie, 'DELETE');
  expect(response.status).toBe(200);
  const deletion = DeletionResponseSchema.parse(await response.json());
  expect(deletion).toMatchObject({ characterId: id, permanent: false });
  expect(deletion.deletedAt).toBeGreaterThan(0);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const stored = await env.DB.prepare(
    'SELECT * FROM game_characters WHERE id=?',
  )
    .bind(id)
    .first();
  expect(stored).toMatchObject({ deleted_at: deletion.deletedAt, revision: 1 });
  for (const table of gameTables.filter(
    (table) =>
      table.name !== 'game_characters' &&
      table.name !== 'game_command_receipts',
  )) {
    const rows = await env.DB.prepare(
      `SELECT * FROM ${table.name} WHERE character_id=?`,
    )
      .bind(id)
      .all();
    expect(rows.results).toEqual(before.rows[table.name]);
  }
  const repeated = await request('/characters/' + id, cookie, 'DELETE');
  expect(await repeated.json()).toEqual(deletion);
  expect(
    await env.DB.prepare('SELECT * FROM game_characters WHERE id=?')
      .bind(id)
      .first(),
  ).toEqual(stored);
  expect(await (await request('/characters', cookie)).json()).toMatchObject({
    characters: [{ id: other.id }],
  });
  for (const feature of GAME_FEATURES) {
    const suffix = feature === 'character' ? '' : '/' + feature;
    expect(
      (await request('/characters/' + id + suffix, cookie)).status,
      feature,
    ).toBe(404);
  }
  expect((await request('/characters/' + id + '/logs', cookie)).status).toBe(
    404,
  );
  await expect(repository.load(id)).rejects.toMatchObject({ status: 404 });
  expect(
    (
      await request('/characters/' + id + '/rest/stop', cookie, 'POST', {
        commandId: crypto.randomUUID(),
        expectedRevision: 1,
      })
    ).status,
  ).toBe(404);
  expect((await request('/characters', cookie, 'POST', body)).status).toBe(404);
});

it.each([false, true])(
  'permanently deletes active or soft-deleted characters and cascades all game state (soft=%s)',
  async (soft) => {
    const { cookie, user } = await register();
    const { id } = await create(cookie);
    const other = await create(cookie);
    if (soft) await request('/characters/' + id, cookie, 'DELETE');
    const response = await request(
      '/characters/' + id + '/permanent',
      cookie,
      'DELETE',
    );
    expect(response.status, await response.clone().text()).toBe(200);
    expect(DeletionResponseSchema.parse(await response.json())).toEqual({
      apiVersion: 2,
      characterId: id,
      permanent: true,
      deletedAt: null,
    });
    for (const table of gameTables) {
      const column = table.name === 'game_characters' ? 'id' : 'character_id';
      expect(
        await env.DB.prepare(
          `SELECT count(*) AS n FROM ${table.name} WHERE ${column}=?`,
        )
          .bind(id)
          .first('n'),
        table.name,
      ).toBe(0);
    }
    expect(
      await env.DB.prepare(
        'SELECT count(*) AS n FROM game_command_receipt_features',
      ).first('n'),
    ).toBe(1);
    expect(
      (await new GameRepository(env.DB, user.id).load(other.id)).character.id,
    ).toBe(other.id);
    expect(
      await env.DB.prepare('SELECT id FROM user WHERE id=?')
        .bind(user.id)
        .first('id'),
    ).toBe(user.id);
    expect((await request('/characters/' + id, cookie)).status).toBe(404);
    expect(
      (await request('/characters/' + id + '/permanent', cookie, 'DELETE'))
        .status,
    ).toBe(404);
    expect(
      (await env.DB.prepare('PRAGMA foreign_key_check').all()).results,
    ).toEqual([]);
  },
);

it('requires authentication and ownership, validates IDs, and rejects untrusted deletion origins', async () => {
  const owner = await register();
  const { id } = await create(owner.cookie);
  const other = await register('other@example.com');
  for (const suffix of ['', '/permanent']) {
    const path = '/characters/' + id + suffix;
    expect((await request(path, undefined, 'DELETE')).status).toBe(401);
    expect((await request(path, other.cookie, 'DELETE')).status).toBe(404);
    expect(
      (
        await request(
          '/characters/' + crypto.randomUUID() + suffix,
          owner.cookie,
          'DELETE',
        )
      ).status,
    ).toBe(404);
    expect(
      (await request('/characters/invalid' + suffix, owner.cookie, 'DELETE'))
        .status,
    ).toBe(400);
    expect(
      (
        await request(
          path,
          owner.cookie,
          'DELETE',
          undefined,
          'https://evil.example',
        )
      ).status,
    ).toBe(403);
  }
  expect(
    await env.DB.prepare('SELECT deleted_at FROM game_characters WHERE id=?')
      .bind(id)
      .first('deleted_at'),
  ).toBeNull();
});

it.each([false, true])(
  'rolls back deletion on storage failure without exposing SQL details (permanent=%s)',
  async (permanent) => {
    const { cookie } = await register();
    const { id } = await create(cookie);
    await env.DB.prepare(
      `CREATE TRIGGER deletion_failure BEFORE ${permanent ? 'DELETE' : 'UPDATE OF deleted_at'} ON game_characters BEGIN SELECT RAISE(ABORT, 'secret SQL details'); END`,
    ).run();
    const response = await request(
      '/characters/' + id + (permanent ? '/permanent' : ''),
      cookie,
      'DELETE',
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
    expect(
      await env.DB.prepare('SELECT deleted_at FROM game_characters WHERE id=?')
        .bind(id)
        .first('deleted_at'),
    ).toBeNull();
    expect((await request('/characters/' + id, cookie)).status).toBe(200);
  },
);

it('rejects an action loaded before a concurrent soft deletion without modifying progress', async () => {
  const { cookie, user } = await register();
  const { id } = await create(cookie);
  const repository = new GameRepository(env.DB, user.id);
  const loaded = await repository.load(id);
  vi.spyOn(repository, 'load').mockImplementationOnce(async () => {
    await repository.delete(id);
    return loaded;
  });
  const commandId = crypto.randomUUID();
  await expect(
    new GameExecution(repository, crypto.randomUUID()).action(id, {
      commandId,
      expectedRevision: 1,
      command: { type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true },
    }),
  ).rejects.toMatchObject({ status: 404 });
  expect(await repository.receipt(commandId)).toBeUndefined();
  expect(
    await env.DB.prepare('SELECT revision FROM game_characters WHERE id=?')
      .bind(id)
      .first('revision'),
  ).toBe(1);
  expect(
    (
      await env.DB.prepare(
        'SELECT * FROM game_item_hotbar WHERE character_id=?',
      )
        .bind(id)
        .all()
    ).results,
  ).toEqual(loaded.rows.game_item_hotbar);
});
