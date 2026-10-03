import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyPassword } from 'better-auth/crypto';
import { migrateLocal } from '../tools/migrate-local.mjs';
import { seedLocal, SEED_EMAIL, SEED_PASSWORD } from '../tools/seed-local.mjs';
import { localDatabase } from './local-db.mjs';

async function rows(db, table) {
  return (await db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results;
}

test(
  'seed creates Better Auth credentials and preserves accounts, sessions, and history on rerun',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    await migrateLocal(db);
    assert.equal(await seedLocal(db), true);
    const user = await db
      .prepare('SELECT * FROM user WHERE email = ?')
      .bind(SEED_EMAIL)
      .first();
    const account = await db
      .prepare('SELECT * FROM account WHERE user_id = ?')
      .bind(user.id)
      .first();
    assert.equal(account.provider_id, 'credential');
    assert.equal(account.account_id, user.id);
    assert.equal(
      await verifyPassword({ password: SEED_PASSWORD, hash: account.password }),
      true,
    );
    await db
      .prepare(
        'INSERT INTO session (id, user_id, token, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(
        'seed-session',
        user.id,
        'seed-token',
        123,
        456,
        Date.now() + 86400000,
      )
      .run();
    const before = await Promise.all(
      ['user', 'account', 'session', '__drizzle_migrations'].map((table) =>
        rows(db, table),
      ),
    );
    assert.equal(await seedLocal(db), false);
    const after = await Promise.all(
      ['user', 'account', 'session', '__drizzle_migrations'].map((table) =>
        rows(db, table),
      ),
    );
    assert.deepEqual(after, before);
  },
);

test(
  'seed preserves an existing fixture account and its owned password',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    await migrateLocal(db);
    await db
      .prepare(
        'INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
      )
      .bind('owned', 'Owner', SEED_EMAIL, 123, 456)
      .run();
    await db
      .prepare(
        "INSERT INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at) VALUES ('owned-account', 'owned', 'owned', 'credential', 'owned-hash', 123, 456)",
      )
      .run();
    const before = await Promise.all(
      ['user', 'account'].map((table) => rows(db, table)),
    );
    assert.equal(await seedLocal(db), false);
    assert.deepEqual(
      await Promise.all(['user', 'account'].map((table) => rows(db, table))),
      before,
    );
  },
);

test(
  'concurrent seed attempts create one complete credential account',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    await migrateLocal(db);
    const results = await Promise.all([seedLocal(db), seedLocal(db)]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal((await rows(db, 'user')).length, 1);
    assert.equal((await rows(db, 'account')).length, 1);
  },
);
