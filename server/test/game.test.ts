import {
  distance,
  findPath,
  isWalkable,
} from '@rebirth/game-core/engine/world/TileMap';
import { env } from 'cloudflare:workers';
import { applyD1Migrations, reset } from 'cloudflare:test';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { app } from '../src/index.js';
import { register } from './auth-helpers.js';
import {
  CommandResponseSchema,
  PublicViewSchema,
  type OnlineCommand,
} from '@rebirth/game-core/online/Contracts';
import {
  gameContent,
  newOnlineState,
  execute,
  validateOnlineState,
} from '@rebirth/game-core/online/Runtime';
import {
  GameRepository,
  requestHash,
  stateDiff,
} from '../src/game/repository.js';
import { encodeState, decodeState } from '../src/game/codec.js';
import { addItem, restoreHero } from '@rebirth/game-core/engine/rpg/Character';
import {
  generateDungeon,
  createDungeonRun,
  projectDungeonMap,
} from '@rebirth/game-core/engine/dungeon/Dungeon';

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
afterEach(() => vi.restoreAllMocks());
function request(
  path: string,
  cookie?: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return app.request(
    '/api/game' + path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env,
  );
}
async function create(cookie: string, commandId = crypto.randomUUID()) {
  const response = await request('/characters', cookie, {
    commandId,
    name: '  Player  ',
    talent: 'warrior',
    age: 12,
  });
  expect(response.status, await response.clone().text()).toBe(200);
  return CommandResponseSchema.parse(await response.json());
}
async function command(
  cookie: string,
  id: string,
  revision: number,
  command: OnlineCommand,
  commandId = crypto.randomUUID(),
) {
  const response = await request(`/characters/${id}/commands`, cookie, {
    commandId,
    expectedRevision: revision,
    command,
  });
  return response;
}
async function accepted(
  cookie: string,
  id: string,
  revision: number,
  intent: OnlineCommand,
) {
  const response = await command(cookie, id, revision, intent);
  expect(response.status, await response.clone().text()).toBe(200);
  return CommandResponseSchema.parse(await response.json());
}

