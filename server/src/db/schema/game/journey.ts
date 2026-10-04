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
import { gameContentWorlds } from './catalog.js';

export const gameCampaigns = sqliteTable(
  'game_campaigns',
  {
    content_version: text('content_version').notNull(),
    world_definition_id: text('world_definition_id'),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    world_id: text('world_id').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    encounter_count: integer('encounter_count').notNull(),
    active_service: text('active_service'),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.world_definition_id],
      foreignColumns: [
        gameContentWorlds.content_version,
        gameContentWorlds.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id] }),
    check('game_campaigns_check_0', sql`x >= 0`),
    check('game_campaigns_check_1', sql`y >= 0`),
    check('game_campaigns_check_2', sql`encounter_count BETWEEN 0 AND 1000000`),
  ],
);

export const gameRestState = sqliteTable(
  'game_rest_state',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    resting: integer('resting').notNull(),
    last_rest_tick: integer('last_rest_tick'),
    rest_lease_until: integer('rest_lease_until'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id] }),
    check('game_rest_state_posture', sql`resting IN (0,1)`),
  ],
);

export const gameWorldFlags = sqliteTable(
  'game_world_flags',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    object_id: text('object_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.kind, t.object_id] }),
    check('game_world_flags_check_0', sql`kind IN ('opened','cleared')`),
    check('game_world_flags_check_1', sql`position >= 0`),
  ],
);
