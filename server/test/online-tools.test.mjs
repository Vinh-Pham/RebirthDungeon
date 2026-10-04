import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { createServer as createHTTPServer } from 'node:http';
import { forwardWorker } from '../tools/online-forwarder.mjs';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  addresses,
  settings,
  setupArguments,
  envValues,
  patchEnv,
  readSetup,
  assertFreePort,
  validateHost,
  checkOverrides,
} from '../tools/online-config.mjs';
import { setup } from '../tools/online-setup.mjs';
import { runApplications, applicationCommands } from '../tools/online-dev.mjs';
import {
  initializeDatabase,
  initializeLocalDatabase,
} from '../tools/online-database.mjs';
import { localDatabase } from './local-db.mjs';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { SEED_EMAIL } from '../tools/seed-local.mjs';
const available = [
  { name: 'wifi', address: '192.168.1.12' },
  { name: 'wired', address: '10.2.3.4' },
];
async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), 'rebirth-online-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, 'client'));
  await mkdir(resolve(root, 'server'));
  const logs = [],
    initialized = [];
  return {
    root,
    available,
    environment: {},
    interactive: false,
    log: (message) => logs.push(message),
    initialize: async (...args) => initialized.push(args),
    logs,
    initialized,
  };
}
test('fresh setup and repeated setup are idempotent and keep secrets out of output', async (t) => {
  const options = await fixture(t);
  await writeFile(
    resolve(options.root, 'client/.env.local'),
    '# preserved\nOTHER_SETTING=yes\n',
  );
  await setup({ ...options, args: ['--host', available[0].address] });
  const first = await readFile(
    resolve(options.root, 'server/.dev.vars'),
    'utf8',
  );
  const secret = envValues(first).BETTER_AUTH_SECRET;
  assert.ok(Buffer.byteLength(secret) >= 32);
  assert.ok(!options.logs.join('\n').includes(secret));
  assert.match(
    await readFile(resolve(options.root, 'client/.env.local'), 'utf8'),
    /# preserved\nOTHER_SETTING=yes/,
  );
  await setup({ ...options, args: ['--host', available[0].address] });
  assert.equal(
    await readFile(resolve(options.root, 'server/.dev.vars'), 'utf8'),
    first,
  );
  const config = await readSetup(options.root, {}, available);
  assert.equal(config.webURL, 'http://192.168.1.12:8081');
  assert.equal(options.initialized.length, 2);
});
test('prompts include interface names and offer computer-only localhost', async (t) => {
  const options = await fixture(t);
  const questions = [];
  await setup({
    ...options,
    interactive: true,
    args: [],
    ask: async (q) => {
      questions.push(q);
      return '2';
    },
  });
  assert.match(options.logs.join('\n'), /wifi/);
  assert.match(options.logs.join('\n'), /wired/);
  assert.match(options.logs.join('\n'), /localhost.*computer only/);
  assert.equal(questions.length, 1);
  assert.equal(
    envValues(
      await readFile(resolve(options.root, 'client/.env.local'), 'utf8'),
    ).EXPO_PUBLIC_API_URL,
    'http://10.2.3.4:8787',
  );
});
test('rejects invalid arguments, absent noninteractive host and unavailable hosts', async (t) => {
  for (const args of [
    ['--api-port', '0'],
    ['--web-port', '65536'],
    ['--web-port', '1.5'],
    ['--api-port', '8081'],
    ['--remote'],
    ['--host'],
  ])
    assert.throws(() => setupArguments(args));
  const options = await fixture(t);
  await assert.rejects(setup({ ...options, args: [] }), /requires --host/);
  for (const host of ['8.8.8.8', 'example.com', '192.168.1.99', '127.0.0.1'])
    assert.throws(() => validateHost(host, available));
  assert.equal(validateHost('localhost', []), 'localhost');
  assert.equal(
    settings('localhost', 80, 8081).client.EXPO_PUBLIC_API_URL,
    'http://localhost',
  );
  assert.deepEqual(
    JSON.parse(
      settings('localhost', 8787, 80).server.BETTER_AUTH_TRUSTED_ORIGINS,
    ),
    ['rebirthdungeon://', 'http://localhost'],
  );
  assert.deepEqual(
    addresses({
      lo: [{ internal: true, address: '127.0.0.1' }],
      wifi: [
        { internal: false, address: '192.168.1.1' },
        { internal: false, address: 'fe80::1' },
      ],
      vpn: [{ internal: false, address: '8.8.8.8' }],
    }),
    [{ name: 'wifi', address: '192.168.1.1' }],
  );
});
test('preserves valid secrets and unrelated multiline values; confirms connection changes', async (t) => {
  const options = await fixture(t),
    secret = 'do-not-rotate-this-existing-secret-value';
  const serverFile = resolve(options.root, 'server/.dev.vars');
  const original = `# secret stays\nOTHER='first\nsecond'\nBETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=http://localhost:8787\n`;
  await writeFile(serverFile, original);
  await assert.rejects(
    setup({ ...options, args: ['--host', available[0].address] }),
    /--yes/,
  );
  assert.equal(await readFile(serverFile, 'utf8'), original);
  assert.equal(options.initialized.length, 0);
  await setup({
    ...options,
    args: [
      '--host',
      available[0].address,
      '--yes',
      '--api-port',
      '8799',
      '--web-port',
      '8099',
    ],
  });
  assert.equal(
    envValues(await readFile(serverFile, 'utf8')).BETTER_AUTH_SECRET,
    secret,
  );
  assert.equal(
    envValues(await readFile(serverFile, 'utf8')).OTHER,
    'first\nsecond',
  );
  assert.ok(!options.logs.join('\n').includes(secret));
  assert.throws(
    () => patchEnv('X=first\nX=second\n', { X: 'third' }),
    /Duplicate/,
  );
  assert.equal(
    patchEnv("X='first\nsecond'\nOTHER=yes\n", { X: 'updated' }),
    "X='updated'\nOTHER=yes\n",
  );
});
test('cancellation and invalid secrets leave files and database untouched; blank secrets get generated', async (t) => {
  const options = await fixture(t),
    file = resolve(options.root, 'server/.dev.vars');
  await writeFile(file, 'BETTER_AUTH_SECRET=too-short\n');
  await assert.rejects(
    setup({ ...options, args: ['--host', 'localhost', '--yes'] }),
    /will not rotate/,
  );
  assert.equal(options.initialized.length, 0);
  await writeFile(
    file,
    'BETTER_AUTH_SECRET=" "\nBETTER_AUTH_URL=http://localhost:8787\n',
  );
  await setup({
    ...options,
    interactive: true,
    args: ['--host', available[0].address],
    ask: async () => 'no',
  });
  assert.equal(options.initialized.length, 0);
  await setup({ ...options, args: ['--host', 'localhost'] });
  assert.ok(
    envValues(await readFile(file, 'utf8')).BETTER_AUTH_SECRET.trim().length >=
      32,
  );
});
test('detects conflicting shell settings, Expo file overrides and stale LAN addresses', async (t) => {
  const options = await fixture(t);
  await assert.rejects(
    setup({
      ...options,
      args: ['--host', 'localhost'],
      environment: { EXPO_PUBLIC_API_URL: 'https://wrong.example' },
    }),
    /Conflicting/,
  );
  await setup({ ...options, args: ['--host', available[0].address] });
  await assert.rejects(readSetup(options.root, {}, []), /changing networks/);
  await assert.rejects(
    readSetup(options.root, { BETTER_AUTH_SECRET: 'conflict' }, available),
    /Conflicting BETTER_AUTH_SECRET/,
  );
  await writeFile(
    resolve(options.root, 'client/.env.development.local'),
    'EXPO_PUBLIC_API_URL=http://localhost:8787\n',
  );
  await assert.rejects(
    readSetup(options.root, {}, available),
    /Conflicting EXPO_PUBLIC_API_URL/,
  );
  assert.throws(
    () => checkOverrides({ EXPO_NO_CLIENT_ENV_VARS: '1' }, {}),
    /EXPO_NO_CLIENT_ENV_VARS/,
  );
});
test('launcher requires setup and rejects invalid/missing origin approval', async (t) => {
  const options = await fixture(t);
  await assert.rejects(
    readSetup(options.root, {}, available),
    /missing or invalid/,
  );
  await setup({ ...options, args: ['--host', 'localhost'] });
  const file = resolve(options.root, 'server/.dev.vars');
  await writeFile(
    file,
    patchEnv(await readFile(file, 'utf8'), {
      BETTER_AUTH_TRUSTED_ORIGINS: '["*"]',
    }),
  );
  await assert.rejects(
    readSetup(options.root, {}, available),
    /Trusted origins/,
  );
});
test('occupied ports are reported; launcher commands preserve local state and disable browser opening', async (t) => {
  const listener = createServer();
  await new Promise((accept) => listener.listen(0, '127.0.0.1', accept));
  t.after(() => new Promise((accept) => listener.close(accept)));
  await assert.rejects(
    assertFreePort('127.0.0.1', listener.address().port),
    /Port .*unavailable/,
  );
  const commands = applicationCommands(
    {
      host: available[0].address,
      apiPort: 8787,
      webPort: 8081,
      apiURL: 'http://192.168.1.12:8787',
    },
    '/project',
    { LOCAL_D1_STATE: '/state' },
  );
  assert.ok(commands[0].args.includes('--local'));
  assert.ok(commands[0].args.includes('/state'));
  assert.ok(commands[0].args.includes('127.0.0.1'));
  assert.ok(commands[1].args.includes('--lan'));
  assert.equal(commands[1].env.BROWSER, 'none');
  assert.equal(commands[1].env.REACT_NATIVE_PACKAGER_HOSTNAME, '192.168.1.12');
});
test(
  'launcher terminates sibling processes on startup failure and Ctrl+C',
  { timeout: 10000 },
  async () => {
    for (const interrupt of [false, true]) {
      const children = [],
        signals = new EventEmitter();
      const commands = [
        {
          name: 'first',
          executable: process.execPath,
          args: ['-e', 'setInterval(()=>{},1000)'],
        },
        {
          name: 'second',
          executable: interrupt ? process.execPath : '/not/an/executable',
          args: ['-e', 'setInterval(()=>{},1000)'],
        },
      ];
      const promise = runApplications(commands, {
        signals,
        log: () => {},
        stopTimeout: 1000,
        spawnChild: (...args) => {
          const child = spawn(...args);
          children.push(child);
          return child;
        },
      });
      if (interrupt) setTimeout(() => signals.emit('SIGINT'), 150);
      assert.equal(await promise, interrupt ? 0 : 1);
      for (const child of children.filter((c) => c.pid))
        assert.throws(() => process.kill(child.pid, 0), /ESRCH/);
      assert.equal(signals.listenerCount('SIGINT'), 0);
    }
  },
);
test(
  'database guard rejects destructive legacy migrations even with a populated ledger',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    const [legacy] = readMigrationFiles({ migrationsFolder: 'drizzle' });
    await db.batch(legacy.sql.map((sql) => db.prepare(sql)));
    await db
      .prepare(
        "INSERT INTO users VALUES ('legacy','old@example.invalid','hash',123,456)",
      )
      .run();
    await db
      .prepare(
        'CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC)',
      )
      .run();
    await db
      .prepare('INSERT INTO __drizzle_migrations VALUES (1, ?, ?)')
      .bind(legacy.hash, legacy.folderMillis)
      .run();
    await assert.rejects(
      initializeDatabase(db),
      /refuses the destructive auth reset/,
    );
    assert.equal(
      await db.prepare('SELECT COUNT(*) AS count FROM users').first('count'),
      1,
    );
  },
);
test(
  'fresh database initialization is idempotent and preserves sessions, characters and unrelated data',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    await initializeDatabase(db);
    const user = await db
      .prepare('SELECT id FROM user WHERE email=?')
      .bind(SEED_EMAIL)
      .first();
    await db
      .prepare(
        "INSERT INTO session (id,user_id,token,created_at,updated_at,expires_at) VALUES ('preserved',?,'token',1,1,9999999999999)",
      )
      .bind(user.id)
      .run();
    await db
      .prepare(
        "INSERT INTO game_characters (id,user_id,name,talent,age,revision,content_version,created_at,updated_at) VALUES ('hero',?,'Hero','warrior',12,0,'rebirth-13.1',1,1)",
      )
      .bind(user.id)
      .run();
    await db.prepare('CREATE TABLE unrelated (value TEXT)').run();
    await db.prepare("INSERT INTO unrelated VALUES ('keep')").run();
    const tables = [
      'user',
      'account',
      'session',
      'game_characters',
      '__drizzle_migrations',
      'unrelated',
    ];
    const before = await Promise.all(
      tables.map(
        async (table) =>
          (await db.prepare(`SELECT * FROM ${table}`).all()).results,
      ),
    );
    assert.equal(await initializeDatabase(db), false);
    assert.deepEqual(
      await Promise.all(
        tables.map(
          async (table) =>
            (await db.prepare(`SELECT * FROM ${table}`).all()).results,
        ),
      ),
      before,
    );
  },
);
test(
  'setup never baselines current auth tables without history or writes files after database refusal',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    await db.prepare('CREATE TABLE user (id TEXT)').run();
    await assert.rejects(initializeDatabase(db), /no migration history/);
    const options = await fixture(t);
    await assert.rejects(
      setup({
        ...options,
        args: ['--host', 'localhost'],
        initialize: async () => {
          throw new Error('Legacy reset refused');
        },
      }),
      /refused/,
    );
    assert.equal(
      await readFile(resolve(options.root, 'client/.env.local'), 'utf8').catch(
        () => '',
      ),
      '',
    );
  },
);
test(
  'D1-only setup persists in the same v3 namespace as Wrangler',
  { timeout: 20000 },
  async (t) => {
    const root = await mkdtemp(resolve(tmpdir(), 'rebirth-online-state-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const serverDirectory = process.cwd();
    assert.equal(await initializeLocalDatabase(serverDirectory, root), true);
    assert.equal(await initializeLocalDatabase(serverDirectory, root), false);
  },
);

test('LAN forwarder preserves cookies, origin and bodies, isolates dev tools and closes active sockets', async (t) => {
  const backend = createHTTPServer((request, response) => {
    if (request.url === '/pending') return;
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      response.writeHead(200, {
        'Set-Cookie': 'session=test; SameSite=Lax',
        'Cache-Control': 'no-store',
      });
      response.end(
        JSON.stringify({
          origin: request.headers.origin,
          cookie: request.headers.cookie,
          host: request.headers.host,
          body,
        }),
      );
    });
  });
  await new Promise((accept) => backend.listen(0, '127.0.0.1', accept));
  t.after(() => {
    backend.closeAllConnections();
    return new Promise((accept) => backend.close(accept));
  });
  const proxy = await forwardWorker({
    host: '127.0.0.1',
    port: 0,
    workerPort: backend.address().port,
  });
  t.after(() => proxy.close());
  const url = `http://127.0.0.1:${proxy.port}`;
  const result = await fetch(url + '/api/auth/sign-in/email', {
    method: 'POST',
    headers: {
      Origin: 'http://192.168.1.12:8081',
      Cookie: 'session=kept',
    },
    body: 'payload',
  });
  assert.equal(result.headers.get('set-cookie'), 'session=test; SameSite=Lax');
  assert.deepEqual(await result.json(), {
    origin: 'http://192.168.1.12:8081',
    cookie: 'session=kept',
    host: `127.0.0.1:${proxy.port}`,
    body: 'payload',
  });
  assert.equal((await fetch(url + '/cdn-cgi/local/explorer/api')).status, 404);
  const pending = fetch(url + '/pending').catch(() => 'closed');
  await proxy.close();
  assert.equal(await pending, 'closed');
  const unavailable = await forwardWorker({
    host: '127.0.0.1',
    port: 0,
    workerPort: proxy.port,
  });
  t.after(() => unavailable.close());
  const failure = await fetch(
    `http://127.0.0.1:${unavailable.port}/api/auth/get-session`,
  );
  assert.equal(failure.status, 503);
  assert.equal(failure.headers.get('cache-control'), 'no-store');
});
