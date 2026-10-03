import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler'));
const { Miniflare, convertV4MiniflareOptions } = wranglerRequire('miniflare');

// Isolated D1 without live dev-registry connections, email, cron, or production bindings.
export async function localDatabase(t) {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      name: 'database-test',
      modules: true,
      script: 'export default { fetch() { return new Response("ok"); } };',
      compatibilityDate: '2026-09-24',
      d1Databases: { DB: 'isolated-test' },
    }),
  );
  t.after(() => mf.dispose());
  return mf.getD1Database('DB');
}
