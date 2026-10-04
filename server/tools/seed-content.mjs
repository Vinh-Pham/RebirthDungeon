import 'dotenv/config';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { tsImport } from 'tsx/esm/api';
import { withLocalD1 } from './online-database.mjs';
import { checkRemote } from './check-remote.mjs';
import { contentDatabase } from './content-database.mjs';

export async function main(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { local: { type: 'boolean' }, remote: { type: 'boolean' } },
  });
  if (!!values.local === !!values.remote || positionals.length)
    throw new Error(
      'Choose exactly one database: pnpm db:seed:content --local|--remote',
    );
  const { seedCatalog } = await tsImport(
    '../src/game/content.ts',
    import.meta.url,
  );
  const { loadGameContent } = await tsImport(
    '../../packages/game-core/src/data/content.ts',
    import.meta.url,
  );
  const seed = (db) => seedCatalog(db, loadGameContent().data);
  let published;
  if (values.local)
    published = await withLocalD1(
      process.cwd(),
      process.env.LOCAL_D1_STATE,
      seed,
    );
  else {
    if ((await checkRemote()).length)
      throw new Error(
        'Apply the reviewed pending migrations before seeding content.',
      );
    published = await seed(
      contentDatabase({
        account: process.env.CLOUDFLARE_ACCOUNT_ID,
        database: process.env.CLOUDFLARE_DATABASE_ID,
        token: process.env.CLOUDFLARE_D1_TOKEN,
      }),
    );
  }
  console.log(
    published
      ? 'Validated content release published and activated.'
      : 'Identical content release already published; definitions unchanged.',
  );
}
if (import.meta.url === pathToFileURL(process.argv[1]).href)
  await main(process.argv.slice(2));
