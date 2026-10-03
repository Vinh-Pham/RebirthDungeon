import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { readMigrationFiles } from 'drizzle-orm/migrator';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          BETTER_AUTH_SECRET: 'test-only-secret-at-least-thirty-two-bytes',
          BETTER_AUTH_URL: 'https://example.com',
          BETTER_AUTH_TRUSTED_ORIGINS:
            '["rebirthdungeon://","https://app.example.com"]',
          TEST_MIGRATIONS: readMigrationFiles({
            migrationsFolder: 'drizzle',
          }).map((migration) => ({
            name: migration.name,
            queries: migration.sql,
          })),
        },
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
