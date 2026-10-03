import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withLocalD1 } from './online-database.mjs';
import { addresses } from './online-config.mjs';
import { resolve } from 'node:path';

const origin = new URL(process.env.LOCAL_API_ORIGIN ?? 'http://localhost:8787');
if (
  (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) &&
    !addresses().some((entry) => entry.address === origin.hostname)) ||
  origin.protocol !== 'http:' ||
  origin.username ||
  origin.password ||
  origin.search ||
  origin.hash ||
  origin.pathname !== '/'
)
  throw new Error('The smoke test only accepts a local HTTP server.');
const email = `smoke-${randomUUID()}@example.invalid`;
const password = `local-only-${randomUUID()}`;
const timings = {};
const cookieFrom = (response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

async function request(path, body, cookie) {
  const start = performance.now();
  const response = await fetch(new URL(path, origin), {
    method: body !== undefined ? 'POST' : 'GET',
    redirect: 'error',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin.origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  timings[path] = Math.round(performance.now() - start);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  return response;
}

try {
  const specification = await (
    await fetch(new URL('/openapi.json', origin))
  ).json();
  for (const path of [
    '/api/game/content',
    '/api/game/characters',
    '/api/game/characters/{id}',
    '/api/game/characters/{id}/previews',
    '/api/game/characters/{id}/commands',
  ])
    assert.ok(specification.paths[path], `Missing game contract: ${path}`);
  const registered = await request('/api/auth/sign-up/email', {
    name: 'Player',
    email,
    password,
  });
  assert.equal(registered.status, 200);
  const first = cookieFrom(registered);
  const firstSession = await (
    await request('/api/auth/get-session', undefined, first)
  ).json();
  assert.equal(firstSession.user.email, email);
  const login = await request('/api/auth/sign-in/email', { email, password });
  assert.equal(login.status, 200);
  const current = cookieFrom(login);
  assert.equal(
    await (await request('/api/auth/get-session', undefined, first)).json(),
    null,
  );
  assert.equal(
    (await request('/cache/entries/smoke', undefined, first)).status,
    401,
  );
  const session = await (
    await request('/api/auth/get-session', undefined, current)
  ).json();
  assert.equal(session.user.id, firstSession.user.id);
  assert.equal(
    new Date(session.session.expiresAt).getTime() -
      new Date(session.session.createdAt).getTime() <
      7 * 86400000 + 1000,
    true,
  );
  assert.equal(
    (await request('/cache/entries/smoke', undefined, current)).status,
    404,
  );
  const creationBody = {
    commandId: randomUUID(),
    name: 'Smoke Player',
    talent: 'warrior',
    age: 12,
  };
  const createdResponse = await request(
    '/api/game/characters',
    creationBody,
    current,
  );
  assert.equal(createdResponse.status, 200);
  const created = await createdResponse.json();
  assert.equal(created.view.character.revision, 1);
  const characterId = created.view.character.id;
  const replay = await (
    await request('/api/game/characters', creationBody, current)
  ).json();
  assert.deepEqual(replay.receipt, created.receipt);
  const actionBody = {
    commandId: randomUUID(),
    expectedRevision: 1,
    command: { type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true },
  };
  const action = await request(
    `/api/game/characters/${characterId}/commands`,
    actionBody,
    current,
  );
  assert.equal(action.status, 200);
  const committed = await action.json();
  assert.equal(committed.view.character.revision, 2);
  const duplicate = await (
    await request(
      `/api/game/characters/${characterId}/commands`,
      actionBody,
      current,
    )
  ).json();
  assert.deepEqual(duplicate.receipt, committed.receipt);
  assert.equal(
    (await request(`/api/game/characters/${characterId}`, undefined, first))
      .status,
    401,
  );
  assert.equal(
    (await request(`/api/game/characters/${characterId}`, undefined, current))
      .status,
    200,
  );
  const logout = await request('/api/auth/sign-out', {}, current);
  assert.equal(logout.status, 200);
  assert.equal((await logout.json()).success, true);
  assert.equal(
    await (await request('/api/auth/get-session', undefined, current)).json(),
    null,
  );
  assert.equal(
    (await request('/cache/entries/smoke', undefined, current)).status,
    401,
  );
  console.log(
    JSON.stringify({
      result: 'Local HTTP Better Auth and authoritative game flow passed',
      elapsedMs: timings,
    }),
  );
} finally {
  // Only this run's synthetic account is removed, through the local D1 binding.
  await withLocalD1(
    process.cwd(),
    process.env.LOCAL_D1_STATE && resolve(process.env.LOCAL_D1_STATE),
    async (db) => {
      await db.prepare('DELETE FROM user WHERE email = ?').bind(email).run();
    },
  );
}
