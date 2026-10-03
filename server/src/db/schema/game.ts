import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type { DungeonBlueprint } from '@rebirth/game-core/engine/dungeon/Dungeon';
import type { CommandReceipt } from '@rebirth/game-core/online/Contracts';
import { user } from './auth.js';

export const gameCharacters = sqliteTable(
  'game_characters',
  {
    id: text('id').notNull(),
    user_id: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    talent: text('talent').notNull(),
    age: integer('age').notNull(),
    revision: integer('revision').notNull(),
    content_version: text('content_version').notNull(),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id] }),
    check(
      'game_characters_check_0',
      sql`talent IN ('warrior','archery','mage')`,
    ),
    check('game_characters_check_1', sql`age BETWEEN 10 AND 17`),
    check('game_characters_check_2', sql`revision >= 0`),
    check('game_characters_check_3', sql`length(trim(name)) BETWEEN 1 AND 24`),
    index('game_characters_owner_idx').on(t.user_id, t.created_at, t.id),
  ],
);

export const gameHeroes = sqliteTable(
  'game_heroes',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    class_id: text('class_id').notNull(),
    level: integer('level').notNull(),
    cumulative_level: integer('cumulative_level').notNull(),
    experience: integer('experience').notNull(),
    gold: integer('gold').notNull(),
    ap: integer('ap').notNull(),
    health: integer('health').notNull(),
    mana: integer('mana').notNull(),
    stamina: integer('stamina').notNull(),
    wounds: integer('wounds').notNull(),
    fullness_tenths: integer('fullness_tenths').notNull(),
    next_weapon_id: integer('next_weapon_id').notNull(),
    next_armor_id: integer('next_armor_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id] }),
    check('game_heroes_check_0', sql`level BETWEEN 1 AND 200`),
    check('game_heroes_check_1', sql`cumulative_level >= level`),
    check('game_heroes_check_2', sql`experience >= 0`),
    check('game_heroes_check_3', sql`gold BETWEEN 0 AND 1000000`),
    check('game_heroes_check_4', sql`ap BETWEEN 0 AND 1000000`),
    check('game_heroes_check_5', sql`health >= 1`),
    check('game_heroes_check_6', sql`mana >= 0`),
    check('game_heroes_check_7', sql`stamina >= 0`),
    check('game_heroes_check_8', sql`wounds >= 0`),
    check('game_heroes_check_9', sql`fullness_tenths BETWEEN 500 AND 1000`),
    check('game_heroes_check_10', sql`next_weapon_id >= 1`),
    check('game_heroes_check_11', sql`next_armor_id >= 1`),
  ],
);

export const gameCampaigns = sqliteTable(
  'game_campaigns',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    world_id: text('world_id').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    encounter_count: integer('encounter_count').notNull(),
    active_service: text('active_service'),
    resting: integer('resting').notNull(),
    last_rest_tick: integer('last_rest_tick'),
    rest_lease_until: integer('rest_lease_until'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id] }),
    check('game_campaigns_check_0', sql`x >= 0`),
    check('game_campaigns_check_1', sql`y >= 0`),
    check('game_campaigns_check_2', sql`encounter_count BETWEEN 0 AND 1000000`),
    check('game_campaigns_check_3', sql`resting IN (0,1)`),
  ],
);

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

export const gameInventoryStacks = sqliteTable(
  'game_inventory_stacks',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.item_id] }),
    check('game_inventory_stacks_check_0', sql`quantity BETWEEN 1 AND 999`),
  ],
);

export const gameEquipmentInstances = sqliteTable(
  'game_equipment_instances',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    instance_id: text('instance_id').notNull(),
    definition_id: text('definition_id').notNull(),
    kind: text('kind').notNull(),
    durability: integer('durability'),
    locked: integer('locked'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.instance_id] }),
    check('game_equipment_instances_check_0', sql`kind IN ('weapon','armor')`),
    check(
      'game_equipment_instances_check_1',
      sql`(kind = 'weapon' AND durability BETWEEN 0 AND 10000) OR (kind = 'armor' AND durability IS NULL)`,
    ),
    check(
      'game_equipment_instances_check_2',
      sql`locked IS NULL OR locked IN (0,1)`,
    ),
  ],
);

