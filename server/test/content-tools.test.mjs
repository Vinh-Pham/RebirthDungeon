import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tsImport } from 'tsx/esm/api';
import { contentDatabase } from '../tools/content-database.mjs';
import { main } from '../tools/seed-content.mjs';
import { localDatabase } from './local-db.mjs';
import { migrateLocal } from '../tools/migrate-local.mjs';
const { seedCatalog, ContentRepository } = await tsImport(
  '../src/game/content.ts',
  import.meta.url,
);
const { loadGameContent } = await tsImport(
  '../../packages/game-core/src/data/content.ts',
  import.meta.url,
);
test('content tool requires an explicit exclusive database before doing any work', async () => {
  for (const args of [[], ['--local', '--remote'], ['--local', 'extra']])
    await assert.rejects(main(args), /Choose exactly one/);
});
test(
  'REST content adapter uses parameterized atomic batches and idempotently reconstructs the catalog',
  { timeout: 25000 },
  async (t) => {
    const local = await localDatabase(t);
    await migrateLocal(local);
    const db = contentDatabase({
      account: 'fixture',
      database: 'fixture',
      token: 'fixture',
      fetch: async (_url, request) => {
        const { batch } = JSON.parse(request.body);
        const result = await local.batch(
          batch.map(({ sql, params }) => local.prepare(sql).bind(...params)),
        );
        return Response.json({ success: true, result });
      },
    });
    const data = loadGameContent().data;
    assert.equal(await seedCatalog(db, data), true);
    assert.equal(await seedCatalog(db, data), false);
    assert.deepEqual(
      (await new ContentRepository(db).load('rebirth-13.1')).data,
      data,
    );
  },
);
