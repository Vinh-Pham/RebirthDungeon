import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { tsImport } from 'tsx/esm/api';
import { verifyPassword } from 'better-auth/crypto';
import { migrateLocal } from '../tools/migrate-local.mjs';
import { seedLocal, SEED_EMAIL, SEED_PASSWORD } from '../tools/seed-local.mjs';
import { localDatabase } from './local-db.mjs';

const { seedCatalog, ContentRepository } = await tsImport(
  '../src/game/content.ts',
  import.meta.url,
);
const { SkillSchema } = await tsImport(
  '../../packages/game-core/src/data/schemas/content.ts',
  import.meta.url,
);
const { GAME_CONTENT_VERSION } = await tsImport(
  '../../packages/game-core/src/online/Contracts.ts',
  import.meta.url,
);
const { loadGameContent } = await tsImport(
  '../../packages/game-core/src/data/content.ts',
  import.meta.url,
);

test(
  'skill seeds preserve every JSON definition, authored rank, objective, and reference on rerun',
  { timeout: 20000 },
  async (t) => {
    const directory = new URL(
      '../../packages/game-core/src/data/skills/',
      import.meta.url,
    );
    const files = (await readdir(directory))
      .filter((file) => file.endsWith('.json'))
      .sort();
    const definitions = (
      await Promise.all(
        files.map(async (file) =>
          JSON.parse(await readFile(new URL(file, directory), 'utf8')),
        ),
      )
    )
      .flat()
      .map((skill) => SkillSchema.parse(skill));
    const byId = (skills) =>
      [...skills].sort((a, b) => a.id.localeCompare(b.id));
    const data = loadGameContent().data;
    // Read the directory independently to catch a JSON file omitted from the content loader.
    assert.deepEqual(byId(data.skills), byId(definitions));

    const db = await localDatabase(t);
    await migrateLocal(db);
    assert.equal(await seedCatalog(db, data), true);
    const repository = new ContentRepository(db);
    const stored = await repository.collection(GAME_CONTENT_VERSION, 'skills');
    assert.deepEqual(byId(stored), byId(definitions));
    const tables = [
      'game_content_skills',
      'game_content_skills_statuses',
      'game_content_skills_game_ranks',
      'game_content_skills_game_ranks_value_objectives',
    ];
    const snapshot = () =>
      Promise.all(
        tables.map(
          async (table) =>
            (
              await db
                .prepare(
                  `SELECT * FROM ${table} WHERE content_version=? ORDER BY definition_id,position`,
                )
                .bind(GAME_CONTENT_VERSION)
                .all()
            ).results,
        ),
      );
    const before = await snapshot();
    assert.equal(before[0].length, definitions.length);
    assert.equal(
      before[2].length,
      definitions.reduce(
        (total, skill) => total + Object.keys(skill.gameRanks ?? {}).length,
        0,
      ),
    );
    assert.equal(
      before[3].length,
      definitions.reduce(
        (total, skill) =>
          total +
          Object.values(skill.gameRanks ?? {}).reduce(
            (count, rank) => count + rank.objectives.length,
            0,
          ),
        0,
      ),
    );
    assert.equal(await seedCatalog(db, data), false);
    assert.deepEqual(await snapshot(), before);
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS count FROM user').first()).count,
      0,
    );
  },
);

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
