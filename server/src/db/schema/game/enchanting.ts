import { gameContentItems } from './catalog.js';
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

export const gameRngStreams = sqliteTable(
  'game_rng_streams',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    seed: integer('seed').notNull(),
    algorithm: text('algorithm').notNull(),
    version: integer('version').notNull(),
    word0: integer('word0').notNull(),
    word1: integer('word1').notNull(),
    word2: integer('word2').notNull(),
    word3: integer('word3').notNull(),
    next_operation_id: integer('next_operation_id'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.kind] }),
    check('game_rng_streams_check_0', sql`kind IN ('journey','enchant')`),
    check('game_rng_streams_check_1', sql`algorithm = 'xoroshiro128plus'`),
    check('game_rng_streams_check_2', sql`version = 1`),
    check(
      'game_rng_streams_check_3',
      sql`word0 != 0 OR word1 != 0 OR word2 != 0 OR word3 != 0`,
    ),
  ],
);

export const gameEnchantReceipts = sqliteTable(
  'game_enchant_receipts',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    operation_id: text('operation_id').notNull(),
    position: integer('position').notNull(),
    kind: text('kind').notNull(),
    message: text('message').notNull(),
    success: integer('success').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.operation_id] }),
    check('game_enchant_receipts_check_0', sql`position BETWEEN 0 AND 99`),
    check('game_enchant_receipts_check_1', sql`kind IN ('apply','burn')`),
    check('game_enchant_receipts_check_2', sql`success IN (0,1)`),
  ],
);

export const gameEnchantRecoveredItems = sqliteTable(
  'game_enchant_recovered_items',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    operation_id: text('operation_id').notNull(),
    position: integer('position').notNull(),
    item_id: text('item_id').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.operation_id, t.position] }),
    check(
      'game_enchant_recovered_items_check_0',
      sql`position BETWEEN 0 AND 1`,
    ),
    foreignKey({
      columns: [t.character_id, t.operation_id],
      foreignColumns: [
        gameEnchantReceipts.character_id,
        gameEnchantReceipts.operation_id,
      ],
    }).onDelete('cascade'),
  ],
);
