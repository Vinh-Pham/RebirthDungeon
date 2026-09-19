import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const players = sqliteTable('players', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    level: integer('level').notNull().default(1),
    experience: integer('experience').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;