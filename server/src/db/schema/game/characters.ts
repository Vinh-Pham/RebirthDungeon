import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  uniqueIndex,
  text,
} from 'drizzle-orm/sqlite-core';
import { gameContentReleases } from './releases.js';
import { user } from '../auth.js';

export const gameCharacters = sqliteTable(
  'game_characters',
  {
    id: text('id').notNull(),
    user_id: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    talent: text('talent').notNull(),
    age: integer('age').notNull(),
    revision: integer('revision').notNull(),
    content_version: text('content_version')
      .notNull()
      .references(() => gameContentReleases.content_version),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    uniqueIndex('game_character_content_idx').on(t.id, t.content_version),
    primaryKey({ columns: [t.id] }),
    check(
      'game_characters_check_0',
      sql`talent IN ('warrior','archery','mage')`,
    ),
    check('game_characters_check_1', sql`age BETWEEN 10 AND 17`),
    check('game_characters_check_2', sql`revision >= 0`),
    check('game_characters_check_3', sql`length(trim(name)) BETWEEN 1 AND 24`),
    index('game_characters_owner_idx').on(t.user_id, t.created_at, t.id),
  ],
);