it('creates fresh characters atomically, lists owned summaries, and keeps auth intact', async () => {
  const { cookie, user } = await register();
  const first = await create(cookie);
  expect(first.view.character.name).toBe('Player');
  expect(first.view.character.revision).toBe(1);
  expect(first.view.hero.ap).toBe(5);
  const second = await create(cookie);
  const listing = await request('/characters', cookie);
  expect(
    (await listing.json<{ characters: unknown[] }>()).characters,
  ).toHaveLength(2);
  expect(second.view.character.id).not.toBe(first.view.character.id);
  expect(
    await env.DB.prepare('SELECT id FROM user WHERE id = ?')
      .bind(user.id)
      .first('id'),
  ).toBe(user.id);
  const current = await request(
    '/characters/' + first.view.character.id,
    cookie,
  );
  expect(PublicViewSchema.parse(await current.json())).toEqual(first.view);
  expect(current.headers.get('Cache-Control')).toBe('no-store');
  expect(JSON.stringify(first.view)).not.toContain('randomState');
});
it('rejects missing sessions, cross-account access, malformed/forged/unsupported commands', async () => {
  expect((await request('/characters')).status).toBe(401);
  const owner = await register();
  const hero = await create(owner.cookie);
  const other = await register('other@example.com');
  const id = hero.view.character.id;
  for (const [path, body] of [
    [`/characters/${id}`, undefined],
    [
      `/characters/${id}/commands`,
      {
        commandId: crypto.randomUUID(),
        expectedRevision: 1,
        command: { type: 'STOP_REST' },
      },
    ],
    [
      `/characters/${id}/previews`,
      {
        expectedRevision: 1,
        selection: { type: 'EQUIPMENT', item: { weaponId: 'weapon-1' } },
      },
    ],
  ] as const)
    expect((await request(path, other.cookie, body)).status).toBe(404);
  for (const intent of [
    { type: 'ATTACK', attackerId: 'player', targetId: 'enemy' },
    { type: 'REST', entityId: 'player' },
    { type: 'DEBUG_GOLD', gold: 9999 },
    { type: 'MOVE', dx: 1, dy: 0, gold: 99 },
    {
      type: 'BATTLE_ACTION',
      action: { action: 'attack' },
      targetId: 'enemy',
      randomState: [1, 2, 3, 4],
    },
  ])
    expect(
      (
        await request(`/characters/${id}/commands`, owner.cookie, {
          commandId: crypto.randomUUID(),
          expectedRevision: 1,
          command: intent,
        })
      ).status,
    ).toBe(400);
  expect(
    (
      await command(owner.cookie, id, 1, {
        type: 'EQUIP_WEAPON',
        weaponId: 'weapon-999',
      })
    ).status,
  ).toBe(422);
});
it('replays durable receipts unchanged while returning the current view and rejects changed input', async () => {
  const { cookie } = await register(),
    creationId = crypto.randomUUID();
  const first = await create(cookie, creationId);
  const again = await create(cookie, creationId);
  expect(again).toEqual(first);
  const id = first.view.character.id;
  const commandId = crypto.randomUUID(),
    body = {
      commandId,
      expectedRevision: 1,
      command: { type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true },
    };
  const result = await request(`/characters/${id}/commands`, cookie, body);
  expect(result.status).toBe(200);
  const committed = CommandResponseSchema.parse(await result.json());
  await accepted(cookie, id, 2, {
    type: 'SET_ITEM_HOTBAR',
    itemId: 'potion',
    assigned: false,
  });
  const replay = CommandResponseSchema.parse(
    await (await request(`/characters/${id}/commands`, cookie, body)).json(),
  );
  expect(replay.receipt).toEqual(committed.receipt);
  expect(replay.view.character.revision).toBe(3);
  expect(
    (
      await request(`/characters/${id}/commands`, cookie, {
        ...body,
        command: { type: 'STOP_REST' },
      })
    ).status,
  ).toBe(409);
  expect((await command(cookie, id, 1, { type: 'STOP_REST' })).status).toBe(
    409,
  );
});
it('allows only one competing revision and one competing creation ID to commit', async () => {
  const { cookie } = await register();
  const creationId = crypto.randomUUID();
  const creations = await Promise.all([
    create(cookie, creationId),
    create(cookie, creationId),
  ]);
  expect(creations[0].view.character.id).toBe(creations[1].view.character.id);
  const id = creations[0].view.character.id;
  const responses = await Promise.all([
    command(cookie, id, 1, {
      type: 'SET_ITEM_HOTBAR',
      itemId: 'potion',
      assigned: true,
    }),
    command(cookie, id, 1, {
      type: 'SET_ITEM_HOTBAR',
      itemId: 'potion',
      assigned: false,
    }),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    await env.DB.prepare(
      'SELECT count(*) FROM game_command_receipts WHERE character_id=?',
    )
      .bind(id)
      .first('count(*)'),
  ).toBe(2);
  expect(
    await env.DB.prepare('SELECT count(*) FROM game_characters').first(
      'count(*)',
    ),
  ).toBe(1);
});
it('rolls back creation and every affected table when a later batch statement fails', async () => {
  const { cookie } = await register();
  await env.DB.prepare(
    "CREATE TRIGGER game_test_fail BEFORE INSERT ON game_heroes BEGIN SELECT RAISE(ABORT,'simulated_failure'); END",
  ).run();
  expect(
    (
      await request('/characters', cookie, {
        commandId: crypto.randomUUID(),
        name: 'Player',
        talent: 'mage',
        age: 12,
      })
    ).status,
  ).toBe(503);
  for (const table of [
    'game_characters',
    'game_command_receipts',
    'game_heroes',
    'game_campaigns',
    'game_rng_streams',
  ])
    expect(
      await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first('n'),
    ).toBe(0);
  await env.DB.prepare('DROP TRIGGER game_test_fail').run();
  const first = await create(cookie),
    id = first.view.character.id;
  await env.DB.prepare(
    "CREATE TRIGGER game_test_fail BEFORE INSERT ON game_item_hotbar BEGIN SELECT RAISE(ABORT,'simulated_failure'); END",
  ).run();
  const commandId = crypto.randomUUID();
  expect(
    (
      await command(
        cookie,
        id,
        1,
        { type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true },
        commandId,
      )
    ).status,
  ).toBe(503);
  expect(
    await env.DB.prepare('SELECT revision FROM game_characters WHERE id=?')
      .bind(id)
      .first('revision'),
  ).toBe(1);
  expect(
    await env.DB.prepare(
      'SELECT count(*) AS n FROM game_command_receipts WHERE command_id=?',
    )
      .bind(commandId)
      .first('n'),
  ).toBe(0);
  expect(
    PublicViewSchema.parse(
      await (await request('/characters/' + id, cookie)).json(),
    ),
  ).toEqual(first.view);
});
it('protects origins, body size, rate limits and handles storage failure without credentials', async () => {
  const { cookie } = await register();
  expect(
    (
      await request(
        '/characters',
        cookie,
        {},
        { Origin: 'https://evil.example' },
      )
    ).status,
  ).toBe(403);
  expect(
    (await request('/characters', cookie, { text: 'a'.repeat(5000) })).status,
  ).toBe(413);
  vi.spyOn(env.GAME_RATE_LIMIT, 'limit').mockResolvedValueOnce({
    success: false,
  });
  const limited = await request('/characters', cookie);
  expect(limited.status).toBe(429);
  expect(limited.headers.get('Retry-After')).toBe('60');
  vi.spyOn(env.DB, 'prepare').mockImplementationOnce(() => {
    throw new Error('secret SQL parameters');
  });
  const unavailable = await request('/characters', cookie);
  expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).not.toContain('secret');
});
it('round trips all progression, equipment, blueprint and mutable dungeon fields relationally', async () => {
  const { cookie, user } = await register(),
    created = await create(cookie),
    id = created.view.character.id,
    repository = new GameRepository(env.DB, user.id),
    before = await repository.load(id);
  const state = before.state,
    h = state.campaign.hero;
  for (const item of ['iron-blade', 'leather-armor', 'potion']) {
    if (gameContent.data.items.some((i) => i.id === item))
      addItem(h, item, 1, gameContent);
  }
  h.inventory['potion'] = 999;
  h.itemHotbar = ['potion'];
  h.fullness = 75.3;
  h.weapons['weapon-1'].locked = false;
  h.enchanting.receipts = [
    {
      id: 'enchant-1',
      kind: 'burn',
      message: 'done',
      success: true,
      recovered: ['resilience-scroll'],
    },
  ];
  h.enchanting.nextOperationId = 2;
  const definition = gameContent.data.dungeons[0],
    blueprint = generateDungeon(definition, 9876, h.classId);
  state.campaign.dungeon = createDungeonRun(blueprint, {
    worldId: state.campaign.worldId,
    position: state.campaign.position,
  });
  state.campaign.worldId = blueprint.world.id;
  state.campaign.position = blueprint.world.entry;
  validateOnlineState(state, 'Player');
  const encoded = encodeState(id, state),
    decoded = decodeState(encoded, 'warrior');
  expect(decoded).toEqual(state);
  await env.DB.batch(stateDiff(env.DB, before.rows, encoded));
  expect((await repository.load(id)).state).toEqual(state);
  const other = await create(cookie);
  await expect(
    env.DB.prepare('UPDATE game_loadouts SET weapon_id=? WHERE character_id=?')
      .bind('weapon-999', other.view.character.id)
      .run(),
  ).rejects.toThrow();
});
it('persists battle boundaries and settles a single server reward offer exactly once', async () => {
  const { cookie, user } = await register();
  let result = await create(cookie),
    id = result.view.character.id;
  for (const intent of [
    { type: 'TRAVEL_TO', x: 7, y: 3 },
    { type: 'INTERACT', objectId: 'east' },
    { type: 'TRAVEL_TO', x: 5, y: 3 },
  ] as const)
    result = await accepted(cookie, id, result.view.character.revision, intent);
  expect(result.view.encounter).toBeDefined();
  const repository = new GameRepository(env.DB, user.id);
  let checkpoint = await repository.load(id);
  for (let i = 0; i < 120 && !checkpoint.state.battle!.combat.outcome; i++) {
    const enemy = checkpoint.state.battle!.entities.find(
      (e) => e.enemy && !e.dead && e.health!.current > 0,
    )!;
    const intent = {
      type: 'BATTLE_ACTION',
      action: { action: 'attack' },
      targetId: enemy.id,
    } as const;
    const reference = execute(
      checkpoint.state,
      'Player',
      intent,
      Date.now(),
    ).state;
    result = await accepted(cookie, id, result.view.character.revision, intent);
    checkpoint = await new GameRepository(env.DB, user.id).load(id);
    expect(checkpoint.state).toEqual(reference);
  }
  expect(checkpoint.state.battle!.combat.outcome).toBeDefined();
  if (checkpoint.state.battle!.combat.outcome === 'victory')
    expect(checkpoint.state.rewards).toBeDefined();
  const commandId = crypto.randomUUID(),
    body = {
      commandId,
      expectedRevision: result.view.character.revision,
      command: { type: 'SETTLE_ENCOUNTER' },
    };
  const response = await request(`/characters/${id}/commands`, cookie, body);
  expect(response.status, await response.clone().text()).toBe(200);
  const settled = CommandResponseSchema.parse(await response.json());
  expect(settled.view.encounter).toBeUndefined();
  expect(
    CommandResponseSchema.parse(
      await (await request(`/characters/${id}/commands`, cookie, body)).json(),
    ),
  ).toEqual(settled);
  expect(
    await env.DB.prepare(
      'SELECT count(*) AS n FROM game_encounters WHERE character_id=?',
    )
      .bind(id)
      .first('n'),
  ).toBe(0);
});
it('previews do not change revisions, RNG or balances', async () => {
  const { cookie, user } = await register(),
    hero = await create(cookie),
    id = hero.view.character.id,
    repository = new GameRepository(env.DB, user.id),
    before = await repository.load(id);
  const response = await request(`/characters/${id}/previews`, cookie, {
    expectedRevision: 1,
    selection: { type: 'EQUIPMENT', item: { slot: 'weapon' } },
  });
  expect(response.status, await response.clone().text()).toBe(200);
  expect((await repository.load(id)).state).toEqual(before.state);
  expect((await repository.load(id)).character.revision).toBe(1);
});
it('preserves live status, cooldown, consumption and hotbar state across D1 restoration', async () => {
  const { cookie, user } = await register(),
    created = await create(cookie),
    id = created.view.character.id;
  const repository = new GameRepository(env.DB, user.id);
  let current = await repository.load(id);
  current.state.campaign.hero.itemHotbar = ['potion'];
  current.state.campaign.hero.inventory.potion = 1;
  for (const intent of [
    { type: 'TRAVEL_TO', x: 7, y: 3 },
    { type: 'INTERACT', objectId: 'east' },
    { type: 'TRAVEL_TO', x: 5, y: 3 },
  ] as const)
    current.state = execute(current.state, 'Player', intent, 1000).state;
  const player = current.state.battle!.entities.find((e) => e.player)!;
  const enemy = current.state.battle!.entities.find((e) => e.enemy)!;
  player.statuses = [
    { id: 'poison', sourceId: enemy.id, remainingTurns: 3, stacks: 1 },
  ];
  player.cooldowns = { firebolt: 4 };
  current.state.battle!.training.counts.firebolt = {};
  player.health!.current = player.health!.max - 5;
  const saved = structuredClone(current.state);
  validateOnlineState(saved, 'Player');
  await env.DB.batch(stateDiff(env.DB, current.rows, encodeState(id, saved)));
  current = await repository.load(id);
  expect(current.state).toEqual(saved);
  const intent = {
    type: 'BATTLE_ACTION',
    action: { action: 'item', itemId: 'potion' },
    targetId: 'player',
  } as const;
  const candidate = execute(current.state, 'Player', intent, Date.now()).state;
  await accepted(cookie, id, current.character.revision, intent);
  const restored = await new GameRepository(env.DB, user.id).load(id);
  expect(restored.state).toEqual(candidate);
  const live = restored.state.battle!.entities.find((e) => e.player)!;
  expect(live.inventory!.potion).toBeUndefined();
  expect(live.itemHotbar).toEqual(['potion']);
  expect(restored.state.campaign.hero.inventory.potion).toBe(1);
});
it('settles defeat recovery and the half-gold penalty only once', async () => {
  const { cookie, user } = await register(),
    created = await create(cookie),
    id = created.view.character.id;
  const repository = new GameRepository(env.DB, user.id);
  let current = await repository.load(id);
  current.state.campaign.hero.gold = 101;
  for (const intent of [
    { type: 'TRAVEL_TO', x: 7, y: 3 },
    { type: 'INTERACT', objectId: 'east' },
    { type: 'TRAVEL_TO', x: 5, y: 3 },
  ] as const)
    current.state = execute(current.state, 'Player', intent, 1000).state;
  current.state.battle!.entities.find((e) => e.player)!.health!.current = 1;
  await env.DB.batch(
    stateDiff(env.DB, current.rows, encodeState(id, current.state)),
  );
  current = await repository.load(id);
  for (let i = 0; i < 50 && !current.state.battle!.combat.outcome; i++) {
    await accepted(cookie, id, current.character.revision, {
      type: 'BATTLE_ACTION',
      action: { action: 'defend' },
      targetId: 'player',
    });
    current = await repository.load(id);
  }
  expect(current.state.battle!.combat.outcome).toBe('defeat');
  const body = {
    commandId: crypto.randomUUID(),
    expectedRevision: current.character.revision,
    command: { type: 'SETTLE_ENCOUNTER' },
  };
  const response = await request(`/characters/${id}/commands`, cookie, body);
  expect(response.status, await response.clone().text()).toBe(200);
  const settled = CommandResponseSchema.parse(await response.json());
  expect(settled.view.hero.gold).toBe(50);
  expect(settled.view.hero.health).toBeGreaterThan(0);
  expect(settled.view.encounter).toBeUndefined();
  expect(
    CommandResponseSchema.parse(
      await (await request(`/characters/${id}/commands`, cookie, body)).json(),
    ),
  ).toEqual(settled);
  expect(
    (
      await command(cookie, id, settled.view.character.revision, {
        type: 'SETTLE_ENCOUNTER',
      })
    ).status,
  ).toBe(422);
});
it('keeps writes bounded and only updates changed rows', async () => {
  const { cookie, user } = await register(),
    hero = await create(cookie),
    id = hero.view.character.id,
    repository = new GameRepository(env.DB, user.id),
    before = await repository.load(id);
  expect(
    stateDiff(env.DB, before.rows, encodeState(id, before.state)),
  ).toHaveLength(0);
  const candidate = execute(
    before.state,
    'Player',
    { type: 'SET_ITEM_HOTBAR', itemId: 'potion', assigned: true },
    1000,
  );
  expect(
    stateDiff(env.DB, before.rows, encodeState(id, candidate.state)),
  ).toHaveLength(1);
  const receipt = {
    commandId: crypto.randomUUID(),
    characterId: id,
    baseRevision: 1,
    committedRevision: 2,
    createdAt: 1000,
    outcome: candidate.outcome,
  };
  const result = await repository.commit(
    before.character,
    before.rows,
    candidate.state,
    receipt,
    await requestHash(receipt),
  );
  expect(result.metrics.queries).toBe(2);
  expect(before.metrics.sqlBytes).toBeLessThan(100000);
});
it('supports catalog equipment quantity limits with indexed reads and a changed-row command', async () => {
  const { cookie, user } = await register(),
    created = await create(cookie),
    id = created.view.character.id;
  const repository = new GameRepository(env.DB, user.id);
  const before = await repository.load(id);
  const gear = gameContent.data.items.filter(
    (item) => item.kind === 'weapon' || item.kind === 'armor',
  );
  for (const item of gear)
    addItem(before.state.campaign.hero, item.id, 999, gameContent);
  for (const instance of [
    ...Object.values(before.state.campaign.hero.weapons),
    ...Object.values(before.state.campaign.hero.armors),
  ]) {
    const item = gameContent.item(instance.itemId);
    for (const slot of ['prefix', 'suffix'] as const) {
      const enchant = gameContent.data.enchants
        .filter(
          (e) =>
            e.slot === slot &&
            e.kinds.some((kind) => kind === item.kind) &&
            e.tags.every((tag) => item.weaponTags.includes(tag)),
        )
        .sort((a, b) => b.clauses.length - a.clauses.length)[0];
      if (enchant)
        instance[slot] = {
          enchantId: enchant.id,
          values: Object.fromEntries(
            enchant.clauses.map((clause) => [clause.id, clause.min]),
          ),
        };
    }
  }
  const rows = encodeState(id, before.state);
  expect(
    new TextEncoder().encode(JSON.stringify(rows.game_equipment_enchant_values))
      .length,
  ).toBeGreaterThan(2 * 1024 * 1024);
  await env.DB.batch(stateDiff(env.DB, before.rows, rows));
  const start = performance.now(),
    current = await repository.load(id);
  const readMs = performance.now() - start;
  expect(current.state).toEqual(before.state);
  const intent = {
    type: 'LOCK_EQUIPMENT',
    target: { weaponId: 'weapon-1' },
    locked: true,
  } as const;
  const candidate = execute(current.state, 'Player', intent, 1000);
  expect(
    stateDiff(env.DB, current.rows, encodeState(id, candidate.state)),
  ).toHaveLength(1);
  const started = performance.now();
  await accepted(cookie, id, current.character.revision, intent);
  console.log(
    JSON.stringify({
      event: 'game_inventory_cost',
      equipmentInstances: gear.length * 999,
      enchantValueRows: rows.game_equipment_enchant_values.length,
      readRows: current.metrics.rowsRead,
      readMs: Math.round(readMs),
      commandMs: Math.round(performance.now() - started),
      changedTableQueries: 1,
    }),
  );
  const afterLock = await repository.load(id);
  const drop = {
    type: 'DROP_ITEM',
    item: { itemId: 'moss-mail' },
    quantity: 3,
  } as const;
  const expectedDrop = execute(before.state, 'Player', drop, 1000).state;
  const afterDrop = await accepted(
    cookie,
    id,
    afterLock.character.revision,
    drop,
  );
  expect(afterDrop.view.hero.armors).toEqual(expectedDrop.campaign.hero.armors);
}, 50000);

