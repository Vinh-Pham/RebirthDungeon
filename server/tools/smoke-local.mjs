import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withLocalD1 } from './online-database.mjs';
import { addresses } from './online-config.mjs';
import { resolve } from 'node:path';
import { tsImport } from 'tsx/esm/api';
const { findPath, isWalkable } = await tsImport(
  '../../packages/game-core/src/engine/world/TileMap.ts',
  import.meta.url,
);

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
    '/api/game/characters/{id}/inventory',
    '/api/game/characters/{id}/inventory/hotbar',
    '/api/game/characters/{id}/equipment/preview',
    '/api/game/characters/{id}/encounter/actions',
    '/api/game/characters/{id}/encounter/settlement',
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
  assert.equal(created.character.revision, 1);
  const characterId = created.character.id;
  const replay = await (
    await request('/api/game/characters', creationBody, current)
  ).json();
  assert.deepEqual(replay.receipt, created.receipt);
  const actionBody = {
    commandId: randomUUID(),
    expectedRevision: 1,
    itemId: 'potion',
    assigned: true,
  };
  const action = await request(
    `/api/game/characters/${characterId}/inventory/hotbar`,
    actionBody,
    current,
  );
  assert.equal(action.status, 200);
  const committed = await action.json();
  assert.equal(committed.snapshotRevision, 2);
  const duplicate = await (
    await request(
      `/api/game/characters/${characterId}/inventory/hotbar`,
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
  let revision = committed.snapshotRevision;
  async function read(feature) {
    const response = await request(
      `/api/game/characters/${characterId}/${feature}?expectedRevision=${revision}`,
      undefined,
      current,
    );
    assert.equal(
      response.status,
      200,
      `${feature}: ${await response.clone().text()}`,
    );
    const result = await response.json();
    assert.equal(result.apiVersion, 2);
    assert.equal(result.revision, revision);
    return result.data;
  }
  async function act(path, fields = {}) {
    const response = await request(
      `/api/game/characters/${characterId}/${path}`,
      { commandId: randomUUID(), expectedRevision: revision, ...fields },
      current,
    );
    assert.equal(
      response.status,
      200,
      `${path}: ${await response.clone().text()}`,
    );
    const result = await response.json();
    assert.equal(result.snapshotRevision, revision + 1);
    revision = result.snapshotRevision;
    return result;
  }
  assert.ok((await read('inventory')).itemHotbar.includes('potion'));
  await read('progression');
  await read('stats');
  await read('resources');
  const preview = await request(
    `/api/game/characters/${characterId}/equipment/preview`,
    { expectedRevision: revision, item: { slot: 'weapon' } },
    current,
  );
  assert.equal(preview.status, 200, await preview.clone().text());
  // Navigate using public geometry; every action still passes through the authoritative HTTP API.
  let journey = await read('journey');
  function pathTo(target) {
    if (target.kind === 'encounter')
      return findPath(journey.map, journey.position, target);
    const goals = [
      { x: target.x + 1, y: target.y },
      { x: target.x - 1, y: target.y },
      { x: target.x, y: target.y + 1 },
      { x: target.x, y: target.y - 1 },
    ].filter((p) => isWalkable(journey.map, p));
    const paths = goals
      .map((goal) => findPath(journey.map, journey.position, goal))
      .filter(
        (path, i) =>
          path.length ||
          (goals[i].x === journey.position.x &&
            goals[i].y === journey.position.y),
      );
    assert.ok(paths.length, 'No route to smoke target');
    return paths.sort((a, b) => a.length - b.length)[0];
  }
  async function approach(object) {
    let latest;
    for (const step of pathTo(object)) {
      const update = await act('journey/move', {
        dx: step.x - journey.position.x,
        dy: step.y - journey.position.y,
      });
      journey = update.updates.journey ?? journey;
      latest = update;
    }
    if (latest?.updates.encounter) return latest;
    const result = await act('journey/interact', { objectId: object.id });
    journey = result.updates.journey ?? journey;
    return result;
  }
  await approach(
    journey.map.objects.find(
      (o) => o.kind === 'chest' && o.itemId === 'iron-blade',
    ),
  );
  const inventory = await read('inventory'),
    weaponId = Object.keys(inventory.weapons)[0];
  await act('equipment/weapon', { weaponId });
  await approach(
    journey.map.objects.find(
      (o) => o.kind === 'portal' && o.destination === 'halls',
    ),
  );
  await approach(journey.map.objects.find((o) => o.kind === 'encounter'));
  let battle = await read('encounter');
  for (
    let turn = 0;
    battle && !['victory', 'defeat'].includes(battle.phase) && turn < 120;
    turn++
  ) {
    const attack = battle.actions.find(
      (a) => a.action.action === 'attack' && !a.reason && a.targets.length,
    );
    assert.ok(attack, 'No basic attack available');
    const result = await act('encounter/actions', {
      action: attack.action,
      targetId: attack.targets[0],
    });
    battle = result.updates.encounter ?? (await read('encounter'));
  }
  assert.ok(['victory', 'defeat'].includes(battle.phase));
  const settlement = await act('encounter/settlement');
  assert.equal(settlement.updates.encounter, null);
  assert.equal(await read('encounter'), null);
  journey = await read('journey');
  await approach(
    journey.map.objects.find(
      (o) => o.kind === 'portal' && o.destination === 'refuge',
    ),
  );
  await approach(
    journey.map.objects.find(
      (o) => o.kind === 'portal' && o.destination === 'grocery-interior',
    ),
  );
  const shop = journey.map.objects.find((o) => o.kind === 'merchant');
  await approach(shop);
  await act(`services/${encodeURIComponent(shop.id)}/purchases`, {
    itemId: 'bread',
    quantity: 1,
  });
  await act('services/close');

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
