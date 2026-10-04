import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth.js';

// Deliberately separate from campaign state tables and their replace/delete codec.
export const auditRecords = sqliteTable(
  'audit_records',
  {
    sequence: integer('sequence').primaryKey({ autoIncrement: true }),
    id: text('id').notNull().unique(),
    timestamp: integer('timestamp').notNull(),
    userId: text('user_id'),
    characterId: text('character_id'),
    source: text('source', { enum: ['server', 'client'] }).notNull(),
    category: text('category').notNull(),
    type: text('type').notNull(),
    outcome: text('outcome').notNull(),
    message: text('message').notNull(),
    commandId: text('command_id'),
    requestId: text('request_id'),
    revision: integer('revision'),
    encounterId: text('encounter_id'),
    occurredAt: integer('occurred_at'),
    dedupeKey: text('dedupe_key'),
    details: text('details').notNull(),
  },
  (t) => [
    uniqueIndex('audit_dedupe_idx').on(t.dedupeKey),
    uniqueIndex('audit_committed_revision_idx')
      .on(t.characterId, t.revision)
      .where(sql`outcome = 'committed'`),
    index('audit_retention_idx').on(t.timestamp),
    index('audit_character_idx').on(t.characterId, t.sequence),
    index('audit_user_idx').on(t.userId, t.sequence),
    index('audit_command_idx').on(t.commandId),
    index('audit_request_idx').on(t.requestId),
    index('audit_encounter_idx').on(t.characterId, t.encounterId, t.sequence),
  ],
);
export const auditAdministrators = sqliteTable('audit_administrators', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  grantedAt: integer('granted_at').notNull(),
});
export const auditConfiguration = sqliteTable('audit_configuration', {
  key: text('key').primaryKey(),
  value: integer('value').notNull(),
});
