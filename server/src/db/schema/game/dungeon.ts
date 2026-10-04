import {
  gameContentDungeons,
  gameContentStatusEffects,
  gameContentWorlds,
} from './catalog.js';
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
import type { DungeonBlueprint } from '@rebirth/game-core/engine/dungeon/Dungeon';

export const gameDungeonRuns = sqliteTable(
  'game_dungeon_runs',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    definition_id: text('definition_id').notNull(),
    return_world_id: text('return_world_id').notNull(),
    return_x: integer('return_x').notNull(),
    return_y: integer('return_y').notNull(),
    blueprint: text('blueprint', { mode: 'json' })
      .$type<DungeonBlueprint>()
      .notNull(),
    boss_door_opened: integer('boss_door_opened').notNull(),
    selected_chest: text('selected_chest'),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.definition_id],
      foreignColumns: [
        gameContentDungeons.content_version,
        gameContentDungeons.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.return_world_id],
      foreignColumns: [
        gameContentWorlds.content_version,
        gameContentWorlds.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id] }),
    check('game_dungeon_runs_check_0', sql`boss_door_opened IN (0,1)`),
    check('game_dungeon_runs_check_1', sql`json_valid(blueprint)`),
  ],
);

export const gameDungeonFlags = sqliteTable(
  'game_dungeon_flags',
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
    check(
      'game_dungeon_flags_check_0',
      sql`kind IN ('cleared','opened','revealedMimics','usedFountains')`,
    ),
    check('game_dungeon_flags_check_1', sql`position BETWEEN 0 AND 16`),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameDungeonRuns.character_id],
    }).onDelete('cascade'),
  ],
);

export const gameDungeonKeys = sqliteTable(
  'game_dungeon_keys',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    x: integer('x'),
    y: integer('y'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.kind] }),
    check('game_dungeon_keys_check_0', sql`kind IN ('bossKey','treasureKey')`),
    check(
      'game_dungeon_keys_check_1',
      sql`status IN ('absent','dropped','held','spent')`,
    ),
    check('game_dungeon_keys_check_2', sql`(x IS NULL) = (y IS NULL)`),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameDungeonRuns.character_id],
    }).onDelete('cascade'),
  ],
);

export const gameDungeonEffects = sqliteTable(
  'game_dungeon_effects',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    status_id: text('status_id').notNull(),
    stacks: integer('stacks').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.status_id],
      foreignColumns: [
        gameContentStatusEffects.content_version,
        gameContentStatusEffects.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.position] }),
    check('game_dungeon_effects_check_0', sql`position BETWEEN 0 AND 11`),
    check('game_dungeon_effects_check_1', sql`stacks BETWEEN 1 AND 10`),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameDungeonRuns.character_id],
    }).onDelete('cascade'),
  ],
);