it('executes shops, skill learning, quests, title selections and enchant outcomes through the shared rules', async () => {
  const { cookie, user } = await register(),
    created = await create(cookie),
    id = created.view.character.id,
    repository = new GameRepository(env.DB, user.id);
  let current = await repository.load(id);
  const fixture = current.state;
  fixture.campaign.hero.gold = 5000;
  fixture.campaign.hero.mana = 20;
  for (const item of [
    'iron-blade',
    'bread',
    'resilience-scroll',
    'enchant-powder',
    'mana-herb',
    'holy-water',
    'combat-manual',
  ])
    addItem(fixture.campaign.hero, item, 5, gameContent);
  fixture.campaign.hero.equipment.weapon = 'weapon-1';
  await env.DB.batch(stateDiff(env.DB, current.rows, encodeState(id, fixture)));
  current = await repository.load(id);
  async function act(intent: OnlineCommand) {
    const expected = execute(current.state, 'Player', intent, Date.now()).state;
    const result = await accepted(
      cookie,
      id,
      current.character.revision,
      intent,
    );
    current = await repository.load(id);
    expect(current.state).toEqual(expected);
    return result;
  }
  await act({ type: 'INTERACT', objectId: 'keeper' });
  await act({
    type: 'ACCEPT_QUEST',
    questId: 'refuge-preparations',
    objectId: 'keeper',
  });
  await act({ type: 'LEARN_SKILL', objectId: 'keeper', skillId: 'enchant' });
  await act({ type: 'CLOSE_SERVICE' });
  for (const pageId of ['sword-page-1', 'sword-page-2', 'sword-page-3']) {
    addItem(current.state.campaign.hero, pageId, 1, gameContent);
  }
  addItem(
    current.state.campaign.hero,
    'sword-manual-unfinished',
    1,
    gameContent,
  );
  await env.DB.batch(
    stateDiff(env.DB, current.rows, encodeState(id, current.state)),
  );
  current = await repository.load(id);
  for (const pageId of ['sword-page-1', 'sword-page-2', 'sword-page-3'])
    await act({ type: 'INSERT_SKILL_PAGE', recipeId: 'sword-manual', pageId });
  await act({ type: 'READ_SKILL_BOOK', itemId: 'sword-manual' });
  await act({ type: 'READ_SKILL_BOOK', itemId: 'combat-manual' });
  await act({ type: 'TRAVEL_TO', x: 5, y: 10 });
  await act({ type: 'INTERACT', objectId: 'grocery-door' });
  await act({ type: 'TRAVEL_TO', x: 4, y: 3 });
  await act({ type: 'INTERACT', objectId: 'grocery-keeper' });
  const bought = await act({
    type: 'BUY_ITEM',
    objectId: 'grocery-keeper',
    itemId: 'bread',
    quantity: 2,
  });
  const duplicateBody = {
    commandId: bought.receipt.commandId,
    expectedRevision: bought.receipt.baseRevision,
    command: {
      type: 'BUY_ITEM',
      objectId: 'grocery-keeper',
      itemId: 'bread',
      quantity: 2,
    },
  };
  expect(
    CommandResponseSchema.parse(
      await (
        await request(`/characters/${id}/commands`, cookie, duplicateBody)
      ).json(),
    ).receipt,
  ).toEqual(bought.receipt);
  await act({ type: 'CLOSE_SERVICE' });
  await act({ type: 'TRAVEL_TO', x: 4, y: 6 });
  await act({ type: 'INTERACT', objectId: 'exit' });
  await act({ type: 'TRAVEL_TO', x: 2, y: 3 });
  await act({ type: 'INTERACT', objectId: 'keeper' });
  await act({
    type: 'CLAIM_QUEST',
    questId: 'refuge-preparations',
    objectId: 'keeper',
  });
  expect(current.state.campaign.hero.quests['refuge-preparations'].status).toBe(
    'completed',
  );
  await act({ type: 'CLOSE_SERVICE' });
  // Locate a valid adjacent tile using the catalog rather than hard-coding town interior coordinates.
  const town = gameContent.data.worlds.find((w) => w.id === 'refuge')!,
    door = town.objects.find((o) => o.destination === 'blacksmith-interior')!;
  await act({ type: 'TRAVEL_TO', x: door.x, y: door.y + 1 });
  await act({ type: 'INTERACT', objectId: door.id });
  const interior = gameContent.data.worlds.find(
      (w) => w.id === 'blacksmith-interior',
    )!,
    keeper = interior.objects.find((o) => o.enchanting)!;
  await act({ type: 'TRAVEL_TO', x: keeper.x, y: keeper.y + 1 });
  await act({ type: 'INTERACT', objectId: keeper.id });
  const attempt = await act({
    type: 'APPLY_ENCHANT',
    objectId: keeper.id,
    target: { weaponId: 'weapon-1' },
    scrollId: 'resilience-scroll',
    powderId: 'enchant-powder',
  });
  expect(current.state.campaign.hero.enchanting.nextOperationId).toBe(2);
  expect(current.state.campaign.hero.enchanting.receipts).toHaveLength(1);
  expect(
    (
      await request(`/characters/${id}/commands`, cookie, {
        commandId: attempt.receipt.commandId,
        expectedRevision: attempt.receipt.baseRevision,
        command: {
          type: 'APPLY_ENCHANT',
          objectId: keeper.id,
          target: { weaponId: 'weapon-1' },
          scrollId: 'resilience-scroll',
          powderId: 'enchant-powder',
        },
      })
    ).status,
  ).toBe(200);
  expect(
    (await repository.load(id)).state.campaign.hero.enchanting.receipts,
  ).toHaveLength(1);
  const enchant = gameContent.data.enchants.find(
    (e) => e.id === gameContent.item('resilience-scroll').enchantId,
  )!;
  current.state.campaign.hero.weapons['weapon-1'][enchant.slot] = {
    enchantId: enchant.id,
    values: Object.fromEntries(
      enchant.clauses.map((clause) => [clause.id, clause.min]),
    ),
  };
  const fixtureWrites = stateDiff(
    env.DB,
    current.rows,
    encodeState(id, current.state),
  );
  if (fixtureWrites.length) await env.DB.batch(fixtureWrites);
  current = await repository.load(id);
  await act({
    type: 'LOCK_EQUIPMENT',
    target: { weaponId: 'weapon-1' },
    locked: true,
  });
  expect(
    (
      await command(cookie, id, current.character.revision, {
        type: 'BURN_EQUIPMENT',
        objectId: keeper.id,
        target: { weaponId: 'weapon-1' },
      })
    ).status,
  ).toBe(422);
  await act({
    type: 'LOCK_EQUIPMENT',
    target: { weaponId: 'weapon-1' },
    locked: false,
  });
  await act({
    type: 'BURN_EQUIPMENT',
    objectId: keeper.id,
    target: { weaponId: 'weapon-1' },
  });
  expect(current.state.campaign.hero.weapons['weapon-1']).toBeUndefined();
  expect(current.state.campaign.hero.equipment.weapon).toBeUndefined();
  expect(current.state.campaign.hero.enchanting.nextOperationId).toBe(3);
});
it('retries the exact resolved candidate after a transient failed batch', async () => {
  const { cookie, user } = await register(),
    created = await create(cookie),
    id = created.view.character.id,
    repository = new GameRepository(env.DB, user.id);
  const before = await repository.load(id);
  const candidate = execute(
    before.state,
    'Player',
    { type: 'START_REST' },
    1000,
  );
  const receipt = {
    commandId: crypto.randomUUID(),
    characterId: id,
    baseRevision: 1,
    committedRevision: 2,
    createdAt: 1000,
    outcome: candidate.outcome,
  };
  const original = env.DB.batch.bind(env.DB);
  const spy = vi
    .spyOn(env.DB, 'batch')
    .mockRejectedValueOnce(new Error('temporary outage'))
    .mockImplementation(original);
  await repository.commit(
    before.character,
    before.rows,
    candidate.state,
    receipt,
    await requestHash(receipt),
  );
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy.mock.calls[0][0]).toEqual(spy.mock.calls[1][0]);
  expect((await repository.load(id)).state).toEqual(candidate.state);
});
it('a forged ownership receipt cannot advance another account character', async () => {
  const owner = await register(),
    created = await create(owner.cookie),
    other = await register('intruder@example.com');
  const id = created.view.character.id;
  await expect(
    env.DB.prepare('INSERT INTO game_command_receipts VALUES(?,?,?,?,?,?,?,?)')
      .bind(
        other.user.id,
        crypto.randomUUID(),
        id,
        'hash',
        1,
        2,
        '{"message":"forged","events":[]}',
        1000,
      )
      .run(),
  ).rejects.toThrow();
  expect(
    await env.DB.prepare('SELECT revision FROM game_characters WHERE id=?')
      .bind(id)
      .first('revision'),
  ).toBe(1);
});

