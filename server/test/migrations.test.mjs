import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { migrateLocal } from '../tools/migrate-local.mjs';
import { localDatabase } from './local-db.mjs';
import { seedLocalCatalog } from '../tools/seed-local.mjs';

const migrations = readMigrationFiles({ migrationsFolder: 'drizzle' });
const [legacy] = migrations;
test(
  'character deletion migration preserves existing characters and defaults deleted_at to null',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    for (const migration of migrations.slice(0, -1))
      await db.batch(migration.sql.map((sql) => db.prepare(sql)));
    await seedLocalCatalog(db);
    await db
      .prepare(
        "INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('local-development-player','Player','migration@example.invalid',0,123,456)",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO game_characters(id,user_id,name,talent,age,revision,content_version,created_at,updated_at) VALUES ('existing','local-development-player','Player','warrior',12,7,'rebirth-13.1',123,456)",
      )
      .run();
    const before = await db.prepare('SELECT * FROM game_characters').first();
    const migration = migrations.at(-1);
    assert.ok(migration.name.endsWith('_character_deletion'));
    await db.batch(migration.sql.map((sql) => db.prepare(sql)));
    assert.deepEqual(
      await db.prepare('SELECT * FROM game_characters').first(),
      { ...before, deleted_at: null },
    );
    await db
      .prepare("UPDATE game_characters SET deleted_at=789 WHERE id='existing'")
      .run();
    await assert.rejects(() =>
      db
        .prepare(
          "INSERT INTO game_command_receipts(user_id,command_id,character_id,request_hash,base_revision,committed_revision,outcome,created_at) VALUES ('local-development-player','stale-command','existing','hash',7,8,'{}',900)",
        )
        .run(),
    );
    assert.equal(
      await db
        .prepare("SELECT revision FROM game_characters WHERE id='existing'")
        .first('revision'),
      7,
    );
  },
);
async function legacyDatabase(t) {
  const db = await localDatabase(t);
  await db.batch(legacy.sql.map((sql) => db.prepare(sql)));
  await db
    .prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)')
    .bind('legacy', 'legacy@example.invalid', 'old-hash', 123, 456)
    .run();
  await db
    .prepare('INSERT INTO auth_sessions VALUES (?, ?, ?, ?, ?, ?)')
    .bind(
      'legacy',
      'old-session',
      'old-token-hash',
      Date.now() + 86400000,
      123,
      456,
    )
    .run();
  return db;
}

test(
  'fresh migrations are idempotent and preserve new accounts and history',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    await migrateLocal(db);
    const history = (
      await db.prepare('SELECT * FROM __drizzle_migrations').all()
    ).results;
    assert.equal(history.length, migrations.length);
    await db
      .prepare(
        'INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
      )
      .bind('preserved', 'Player', 'preserved@example.invalid', 123, 456)
      .run();
    const user = await db.prepare('SELECT * FROM user').first();
    await seedLocalCatalog(db);
    await db
      .prepare(
        'INSERT INTO game_characters (id,user_id,name,talent,age,revision,content_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        'online-preserved',
        'preserved',
        'Player',
        'warrior',
        12,
        7,
        'rebirth-13.1',
        123,
        456,
      )
      .run();
    const character = await db.prepare('SELECT * FROM game_characters').first();
    await migrateLocal(db);
    assert.deepEqual(
      (await db.prepare('SELECT * FROM __drizzle_migrations').all()).results,
      history,
    );
    assert.deepEqual(await db.prepare('SELECT * FROM user').first(), user);
    assert.deepEqual(
      await db.prepare('SELECT * FROM game_characters').first(),
      character,
    );
    assert.equal(
      await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='trigger' AND name='session_replace_previous'",
        )
        .first('name'),
      'session_replace_previous',
    );
  },
);

test(
  'baselines the original schema, resets legacy auth, and preserves unrelated data',
  { timeout: 20000 },
  async (t) => {
    const db = await legacyDatabase(t);
    await db.prepare('CREATE TABLE unrelated (value TEXT)').run();
    await db.prepare("INSERT INTO unrelated VALUES ('keep me')").run();
    await assert.rejects(() => migrateLocal(db), /no migration history/);
    assert.equal(
      await db.prepare('SELECT id FROM users').first('id'),
      'legacy',
    );
    await migrateLocal(db, true);
    assert.equal(
      await db.prepare('SELECT COUNT(*) AS count FROM user').first('count'),
      0,
    );
    assert.equal(
      await db.prepare('SELECT value FROM unrelated').first('value'),
      'keep me',
    );
    assert.equal(
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE name IN ('users', 'auth_sessions')",
        )
        .first('count'),
      0,
    );
    const history = (
      await db
        .prepare('SELECT * FROM __drizzle_migrations ORDER BY created_at')
        .all()
    ).results;
    assert.equal(history.length, migrations.length);
    assert.equal(history[0].hash, legacy.hash);
    assert.equal(history[0].name, legacy.name);
  },
);

