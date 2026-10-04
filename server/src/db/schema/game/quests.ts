import { gameContentQuestFlags, gameContentQuests } from './catalog.js';
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

export const gameQuests = sqliteTable(
  'game_quests',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    quest_id: text('quest_id').notNull(),
    status: text('status').notNull(),
    stage_id: text('stage_id').notNull(),
    claim_id: text('claim_id'),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.quest_id],
      foreignColumns: [
        gameContentQuests.content_version,
        gameContentQuests.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.quest_id] }),
    check(
      'game_quests_check_0',
      sql`status IN ('available','active','completed')`,
    ),
  ],
);

export const gameQuestObjectiveCounts = sqliteTable(
  'game_quest_objective_counts',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    quest_id: text('quest_id').notNull(),
    objective_id: text('objective_id').notNull(),
    count: integer('count').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.quest_id, t.objective_id] }),
    check('game_quest_objective_counts_check_0', sql`count BETWEEN 0 AND 999`),
    foreignKey({
      columns: [t.character_id, t.quest_id],
      foreignColumns: [gameQuests.character_id, gameQuests.quest_id],
    }).onDelete('cascade'),
  ],
);

export const gameQuestFlags = sqliteTable(
  'game_quest_flags',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    flag_id: text('flag_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.flag_id],
      foreignColumns: [
        gameContentQuestFlags.content_version,
        gameContentQuestFlags.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.flag_id] }),
    check('game_quest_flags_check_0', sql`position BETWEEN 0 AND 999`),
  ],
);

export const gameTrackedObjectives = sqliteTable(
  'game_tracked_objectives',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    quest_id: text('quest_id').notNull(),
    objective_id: text('objective_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.position] }),
    check('game_tracked_objectives_check_0', sql`position BETWEEN 0 AND 2`),
    foreignKey({
      columns: [t.character_id, t.quest_id],
      foreignColumns: [gameQuests.character_id, gameQuests.quest_id],
    }).onDelete('cascade'),
  ],
);
