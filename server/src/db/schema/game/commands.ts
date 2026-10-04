import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { gameCharacters } from './characters.js';
import { user } from '../auth.js';
import type { CommandReceipt } from '@rebirth/game-core/online/Contracts';

export const gameCommandReceipts = sqliteTable(
  'game_command_receipts',
  {
    user_id: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    command_id: text('command_id').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    request_hash: text('request_hash').notNull(),
    base_revision: integer('base_revision').notNull(),
    committed_revision: integer('committed_revision').notNull(),
    outcome: text('outcome', { mode: 'json' })
      .$type<CommandReceipt['outcome']>()
      .notNull(),
    created_at: integer('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.user_id, t.command_id] }),
    check(
      'game_command_receipts_check_0',
      sql`committed_revision = base_revision + 1`,
    ),
    check('game_command_receipts_check_1', sql`base_revision >= 0`),
    check('game_command_receipts_check_2', sql`json_valid(outcome)`),
    uniqueIndex('game_command_revision_idx').on(
      t.character_id,
      t.committed_revision,
    ),
    index('game_command_character_idx').on(t.character_id),
  ],
);

export const gameCommandReceiptFeatures = sqliteTable(
  'game_command_receipt_features',
  {
    user_id: text('user_id').notNull(),
    command_id: text('command_id').notNull(),
    feature: text('feature').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.user_id, t.command_id, t.feature] }),
    check(
      'game_command_feature_check',
      sql`feature IN ('character','progression','resources','stats','inventory','equipment','skills','quests','titles','enchanting','journey','rest','dungeon','encounter')`,
    ),
    foreignKey({
      columns: [t.user_id, t.command_id],
      foreignColumns: [
        gameCommandReceipts.user_id,
        gameCommandReceipts.command_id,
      ],
    }).onDelete('cascade'),
  ],
);