test(
  'upgrades an existing ledger without rewriting its original entry',
  { timeout: 20000 },
  async (t) => {
    const db = await legacyDatabase(t);
    await db.batch([
      db.prepare(
        'CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC, name TEXT, applied_at TEXT)',
      ),
      db
        .prepare(
          'INSERT INTO __drizzle_migrations (hash, created_at, name, applied_at) VALUES (?, ?, ?, ?)',
        )
        .bind(legacy.hash, legacy.folderMillis, legacy.name, 'original'),
    ]);
    const original = await db
      .prepare('SELECT * FROM __drizzle_migrations')
      .first();
    await migrateLocal(db);
    assert.deepEqual(
      await db
        .prepare(
          'SELECT * FROM __drizzle_migrations ORDER BY created_at LIMIT 1',
        )
        .first(),
      original,
    );
    assert.equal(
      await db.prepare('SELECT COUNT(*) AS count FROM user').first('count'),
      0,
    );
  },
);

test(
  'refuses baselining a different legacy schema without changing data',
  { timeout: 20000 },
  async (t) => {
    const db = await legacyDatabase(t);
    await db.prepare('ALTER TABLE users ADD COLUMN extra TEXT').run();
    await assert.rejects(
      () => migrateLocal(db, true),
      /differs from the original migration/,
    );
    assert.equal(
      await db.prepare('SELECT id FROM users').first('id'),
      'legacy',
    );
    assert.equal(
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE name='__drizzle_migrations'",
        )
        .first('count'),
      0,
    );
  },
);

test(
  'refuses untracked Better Auth tables instead of treating them as a fresh database',
  { timeout: 20000 },
  async (t) => {
    const db = await localDatabase(t);
    await migrateLocal(db);
    await db.prepare('DELETE FROM __drizzle_migrations').run();
    await assert.rejects(() => migrateLocal(db), /no migration history/);
    await assert.rejects(
      () => migrateLocal(db, true),
      /differs from the original migration/,
    );
  },
);

test(
  'resets online game state once while preserving accounts, sessions and immutable audit history',
  { timeout: 25000 },
  async (t) => {
    const db = await localDatabase(t),
      prior = migrations.slice(
        0,
        migrations.findIndex((migration) =>
          migration.name.endsWith('_feature_game_reset'),
        ),
      );
    for (const migration of prior)
      await db.batch(migration.sql.map((sql) => db.prepare(sql)));
    await db
      .prepare(
        'CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash text NOT NULL, created_at numeric, name text, applied_at TEXT)',
      )
      .run();
    for (const migration of prior)
      await db
        .prepare(
          'INSERT INTO __drizzle_migrations(hash,created_at,name,applied_at) VALUES (?,?,?,?)',
        )
        .bind(
          migration.hash,
          migration.folderMillis,
          migration.name,
          new Date().toISOString(),
        )
        .run();
    await db
      .prepare(
        "INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('preserved','Player','preserved@example.invalid',1,123,456)",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO account(id,user_id,account_id,provider_id,password,created_at,updated_at) VALUES ('account','preserved','preserved','credential','retained-password',123,456)",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO session(id,user_id,token,created_at,updated_at,expires_at) VALUES ('session','preserved','retained-token',123,456,9999999999999)",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO game_characters(id,user_id,name,talent,age,revision,content_version,created_at,updated_at) VALUES ('old-character','preserved','Player','warrior',12,0,'rebirth-13.1',123,456)",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO game_command_receipts(user_id,command_id,character_id,request_hash,base_revision,committed_revision,outcome,created_at) VALUES ('preserved','old-command','old-character','hash',0,1,'{}',456)",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO audit_records(id,timestamp,user_id,character_id,source,category,type,outcome,message,command_id,revision,details) VALUES ('retained-audit',456,'preserved','old-character','server','game','CREATE_CHARACTER','committed','Created','old-command',1,'{}')",
      )
      .run();
    const names = ['user', 'account', 'session', 'audit_records'],
      before = await Promise.all(
        names.map((name) => db.prepare('SELECT * FROM ' + name).all()),
      );
    await migrateLocal(db);
    assert.deepEqual(
      await Promise.all(
        names.map((name) =>
          db
            .prepare('SELECT * FROM ' + name)
            .all()
            .then((r) => r.results),
        ),
      ),
      before.map((r) => r.results),
    );
    for (const table of ['game_characters', 'game_command_receipts'])
      assert.equal(
        await db
          .prepare('SELECT COUNT(*) AS count FROM ' + table)
          .first('count'),
        0,
      );
    assert.equal(
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE name='game_encounter_values'",
        )
        .first('count'),
      0,
    );
    await seedLocalCatalog(db);
    await db
      .prepare(
        "INSERT INTO game_characters(id,user_id,name,talent,age,revision,content_version,created_at,updated_at) VALUES ('new-character','preserved','Player','warrior',12,0,'rebirth-13.1',123,456)",
      )
      .run();
    await migrateLocal(db);
    assert.equal(
      await db.prepare('SELECT id FROM game_characters').first('id'),
      'new-character',
    );
    assert.deepEqual(
      (await db.prepare('PRAGMA foreign_key_check').all()).results,
      [],
    );
  },
);
