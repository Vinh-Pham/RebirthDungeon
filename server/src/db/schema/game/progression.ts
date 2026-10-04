import { gameContentClasses } from './catalog.js';
import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  primaryKey,
  foreignKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { gameCharacters } from './characters.js';

export const gameHeroes = sqliteTable(
  'game_heroes',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    class_id: text('class_id').notNull(),
    level: integer('level').notNull(),
    cumulative_level: integer('cumulative_level').notNull(),
    experience: integer('experience').notNull(),
    gold: integer('gold').notNull(),
    ap: integer('ap').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.class_id],
      foreignColumns: [
        gameContentClasses.content_version,
        gameContentClasses.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id] }),
    check('game_heroes_check_0', sql`level BETWEEN 1 AND 200`),
    check('game_heroes_check_1', sql`cumulative_level >= level`),
    check('game_heroes_check_2', sql`experience >= 0`),
    check('game_heroes_check_3', sql`gold BETWEEN 0 AND 1000000`),
    check('game_heroes_check_4', sql`ap BETWEEN 0 AND 1000000`),
  ],
);

export const gameMilestoneClaims = sqliteTable(
  'game_milestone_claims',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    milestone_id: text('milestone_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.milestone_id] }),
    check(
      'game_milestone_claims_check_0',
      sql`milestone_id = 'intro-melee-lesson'`,
    ),
    check('game_milestone_claims_check_1', sql`position = 0`),
  ],
);
