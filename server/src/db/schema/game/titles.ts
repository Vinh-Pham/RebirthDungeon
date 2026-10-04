import { gameContentTitles } from './catalog.js';
import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { gameCharacters } from './characters.js';

export const gameCharacterTitles = sqliteTable(
  'game_character_titles',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    title_id: text('title_id').notNull(),
    discovered_position: integer('discovered_position'),
    earned_position: integer('earned_position'),
    source: text('source'),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.title_id],
      foreignColumns: [
        gameContentTitles.content_version,
        gameContentTitles.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.title_id] }),
    check(
      'game_character_titles_check_0',
      sql`discovered_position IS NULL OR discovered_position BETWEEN 0 AND 999`,
    ),
    check(
      'game_character_titles_check_1',
      sql`earned_position IS NULL OR earned_position BETWEEN 0 AND 999`,
    ),
  ],
);

export const gameTitleEvidence = sqliteTable(
  'game_title_evidence',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    evidence_id: text('evidence_id').notNull(),
    count: integer('count').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.evidence_id] }),
    check('game_title_evidence_check_0', sql`count BETWEEN 0 AND 1000000`),
  ],
);

export const gameSelectedTitles = sqliteTable(
  'game_selected_titles',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    slot: text('slot').notNull(),
    title_id: text('title_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.slot] }),
    check('game_selected_titles_check_0', sql`slot IN ('first','second')`),
    foreignKey({
      columns: [t.character_id, t.title_id],
      foreignColumns: [
        gameCharacterTitles.character_id,
        gameCharacterTitles.title_id,
      ],
    }).onDelete('cascade'),
  ],
);
