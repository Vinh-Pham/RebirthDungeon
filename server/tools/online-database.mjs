import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { unstable_readConfig } from 'wrangler';
import { migrateLocal } from './migrate-local.mjs';
import { seedLocal } from './seed-local.mjs';
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler'));
const { Miniflare, convertV4MiniflareOptions } = wranglerRequire('miniflare');

export async function initializeDatabase(db) {
  const legacy = await db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'auth_sessions')",
    )
    .first();
  if (legacy)
    throw new Error(
      'Legacy authentication tables detected. online:setup refuses the destructive auth reset. Review and migrate this database explicitly before rerunning setup.',
    );
  await migrateLocal(db, false);
  return seedLocal(db);
}
export async function withLocalD1(serverDirectory, stateDirectory, operation) {
  // D1 only: no Worker secrets, live dev registry, queues, email, or remote bindings.
  const config = unstable_readConfig({
    config: resolve(serverDirectory, 'wrangler.jsonc'),
  });
  const database = config.d1_databases.find(
    (binding) => binding.binding === 'DB',
  );
  if (!database?.database_id)
    throw new Error('Missing local DB binding in wrangler.jsonc.');
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      cf: false,
      modules: true,
      script:
        'export default { fetch() { return new Response("local setup"); } };',
      compatibilityDate: config.compatibility_date,
      d1Databases: { DB: database.database_id },
      resourcePersistencePath: resolve(
        stateDirectory ?? resolve(serverDirectory, '.wrangler/state'),
        'v3',
      ),
    }),
  );
  const previousDirectory = process.cwd();
  try {
    process.chdir(serverDirectory);
    return await operation(await mf.getD1Database('DB'));
  } finally {
    process.chdir(previousDirectory);
    await mf.dispose();
  }
}

export async function initializeLocalDatabase(serverDirectory, stateDirectory) {
  return withLocalD1(serverDirectory, stateDirectory, initializeDatabase);
}
