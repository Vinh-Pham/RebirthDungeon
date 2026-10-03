import assert from 'node:assert/strict';
import { test } from 'node:test';
import { argon2Verify } from 'argon2-wasm-edge';
import { getPlatformProxy } from 'wrangler';
import { migrateLocal } from '../tools/migrate-local.mjs';
import { seedLocal, SEED_EMAIL, SEED_PASSWORD } from '../tools/seed-local.mjs';

test('local seed creates a valid account and preserves users, sessions, and migration history on rerun', async (t) => {
  const proxy = await getPlatformProxy({
    configPath: 'wrangler.jsonc',
    remoteBindings: false,
    persist: false,
  });
  t.after(() => proxy.dispose());
  const db = proxy.env.DB;
  await migrateLocal(db);
  const history = (await db.prepare('SELECT * FROM __drizzle_migrations').all())
    .results;
  await db
    .prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)')
    .bind('existing', 'existing@example.invalid', 'unchanged-hash', 123, 456)
    .run();

  assert.equal(await seedLocal(db), true);
  const seeded = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(SEED_EMAIL)
    .first();
  assert.equal(
    await argon2Verify({ password: SEED_PASSWORD, hash: seeded.password_hash }),
    true,
  );
  await db
    .prepare(
      'INSERT INTO auth_sessions (user_id, session_id, refresh_token_hash, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      seeded.id,
      'seed-session',
      'token-hash',
      123,
      456,
      Date.now() + 86400000,
    )
    .run();
  const users = (await db.prepare('SELECT * FROM users ORDER BY id').all())
    .results;
  const sessions = (await db.prepare('SELECT * FROM auth_sessions').all())
    .results;

  assert.equal(await seedLocal(db), false);
  assert.deepEqual(
    (await db.prepare('SELECT * FROM users ORDER BY id').all()).results,
    users,
  );
  assert.deepEqual(
    (await db.prepare('SELECT * FROM auth_sessions').all()).results,
    sessions,
  );
  assert.deepEqual(
    (await db.prepare('SELECT * FROM __drizzle_migrations').all()).results,
    history,
  );
});

test('local seed preserves an existing account with the fixture email', async (t) => {
  const proxy = await getPlatformProxy({
    configPath: 'wrangler.jsonc',
    remoteBindings: false,
    persist: false,
  });
  t.after(() => proxy.dispose());
  const db = proxy.env.DB;
  await migrateLocal(db);
  await db
    .prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)')
    .bind('owned', SEED_EMAIL, 'owned-password-hash', 123, 456)
    .run();
  const existing = await db.prepare('SELECT * FROM users').first();
  assert.equal(await seedLocal(db), false);
  assert.deepEqual(await db.prepare('SELECT * FROM users').first(), existing);
});
