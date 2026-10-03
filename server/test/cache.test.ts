import { env, exports } from 'cloudflare:workers';
import { applyD1Migrations, reset, type D1Migration } from 'cloudflare:test';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { app } from '../src/index.js';
import { cacheKeys, createCacheStore } from '../src/kv/cache.js';
import {
  cacheEntryResponseSchema,
  cachePutSchema,
  storedResponseSchema,
} from '../src/kv/schemas.js';
import { errorSchema } from '../src/auth/schemas.js';
import { register } from './auth-helpers.js';

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
afterEach(() => vi.restoreAllMocks());

function request(
  path: string,
  init: { method: string; cookie?: string; body?: unknown },
) {
  return app.request(
    path,
    {
      method: init.method,
      headers: {
        'Content-Type': 'application/json',
        ...(init.cookie ? { Cookie: init.cookie } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    },
    env,
  );
}

it('stores, reads, and deletes JSON entries under prefixed keys', async () => {
  const store = createCacheStore(env.CACHE);
  expect(await store.write('test:entry', { greeting: 'hello' }, 300)).toBe(
    true,
  );
  expect(await store.read<{ greeting: string }>('test:entry')).toEqual({
    greeting: 'hello',
  });
  expect(await store.remove('test:entry')).toBe(true);
  expect(await store.read('test:entry')).toBeNull();
});

it('runs the loader once per uncached key and validates the cached shape', async () => {
  const store = createCacheStore(env.CACHE);
  const loader = vi.fn(async () => ({ count: 1 }));
  expect(await store.getOrSet('test:orset', 300, loader)).toEqual({ count: 1 });
  expect(await store.getOrSet('test:orset', 300, loader)).toEqual({ count: 1 });
  expect(loader).toHaveBeenCalledTimes(1);

  await env.CACHE.put('test:stale', JSON.stringify('not-an-object'), {
    expirationTtl: 300,
  });
  expect(
    await store.read('test:stale', z.object({ count: z.number() })),
  ).toBeNull();
});

it('fails open on cache errors without leaking error details', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const kv = {
    get: vi.fn().mockRejectedValue(new Error('secret read details')),
    put: vi.fn().mockRejectedValue(new Error('secret write details')),
    delete: vi.fn().mockRejectedValue(new Error('secret delete details')),
    list: vi.fn().mockRejectedValue(new Error('secret list details')),
  } as unknown as KVNamespace;
  const store = createCacheStore(kv);
  expect(await store.read('test:fail')).toBeNull();
  expect(await store.write('test:fail', 'value', 300)).toBe(false);
  expect(await store.remove('test:fail')).toBe(false);
  expect(await store.listKeys('test:')).toEqual([]);
  const loader = vi.fn(async () => 'fresh');
  expect(await store.getOrSet('test:fail', 300, loader)).toBe('fresh');
  const output = errors.mock.calls.flat().join('');
  expect(output).toContain('cache_operation_failed');
  expect(output).not.toContain('secret');
});

it('lists key names under a prefix', async () => {
  const store = createCacheStore(env.CACHE);
  await store.write('test:list:a', 1, 300);
  await store.write('test:list:b', 2, 300);
  await store.write('test:other', 3, 300);
  expect((await store.listKeys('test:list:')).sort()).toEqual([
    'test:list:a',
    'test:list:b',
  ]);
});
it('stores, reads, and deletes entries through the API', async () => {
  const auth = await register();
  const put = await request('/cache/entries', {
    method: 'PUT',
    cookie: auth.cookie,
    body: { name: 'daily-greeting', value: 'Hello from the game client' },
  });
  expect(put.status).toBe(200);
  expect(storedResponseSchema.parse(await put.json())).toEqual({
    name: 'daily-greeting',
    ttlSeconds: 300,
    status: 'stored',
  });
  expect(put.headers.get('Cache-Control')).toBe('no-store');
  expect(put.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);

  const get = await request('/cache/entries/daily-greeting', {
    method: 'GET',
    cookie: auth.cookie,
  });
  expect(get.status).toBe(200);
  expect(cacheEntryResponseSchema.parse(await get.json())).toEqual({
    name: 'daily-greeting',
    value: 'Hello from the game client',
  });

  const remove = await request('/cache/entries/daily-greeting', {
    method: 'DELETE',
    cookie: auth.cookie,
  });
  expect(remove.status).toBe(204);

  const missing = await request('/cache/entries/daily-greeting', {
    method: 'GET',
    cookie: auth.cookie,
  });
  expect(missing.status).toBe(404);
  expect(errorSchema.parse(await missing.json())).toEqual({
    statusCode: 404,
    message: 'Entry not found',
    error: 'Not Found',
  });
});

it('scopes entries to the authenticated user', async () => {
  const alice = await register();
  const bob = await register('other-player@example.com');
  await request('/cache/entries', {
    method: 'PUT',
    cookie: alice.cookie,
    body: { name: 'daily-greeting', value: 'private to alice' },
  });
  const response = await request('/cache/entries/daily-greeting', {
    method: 'GET',
    cookie: bob.cookie,
  });
  expect(response.status).toBe(404);
  expect(
    await createCacheStore(env.CACHE).read(
      cacheKeys.entry(alice.user.id, 'daily-greeting'),
    ),
  ).toBe('private to alice');
});

it('requires authentication and rejects invalid input', async () => {
  const anonymous = await request('/cache/entries', {
    method: 'PUT',
    body: { name: 'daily-greeting', value: 'Hello from the game client' },
  });
  expect(anonymous.status).toBe(401);

  const auth = await register();
  const badName = await request('/cache/entries', {
    method: 'PUT',
    cookie: auth.cookie,
    body: { name: 'Bad_Name', value: 'Hello from the game client' },
  });
  expect(badName.status).toBe(400);
  expect(errorSchema.parse(await badName.json()).message).toBe(
    'Invalid request',
  );

  const shortTtl = await request('/cache/entries', {
    method: 'PUT',
    cookie: auth.cookie,
    body: { name: 'daily-greeting', value: 'Hello', ttlSeconds: 30 },
  });
  expect(shortTtl.status).toBe(400);

  const badPath = await request('/cache/entries/Bad_Name', {
    method: 'GET',
    cookie: auth.cookie,
  });
  expect(badPath.status).toBe(400);
});

it('returns 503 without leaking details when a write fails', async () => {
  vi.spyOn(env.CACHE, 'put').mockRejectedValue(new Error('secret failure'));
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const auth = await register();
  const response = await request('/cache/entries', {
    method: 'PUT',
    cookie: auth.cookie,
    body: { name: 'daily-greeting', value: 'Hello from the game client' },
  });
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    statusCode: 503,
    message: 'Cache unavailable',
    error: 'Service Unavailable',
  });
  expect(errors.mock.calls.flat().join('')).not.toContain('secret');
});

