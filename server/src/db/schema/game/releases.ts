import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const gameContentReleases = sqliteTable(
  'game_content_releases',
  {
    content_version: text('content_version').primaryKey(),
    checksum: text('checksum').notNull(),
    schema_version: integer('schema_version').notNull(),
    created_at: integer('created_at').notNull(),
    published: integer('published').notNull().default(0),
  },
  (t) => [
    check('game_content_release_published', sql`${t.published} IN (0,1)`),
  ],
);

export const gameContentConfiguration = sqliteTable(
  'game_content_configuration',
  {
    key: text('key').primaryKey(),
    content_version: text('content_version')
      .notNull()
      .references(() => gameContentReleases.content_version),
  },
);