export const gameLoadouts = sqliteTable(
  'game_loadouts',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    weapon_id: text('weapon_id'),
    armor_id: text('armor_id'),
    ammunition_id: text('ammunition_id'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id] }),
    foreignKey({
      columns: [t.character_id, t.weapon_id],
      foreignColumns: [
        gameEquipmentInstances.character_id,
        gameEquipmentInstances.instance_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.armor_id],
      foreignColumns: [
        gameEquipmentInstances.character_id,
        gameEquipmentInstances.instance_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.ammunition_id],
      foreignColumns: [
        gameInventoryStacks.character_id,
        gameInventoryStacks.item_id,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameEquipmentEnchants = sqliteTable(
  'game_equipment_enchants',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    instance_id: text('instance_id').notNull(),
    slot: text('slot').notNull(),
    enchant_id: text('enchant_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.instance_id, t.slot] }),
    check('game_equipment_enchants_check_0', sql`slot IN ('prefix','suffix')`),
    foreignKey({
      columns: [t.character_id, t.instance_id],
      foreignColumns: [
        gameEquipmentInstances.character_id,
        gameEquipmentInstances.instance_id,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameEquipmentEnchantValues = sqliteTable(
  'game_equipment_enchant_values',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    instance_id: text('instance_id').notNull(),
    slot: text('slot').notNull(),
    stat_id: text('stat_id').notNull(),
    value: integer('value').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.instance_id, t.slot, t.stat_id] }),
    check(
      'game_equipment_enchant_values_check_0',
      sql`value BETWEEN -1000 AND 1000`,
    ),
    foreignKey({
      columns: [t.character_id, t.instance_id, t.slot],
      foreignColumns: [
        gameEquipmentEnchants.character_id,
        gameEquipmentEnchants.instance_id,
        gameEquipmentEnchants.slot,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameItemHotbar = sqliteTable(
  'game_item_hotbar',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    item_id: text('item_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.position] }),
    check('game_item_hotbar_check_0', sql`position BETWEEN 0 AND 99`),
  ],
);

export const gameDiscoveredSkills = sqliteTable(
  'game_discovered_skills',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    skill_id: text('skill_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.skill_id] }),
    check('game_discovered_skills_check_0', sql`position BETWEEN 0 AND 999`),
  ],
);

export const gameLearnedSkills = sqliteTable(
  'game_learned_skills',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    skill_id: text('skill_id').notNull(),
    rank: text('rank').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.skill_id] }),
    check(
      'game_learned_skills_check_0',
      sql`rank IN ('F','E','D','C','B','A','9','8','7','6','5','4','3','2','1')`,
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
        gameLearnedSkills.character_id,
        gameLearnedSkills.skill_id,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameSkillBookCollections = sqliteTable(
  'game_skill_book_collections',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    recipe_id: text('recipe_id').notNull(),
    completed: integer('completed').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.recipe_id] }),
    check('game_skill_book_collections_check_0', sql`completed IN (0,1)`),
  ],
);

export const gameSkillBookPages = sqliteTable(
  'game_skill_book_pages',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    recipe_id: text('recipe_id').notNull(),
    position: integer('position').notNull(),
    page_id: text('page_id').notNull(),
  },
  (t) => [
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

export const gameMilestoneClaims = sqliteTable(
  'game_milestone_claims',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    milestone_id: text('milestone_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.milestone_id] }),
    check(
      'game_milestone_claims_check_0',
      sql`milestone_id = 'intro-melee-lesson'`,
    ),
    check('game_milestone_claims_check_1', sql`position = 0`),
  ],
);

export const gameQuests = sqliteTable(
  'game_quests',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    quest_id: text('quest_id').notNull(),
    status: text('status').notNull(),
    stage_id: text('stage_id').notNull(),
    claim_id: text('claim_id'),
  },
  (t) => [
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
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    flag_id: text('flag_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
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

export const gameCharacterTitles = sqliteTable(
  'game_character_titles',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    title_id: text('title_id').notNull(),
    discovered_position: integer('discovered_position'),
    earned_position: integer('earned_position'),
    source: text('source'),
  },
  (t) => [
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
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    operation_id: text('operation_id').notNull(),
    position: integer('position').notNull(),
    item_id: text('item_id').notNull(),
  },
  (t) => [
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

export const gameDungeonRuns = sqliteTable(
  'game_dungeon_runs',
  {
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
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    status_id: text('status_id').notNull(),
    stacks: integer('stacks').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.position] }),
    check('game_dungeon_effects_check_0', sql`position BETWEEN 0 AND 11`),
    check('game_dungeon_effects_check_1', sql`stacks BETWEEN 1 AND 10`),
    foreignKey({
      columns: [t.character_id],
      foreignColumns: [gameDungeonRuns.character_id],
    }).onDelete('cascade'),
  ],
);

export const gameEncounters = sqliteTable(
  'game_encounters',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    encounter_id: text('encounter_id').notNull(),
    phase: text('phase').notNull().default('selectingAction'),
    algorithm: text('algorithm').notNull().default('xoroshiro128plus'),
    world_id: text('world_id').notNull(),
    object_id: text('object_id').notNull(),
    map_id: text('map_id').notNull(),
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

export const gameEncounterActorValues = sqliteTable(
  'game_encounter_actor_values',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    path: text('path').notNull(),
    value_type: text('value_type').notNull(),
    text_value: text('text_value'),
    number_value: real('number_value'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.path] }),
    check(
      'game_encounter_actor_values_check_0',
      sql`value_type IN ('object','array','string','number','boolean')`,
    ),
    check(
      'game_encounter_actor_values_check_1',
      sql`(value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL)`,
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

export const gameEncounterStats = sqliteTable(
  'game_encounter_stats',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    path: text('path').notNull(),
    value_type: text('value_type').notNull(),
    text_value: text('text_value'),
    number_value: real('number_value'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.path] }),
    check(
      'game_encounter_stats_check_0',
      sql`value_type IN ('object','array','string','number','boolean')`,
    ),
    check(
      'game_encounter_stats_check_1',
      sql`(value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL)`,
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

export const gameEncounterInventory = sqliteTable(
  'game_encounter_inventory',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    path: text('path').notNull(),
    value_type: text('value_type').notNull(),
    text_value: text('text_value'),
    number_value: real('number_value'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.path] }),
    check(
      'game_encounter_inventory_check_0',
      sql`value_type IN ('object','array','string','number','boolean')`,
    ),
    check(
      'game_encounter_inventory_check_1',
      sql`(value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL)`,
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

export const gameEncounterStatuses = sqliteTable(
  'game_encounter_statuses',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    path: text('path').notNull(),
    value_type: text('value_type').notNull(),
    text_value: text('text_value'),
    number_value: real('number_value'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.path] }),
    check(
      'game_encounter_statuses_check_0',
      sql`value_type IN ('object','array','string','number','boolean')`,
    ),
    check(
      'game_encounter_statuses_check_1',
      sql`(value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL)`,
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

export const gameEncounterCooldowns = sqliteTable(
  'game_encounter_cooldowns',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    path: text('path').notNull(),
    value_type: text('value_type').notNull(),
    text_value: text('text_value'),
    number_value: real('number_value'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.path] }),
    check(
      'game_encounter_cooldowns_check_0',
      sql`value_type IN ('object','array','string','number','boolean')`,
    ),
    check(
      'game_encounter_cooldowns_check_1',
      sql`(value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL)`,
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

export const gameEncounterSkills = sqliteTable(
  'game_encounter_skills',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    path: text('path').notNull(),
    value_type: text('value_type').notNull(),
    text_value: text('text_value'),
    number_value: real('number_value'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.path] }),
    check(
      'game_encounter_skills_check_0',
      sql`value_type IN ('object','array','string','number','boolean')`,
    ),
    check(
      'game_encounter_skills_check_1',
      sql`(value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL)`,
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

export const gameEncounterSources = sqliteTable(
  'game_encounter_sources',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    path: text('path').notNull(),
    value_type: text('value_type').notNull(),
    text_value: text('text_value'),
    number_value: real('number_value'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.path] }),
    check(
      'game_encounter_sources_check_0',
      sql`value_type IN ('object','array','string','number','boolean')`,
    ),
    check(
      'game_encounter_sources_check_1',
      sql`(value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL)`,
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
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').notNull(),
    action: text('action').notNull(),
    skill_id: text('skill_id'),
    target_id: text('target_id'),
  },
  (t) => [
    primaryKey({ columns: [t.character_id, t.actor_id] }),
    check(
      'game_encounter_enemy_history_check_0',
      sql`action IN ('attack','skill','defend','rest')`,
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
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    skill_id: text('skill_id').notNull(),
    objective_id: text('objective_id').notNull(),
    count: integer('count').notNull(),
  },
  (t) => [
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
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    quest_id: text('quest_id').notNull(),
    stage_id: text('stage_id').notNull(),
    objective_id: text('objective_id').notNull(),
    count: integer('count').notNull(),
  },
  (t) => [
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
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull(),
    collectable: integer('collectable').notNull(),
  },
  (t) => [
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
