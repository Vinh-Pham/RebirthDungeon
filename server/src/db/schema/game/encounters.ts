import {
  gameContentItems,
  gameContentMaps,
  gameContentSkills,
  gameContentQuests,
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

export const gameEncounters = sqliteTable(
  'game_encounters',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    encounter_id: text('encounter_id').notNull(),
    phase: text('phase').notNull().default('selectingAction'),
    algorithm: text('algorithm').notNull().default('xoroshiro128plus'),
    world_id: text('world_id').notNull(),
    object_id: text('object_id').notNull(),
    map_id: text('map_id').notNull(),
    map_definition_id: text('map_definition_id'),
    seed: integer('seed').notNull(),
    version: integer('version').notNull(),
    word0: integer('word0').notNull(),
    word1: integer('word1').notNull(),
    word2: integer('word2').notNull(),
    word3: integer('word3').notNull(),
    result: text('result'),
    action_sequence: integer('action_sequence').notNull(),
    cursor: integer('cursor').notNull(),
    training_last_action: integer('training_last_action').notNull(),
    quest_last_action: integer('quest_last_action').notNull(),
    title_eligible: integer('title_eligible').notNull(),
    title_flawless: integer('title_flawless').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.map_definition_id],
      foreignColumns: [
        gameContentMaps.content_version,
        gameContentMaps.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id] }),
    check('game_encounters_check_0', sql`version = 1`),
    check(
      'game_encounters_check_1',
      sql`result IS NULL OR result IN ('victory','defeat')`,
    ),
    check('game_encounters_check_2', sql`action_sequence >= 0`),
    check('game_encounters_check_3', sql`cursor >= 0`),
    check('game_encounters_check_4', sql`training_last_action >= 0`),
    check('game_encounters_check_5', sql`quest_last_action >= 0`),
    check('game_encounters_check_6', sql`title_eligible IN (0,1)`),
    check('game_encounters_check_7', sql`title_flawless IN (0,1)`),
  ],
);

export const gameEncounterActors = sqliteTable(
  'game_encounter_actors',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    position: integer('position').notNull(),
    defending_position: integer('defending_position'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id] }),
    check('game_encounter_actors_check_0', sql`position >= 0`),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameEncounters.character_id],
    }).onDelete('cascade'),
  ],
);

export const gameEncounterTurnOrder = sqliteTable(
  'game_encounter_turn_order',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    actor_id: text('actor_id').notNull(),
    defending: integer('defending').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.position] }),
    check('game_encounter_turn_order_check_0', sql`position >= 0`),
    check('game_encounter_turn_order_check_1', sql`defending IN (0,1)`),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActors.character_id,
        gameEncounterActors.actor_id,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameEncounterEnemyHistory = sqliteTable(
  'game_encounter_enemy_history',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    position: integer('position').notNull(),
    action: text('action').notNull(),
    item_id: text('item_id'),
    skill_id: text('skill_id'),
    target_id: text('target_id'),
  },
  (t) => [
    check('game_enemy_history_order', sql`position >= 0`),
    foreignKey({
      columns: [t.content_version, t.item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.skill_id],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.actor_id] }),
    check(
      'game_encounter_enemy_history_check_0',
      sql`action IN ('attack','skill','defend','rest','item')`,
    ),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActors.character_id,
        gameEncounterActors.actor_id,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameEncounterTraining = sqliteTable(
  'game_encounter_training',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    skill_id: text('skill_id').notNull(),
    objective_id: text('objective_id').notNull(),
    count: integer('count').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.skill_id],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.skill_id, t.objective_id] }),
    check('game_encounter_training_check_0', sql`count BETWEEN 0 AND 1000`),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameEncounters.character_id],
    }).onDelete('cascade'),
  ],
);

export const gameEncounterQuestEvidence = sqliteTable(
  'game_encounter_quest_evidence',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    quest_id: text('quest_id').notNull(),
    stage_id: text('stage_id').notNull(),
    objective_id: text('objective_id').notNull(),
    count: integer('count').notNull(),
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
    primaryKey({ columns: [t.character_id, t.quest_id, t.objective_id] }),
    check(
      'game_encounter_quest_evidence_check_0',
      sql`count BETWEEN 0 AND 999`,
    ),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameEncounters.character_id],
    }).onDelete('cascade'),
  ],
);

export const gameEncounterRewards = sqliteTable(
  'game_encounter_rewards',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    gold: integer('gold').notNull(),
    experience: integer('experience').notNull(),
    word0: integer('word0').notNull(),
    word1: integer('word1').notNull(),
    word2: integer('word2').notNull(),
    word3: integer('word3').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id] }),
    check('game_encounter_rewards_check_0', sql`gold >= 0`),
    check('game_encounter_rewards_check_1', sql`experience >= 0`),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameEncounters.character_id],
    }).onDelete('cascade'),
  ],
);

export const gameEncounterRewardItems = sqliteTable(
  'game_encounter_reward_items',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull(),
    collectable: integer('collectable').notNull(),
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
    primaryKey({ columns: [t.character_id, t.position] }),
    check('game_encounter_reward_items_check_0', sql`position >= 0`),
    check('game_encounter_reward_items_check_1', sql`quantity >= 0`),
    check(
      'game_encounter_reward_items_check_2',
      sql`collectable BETWEEN 0 AND quantity`,
    ),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameEncounterRewards.character_id],
    }).onDelete('cascade'),
  ],
);