it('runs generated dungeons through persisted fights, doors, keys and final treasure', async () => {
  const { cookie, user } = await register(),
    created = await create(cookie),
    id = created.view.character.id,
    repository = new GameRepository(env.DB, user.id);
  let current = await repository.load(id);
  // Server-side fixture grants strength only for the integration scenario; no grant/upload API exists.
  current.state = newOnlineState(4, 'Player', 'warrior');
  current.state.campaign.hero.level = 200;
  current.state.campaign.hero.cumulativeLevel = 200;
  addItem(current.state.campaign.hero, 'iron-blade', 1, gameContent);
  current.state.campaign.hero.equipment.weapon = 'weapon-1';
  restoreHero(current.state.campaign.hero, gameContent);
  await env.DB.batch(
    stateDiff(env.DB, current.rows, encodeState(id, current.state)),
  );
  current = await repository.load(id);
  let maxQueries = 0,
    maxRows = 0,
    maxReadRows = 0,
    maxAcceptedMs = 0,
    actionCount = 0;
  async function act(intent: OnlineCommand) {
    const candidate = execute(
      current.state,
      'Player',
      intent,
      Date.now(),
    ).state;
    maxQueries = Math.max(
      maxQueries,
      1 + stateDiff(env.DB, current.rows, encodeState(id, candidate)).length,
    );
    maxRows = Math.max(
      maxRows,
      Object.values(encodeState(id, candidate)).reduce(
        (n, rows) => n + rows.length,
        0,
      ),
    );
    const started = performance.now();
    await accepted(cookie, id, current.character.revision, intent);
    maxAcceptedMs = Math.max(maxAcceptedMs, performance.now() - started);
    current = await repository.load(id);
    maxReadRows = Math.max(maxReadRows, current.metrics.rowsRead);
    expect(current.state).toEqual(candidate);
    actionCount++;
  }
  async function finish() {
    for (let i = 0; i < 100 && current.state.battle; i++) {
      if (current.state.battle.combat.outcome) {
        expect(current.state.battle.combat.outcome).toBe('victory');
        await act({ type: 'SETTLE_ENCOUNTER' });
        return;
      }
      const enemy = current.state.battle.entities.find(
        (e) => e.enemy && e.health!.current > 0 && !e.dead,
      )!;
      await act({
        type: 'BATTLE_ACTION',
        action: { action: 'attack' },
        targetId: enemy.id,
      });
    }
    if (current.state.battle) throw new Error('Battle did not finish');
  }
  async function approach(objectId: string) {
    for (let i = 0; i < 40; i++) {
      await finish();
      const journeyMap = current.state.campaign.dungeon
        ? projectDungeonMap(current.state.campaign.dungeon)
        : gameContent.data.worlds.find(
            (w) => w.id === current.state.campaign.worldId,
          )!;
      const obj = journeyMap.objects.find((o) => o.id === objectId)!;
      if (distance(obj, current.state.campaign.position) <= 1) return;
      const options = [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ]
        .map(([dx, dy]) => ({ x: obj.x + dx, y: obj.y + dy }))
        .filter((p) => isWalkable(journeyMap, p))
        .map((p) => ({
          point: p,
          path: findPath(journeyMap, current.state.campaign.position, p),
        }))
        .filter((v) => v.path.length)
        .sort((a, b) => a.path.length - b.path.length);
      if (!options.length) throw new Error('No route to ' + objectId);
      await act({ type: 'TRAVEL_TO', ...options[0].point });
    }
    throw new Error('Cannot approach ' + objectId);
  }
  async function interact(objectId: string) {
    const target = current.state.campaign.dungeon?.blueprint.world.objects.find(
      (o) => o.id === objectId,
    );
    if (target?.kind === 'encounter') {
      for (let i = 0; i < 40; i++) {
        await finish();
        if (current.state.campaign.dungeon!.cleared.includes(objectId)) return;
        await act({ type: 'TRAVEL_TO', x: target.x, y: target.y });
      }
      throw new Error('Encounter was not reached');
    }
    await approach(objectId);
    await act({ type: 'INTERACT', objectId });
  }
  await interact('dungeon-entrance');
  await act({
    type: 'OFFER_ITEM',
    objectId: 'dungeon-entrance',
    item: { itemId: 'potion' },
  });
  const blueprint = current.state.campaign.dungeon!.blueprint;
  expect(blueprint.rooms).toHaveLength(13);
  expect(
    Math.max(...blueprint.encounters.map((e) => e.map.spawns.length)),
  ).toBe(4);
  const objects = blueprint.world.objects;
  for (const object of objects.filter((o) =>
    ['fountain', 'chest', 'mimic'].includes(o.kind),
  )) {
    await interact(object.id);
    await finish();
  }
  for (const encounter of blueprint.encounters.filter(
    (e) => e.kind !== 'boss',
  )) {
    if (!current.state.campaign.dungeon!.cleared.includes(encounter.objectId)) {
      await interact(encounter.objectId);
      await finish();
    }
  }
  await interact('boss-key');
  const gate = objects.find((o) => o.kind === 'gate' && o.gateType === 'boss')!;
  await interact(gate.id);
  const boss = blueprint.encounters.find((e) => e.kind === 'boss')!;
  await interact(boss.objectId);
  await finish();
  await interact('treasure-key');
  const treasureGate = objects.find(
    (o) => o.kind === 'gate' && o.gateType === 'treasure',
  )!;
  await interact(treasureGate.id);
  const chest = objects.find((o) => o.kind === 'finalChest')!;
  await interact(chest.id);
  expect(current.state.campaign.dungeon!.selectedChest).toBe(chest.id);
  await act({ type: 'EXIT_DUNGEON' });
  expect(current.state.campaign.dungeon).toBeUndefined();
  await act({ type: 'SELECT_TITLE', slot: 'first', titleId: 'first-delver' });
  expect(current.state.campaign.hero.titleCollection.selected.first).toBe(
    'first-delver',
  );
  expect(maxQueries + 2 + current.metrics.readQueries * 2).toBeLessThanOrEqual(
    50,
  );
  expect(maxRows).toBeLessThan(5000);
  expect(actionCount).toBeLessThan(300);
  console.log(
    JSON.stringify({
      event: 'game_scenario_cost',
      maxBatchQueries: maxQueries,
      maxStateRows: maxRows,
      maxReadRows,
      maxAcceptedMs: Math.round(maxAcceptedMs),
      acceptedCommands: actionCount,
      readSqlBytes: current.metrics.sqlBytes,
      stateReadQueries: current.metrics.readQueries,
    }),
  );
}, 50000);