it('rejects untrusted browser writes and form bodies without changing the cache', async () => {
  const auth = await register();
  const write = vi.spyOn(env.CACHE, 'put');
  const remove = vi.spyOn(env.CACHE, 'delete');
  const origins: Record<string, string>[] = [
    { Origin: 'https://evil.example' },
    { Origin: 'null' },
    { 'Sec-Fetch-Site': 'cross-site' },
  ];
  for (const headers of origins) {
    const response = await app.request(
      '/cache/entries',
      {
        method: 'PUT',
        headers: {
          Cookie: auth.cookie,
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ name: 'private', value: 'keep' }),
      },
      env,
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  }
  const form = await app.request(
    '/cache/entries',
    {
      method: 'PUT',
      headers: { Cookie: auth.cookie, 'Content-Type': 'text/plain' },
      body: JSON.stringify({ name: 'private', value: 'keep' }),
    },
    env,
  );
  expect(form.status).toBe(415);
  const deleted = await app.request(
    '/cache/entries/private',
    {
      method: 'DELETE',
      headers: { Cookie: auth.cookie, Origin: 'https://evil.example' },
    },
    env,
  );
  expect(deleted.status).toBe(403);
  expect(write).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

it('allows writes from an approved web origin and limits by authenticated user', async () => {
  const auth = await register();
  const response = await app.request(
    '/cache/entries',
    {
      method: 'PUT',
      headers: {
        Cookie: auth.cookie,
        Origin: 'https://app.example.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'private', value: 'hello' }),
    },
    env,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
    'https://app.example.com',
  );
  expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  const limit = vi
    .spyOn(env.CACHE_RATE_LIMIT, 'limit')
    .mockResolvedValue({ success: false });
  const limited = await request('/cache/entries/private', {
    method: 'DELETE',
    cookie: auth.cookie,
  });
  expect(limited.status).toBe(429);
  expect(limited.headers.get('Retry-After')).toBe('60');
  expect(limit).toHaveBeenCalledWith({ key: auth.user.id });
  limit.mockRejectedValue(new Error('private limiter details'));
  expect(
    (
      await request('/cache/entries/private', {
        method: 'DELETE',
        cookie: auth.cookie,
      })
    ).status,
  ).toBe(503);
});

it('documents the cache contract', async () => {
  const spec = await (
    await exports.default.fetch('https://example.com/openapi.json')
  ).json<{
    paths: Record<
      string,
      Record<
        string,
        {
          operationId: string;
          security: unknown;
          requestBody?: {
            content: Record<string, { examples: Record<string, unknown> }>;
          };
          responses: Record<
            string,
            {
              headers: Record<string, unknown>;
              content?: Record<string, { example: unknown }>;
            }
          >;
        }
      >
    >;
  }>();
  const put = spec.paths['/cache/entries']?.put;
  const get = spec.paths['/cache/entries/{name}']?.get;
  const del = spec.paths['/cache/entries/{name}']?.delete;
  expect(put?.operationId).toBe('storeCacheEntry');
  expect(put?.security).toEqual([{ cookieAuth: [] }]);
  expect(get?.operationId).toBe('getCacheEntry');
  expect(del?.operationId).toBe('deleteCacheEntry');
  expect(Object.keys(put?.responses ?? {}).sort()).toEqual([
    '200',
    '400',
    '401',
    '403',
    '413',
    '415',
    '429',
    '500',
    '503',
  ]);
  expect(Object.keys(get?.responses ?? {}).sort()).toEqual([
    '200',
    '400',
    '401',
    '404',
    '500',
    '503',
  ]);
  expect(Object.keys(del?.responses ?? {}).sort()).toEqual([
    '204',
    '400',
    '401',
    '403',
    '429',
    '500',
    '503',
  ]);
  const putBody = put?.requestBody?.content['application/json'];
  expect(putBody).toBeDefined();
  const example = (
    putBody?.examples as Record<string, { value: unknown }> | undefined
  )?.entry?.value;
  expect(cachePutSchema.safeParse(example).success).toBe(true);
  expect(
    storedResponseSchema.safeParse(
      put?.responses['200']?.content?.['application/json']?.example,
    ).success,
  ).toBe(true);
  for (const operation of [put, get, del]) {
    for (const [status, response] of Object.entries(
      operation?.responses ?? {},
    )) {
      if (Number(status) >= 400) {
        expect(
          errorSchema.parse(response.content?.['application/json']?.example)
            .statusCode,
        ).toBe(Number(status));
      }
      expect(response.headers).toHaveProperty('Cache-Control');
      expect(response.headers).toHaveProperty('X-Request-Id');
      expect(Object.hasOwn(response.headers, 'Retry-After')).toBe(
        status === '429',
      );
    }
  }
});
