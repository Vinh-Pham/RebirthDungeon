import {
  gameContentItems,
  gameContentSkillBookRecipes,
  gameContentSkills,
} from './catalog.js';
import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { gameCharacters } from './characters.js';

export const gameCharacterSkills = sqliteTable(
  'game_character_skills',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    skill_id: text('skill_id').notNull(),
    rank: text('rank'),
    position: integer('position'),
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
    primaryKey({ columns: [t.character_id, t.skill_id] }),
    uniqueIndex('game_character_skills_discovery_idx').on(
      t.character_id,
      t.position,
    ),
    check(
      'game_character_skills_order_check',
      sql`position IS NULL OR position BETWEEN 0 AND 999`,
    ),
    check(
      'game_character_skills_check_0',
      sql`rank IS NULL OR rank IN ('F','E','D','C','B','A','9','8','7','6','5','4','3','2','1')`,
    ),
  ],
);

export const gameSkillObjectiveCounts = sqliteTable(
  'game_skill_objective_counts',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    skill_id: text('skill_id').notNull(),
    objective_id: text('objective_id').notNull(),
    count: integer('count').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.skill_id, t.objective_id] }),
    check('game_skill_objective_counts_check_0', sql`count BETWEEN 0 AND 1000`),
    foreignKey({
      columns: [t.character_id, t.skill_id],
      foreignColumns: [
        gameCharacterSkills.character_id,
        gameCharacterSkills.skill_id,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameSkillBookCollections = sqliteTable(
  'game_skill_book_collections',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    recipe_id: text('recipe_id').notNull(),
    completed: integer('completed').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.recipe_id],
      foreignColumns: [
        gameContentSkillBookRecipes.content_version,
        gameContentSkillBookRecipes.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.recipe_id] }),
    check('game_skill_book_collections_check_0', sql`completed IN (0,1)`),
  ],
);

export const gameSkillBookPages = sqliteTable(
  'game_skill_book_pages',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    recipe_id: text('recipe_id').notNull(),
    position: integer('position').notNull(),
    page_id: text('page_id').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.page_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    primaryKey({ columns: [t.character_id, t.recipe_id, t.position] }),
    check('game_skill_book_pages_check_0', sql`position BETWEEN 0 AND 19`),
    foreignKey({
      columns: [t.character_id, t.recipe_id],
      foreignColumns: [
        gameSkillBookCollections.character_id,
        gameSkillBookCollections.recipe_id,
      ],
    }).onDelete('cascade'),
  ],
);
