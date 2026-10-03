import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { hashPassword } from 'better-auth/crypto';
import { getPlatformProxy } from 'wrangler';

export const SEED_EMAIL = 'player@example.invalid';
export const SEED_PASSWORD = 'local-development-password';

export async function seedLocal(db) {
  const existing = await db
    .prepare('SELECT id FROM user WHERE email = ?')
    .bind(SEED_EMAIL)
    .first();
  if (existing) return false;
  const password = await hashPassword(SEED_PASSWORD);
  const userId = randomUUID();
  const now = Date.now();
  // Both inserts share a D1 transaction; a concurrent seed cannot attach credentials to another user.
  const results = await db.batch([
    db
      .prepare(
        'INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?) ON CONFLICT(email) DO NOTHING',
      )
      .bind(userId, 'Player', SEED_EMAIL, now, now),
    db
      .prepare(
        "INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) SELECT ?, id, 'credential', id, ?, ?, ? FROM user WHERE id = ?",
      )
      .bind(randomUUID(), password, now, now, userId),
  ]);
  return results[0].meta.changes > 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length > 2) {
    throw new Error(
      'This seed command accepts no arguments and only seeds local D1.',
    );
  }
  const proxy = await getPlatformProxy({
    configPath: 'wrangler.jsonc',
    remoteBindings: false,
    persist: process.env.LOCAL_D1_STATE
      ? { path: join(process.env.LOCAL_D1_STATE, 'v3') }
      : true,
  });
  try {
    const inserted = await seedLocal(proxy.env.DB);
    console.log(
      inserted
        ? `Created local development account: ${SEED_EMAIL}`
        : 'Local development account already exists; left it unchanged.',
    );
  } finally {
    await proxy.dispose();
  }
}
