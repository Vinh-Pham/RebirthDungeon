import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { gameCharacters } from './characters.js';

export const gameResources = sqliteTable(
  'game_resources',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    health: integer('health').notNull(),
    mana: integer('mana').notNull(),
    stamina: integer('stamina').notNull(),
    wounds: integer('wounds').notNull(),
    fullness_tenths: integer('fullness_tenths').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id] }),
    check('game_resources_check_5', sql`health >= 1`),
    check('game_resources_check_6', sql`mana >= 0`),
    check('game_resources_check_7', sql`stamina >= 0`),
    check('game_resources_check_8', sql`wounds >= 0`),
    check('game_resources_check_9', sql`fullness_tenths BETWEEN 500 AND 1000`),
  ],
);
