// Generated typed catalog tables. Domain validation remains owned by ContentSchema.
import { gameContentReleases } from './releases.js';
import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  foreignKey,
  check,
  uniqueIndex,
  type SQLiteTableExtraConfigValue,
} from 'drizzle-orm/sqlite-core';
import type { RelationalModel } from '../../relational-model.js';

export const gameContentSkills = sqliteTable(
  'game_content_skills',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    mana_cost: integer('mana_cost').notNull(),
    power: integer('power').notNull(),
    element: text('element').notNull(),
    target: text('target').notNull(),
    effect: text('effect'),
    statuses_present: integer('statuses_present').notNull(),
    hit_chance: real('hit_chance'),
    critical_chance: real('critical_chance'),
    stamina_cost: integer('stamina_cost'),
    physical_multiplier: real('physical_multiplier'),
    bypass_defend: integer('bypass_defend'),
    stat_bonuses_present: integer('stat_bonuses_present').notNull(),
    stat_bonuses_strength: real('stat_bonuses_strength'),
    stat_bonuses_intelligence: real('stat_bonuses_intelligence'),
    stat_bonuses_dexterity: real('stat_bonuses_dexterity'),
    stat_bonuses_will: real('stat_bonuses_will'),
    stat_bonuses_luck: real('stat_bonuses_luck'),
    min_power: integer('min_power'),
    max_power: integer('max_power'),
    min_magic_modifier: real('min_magic_modifier'),
    max_magic_modifier: real('max_magic_modifier'),
    category: text('category'),
    kind: text('kind'),
    battle_usable: integer('battle_usable'),
    rank: text('rank'),
    description: text('description'),
    reference: text('reference'),
    game_ranks_present: integer('game_ranks_present').notNull(),
    requires_weapon: text('requires_weapon'),
    acquisition_hint: text('acquisition_hint'),
    enemy_only: integer('enemy_only'),
    enemy_use_present: integer('enemy_use_present').notNull(),
    enemy_use_type: text('enemy_use_type'),
    enemy_use_status_id: text('enemy_use_status_id'),
    enemy_use_chance: real('enemy_use_chance'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_skills_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.enemy_use_status_id],
      foreignColumns: [
        gameContentStatusEffects.content_version,
        gameContentStatusEffects.definition_id,
      ],
    }),
    check(
      'game_content_skills_check_0',
      sql`(mana_cost IS NULL OR mana_cost >= 0)`,
    ),
    check(
      'game_content_skills_check_1',
      sql`(mana_cost IS NULL OR mana_cost <= 9007199254740991)`,
    ),
    check('game_content_skills_check_2', sql`(power IS NULL OR power >= 0)`),
    check(
      'game_content_skills_check_3',
      sql`(power IS NULL OR power <= 1000000)`,
    ),
    check(
      'game_content_skills_check_4',
      sql`(element IS NULL OR element IN ('physical','fire','ice','lightning'))`,
    ),
    check(
      'game_content_skills_check_5',
      sql`(target IS NULL OR target IN ('self','ally','enemy','allEnemies'))`,
    ),
    check(
      'game_content_skills_check_6',
      sql`(effect IS NULL OR effect IN ('damage','heal','buff'))`,
    ),
    check(
      'game_content_skills_check_7',
      sql`(statuses_present IS NULL OR statuses_present IN (0,1))`,
    ),
    check(
      'game_content_skills_check_8',
      sql`(hit_chance IS NULL OR hit_chance >= 0)`,
    ),
    check(
      'game_content_skills_check_9',
      sql`(hit_chance IS NULL OR hit_chance <= 1)`,
    ),
    check(
      'game_content_skills_check_10',
      sql`(critical_chance IS NULL OR critical_chance >= 0)`,
    ),
    check(
      'game_content_skills_check_11',
      sql`(critical_chance IS NULL OR critical_chance <= 1)`,
    ),
    check(
      'game_content_skills_check_12',
      sql`(stamina_cost IS NULL OR stamina_cost >= 0)`,
    ),
    check(
      'game_content_skills_check_13',
      sql`(stamina_cost IS NULL OR stamina_cost <= 10000)`,
    ),
    check(
      'game_content_skills_check_14',
      sql`(physical_multiplier IS NULL OR physical_multiplier >= 0)`,
    ),
    check(
      'game_content_skills_check_15',
      sql`(physical_multiplier IS NULL OR physical_multiplier <= 10)`,
    ),
    check(
      'game_content_skills_check_16',
      sql`(bypass_defend IS NULL OR bypass_defend IN (0,1))`,
    ),
    check(
      'game_content_skills_check_17',
      sql`(stat_bonuses_present IS NULL OR stat_bonuses_present IN (0,1))`,
    ),
    check(
      'game_content_skills_check_18',
      sql`(stat_bonuses_strength IS NULL OR stat_bonuses_strength >= -1500)`,
    ),
    check(
      'game_content_skills_check_19',
      sql`(stat_bonuses_strength IS NULL OR stat_bonuses_strength <= 1500)`,
    ),
    check(
      'game_content_skills_check_20',
      sql`(stat_bonuses_intelligence IS NULL OR stat_bonuses_intelligence >= -1500)`,
    ),
    check(
      'game_content_skills_check_21',
      sql`(stat_bonuses_intelligence IS NULL OR stat_bonuses_intelligence <= 1500)`,
    ),
    check(
      'game_content_skills_check_22',
      sql`(stat_bonuses_dexterity IS NULL OR stat_bonuses_dexterity >= -1500)`,
    ),
    check(
      'game_content_skills_check_23',
      sql`(stat_bonuses_dexterity IS NULL OR stat_bonuses_dexterity <= 1500)`,
    ),
    check(
      'game_content_skills_check_24',
      sql`(stat_bonuses_will IS NULL OR stat_bonuses_will >= -1500)`,
    ),
    check(
      'game_content_skills_check_25',
      sql`(stat_bonuses_will IS NULL OR stat_bonuses_will <= 1500)`,
    ),
    check(
      'game_content_skills_check_26',
      sql`(stat_bonuses_luck IS NULL OR stat_bonuses_luck >= -1500)`,
    ),
    check(
      'game_content_skills_check_27',
      sql`(stat_bonuses_luck IS NULL OR stat_bonuses_luck <= 1500)`,
    ),
    check(
      'game_content_skills_check_28',
      sql`(min_power IS NULL OR min_power >= 0)`,
    ),
    check(
      'game_content_skills_check_29',
      sql`(min_power IS NULL OR min_power <= 1000000)`,
    ),
    check(
      'game_content_skills_check_30',
      sql`(max_power IS NULL OR max_power >= 0)`,
    ),
    check(
      'game_content_skills_check_31',
      sql`(max_power IS NULL OR max_power <= 1000000)`,
    ),
    check(
      'game_content_skills_check_32',
      sql`(min_magic_modifier IS NULL OR min_magic_modifier >= 0)`,
    ),
    check(
      'game_content_skills_check_33',
      sql`(min_magic_modifier IS NULL OR min_magic_modifier <= 10)`,
    ),
    check(
      'game_content_skills_check_34',
      sql`(max_magic_modifier IS NULL OR max_magic_modifier >= 0)`,
    ),
    check(
      'game_content_skills_check_35',
      sql`(max_magic_modifier IS NULL OR max_magic_modifier <= 10)`,
    ),
    check(
      'game_content_skills_check_36',
      sql`(category IS NULL OR category IN ('combat','magic','life'))`,
    ),
    check(
      'game_content_skills_check_37',
      sql`(kind IS NULL OR kind IN ('active','passive','life'))`,
    ),
    check(
      'game_content_skills_check_38',
      sql`(battle_usable IS NULL OR battle_usable IN (0,1))`,
    ),
    check(
      'game_content_skills_check_39',
      sql`(rank IS NULL OR rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))`,
    ),
    check(
      'game_content_skills_check_40',
      sql`(reference IS NULL OR json_valid(reference))`,
    ),
    check(
      'game_content_skills_check_41',
      sql`(game_ranks_present IS NULL OR game_ranks_present IN (0,1))`,
    ),
    check(
      'game_content_skills_check_42',
      sql`(requires_weapon IS NULL OR requires_weapon IN ('melee','sword'))`,
    ),
    check(
      'game_content_skills_check_43',
      sql`(enemy_only IS NULL OR enemy_only IN (0,1))`,
    ),
    check(
      'game_content_skills_check_44',
      sql`(enemy_use_present IS NULL OR enemy_use_present IN (0,1))`,
    ),
    check(
      'game_content_skills_check_45',
      sql`(enemy_use_chance IS NULL OR enemy_use_chance >= 0)`,
    ),
    check(
      'game_content_skills_check_46',
      sql`(enemy_use_chance IS NULL OR enemy_use_chance <= 1)`,
    ),
  ],
);

export const gameContentSkillsStatuses = sqliteTable(
  'game_content_skills_statuses',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    statuses_position: integer('statuses_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.statuses_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
        gameContentSkills.position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentSkillsGameRanks = sqliteTable(
  'game_content_skills_game_ranks',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    game_ranks_key: text('game_ranks_key').notNull(),
    value_min_power: integer('value_min_power').notNull(),
    value_max_power: integer('value_max_power').notNull(),
    value_mana_cost: integer('value_mana_cost').notNull(),
    value_stamina_cost: integer('value_stamina_cost').notNull(),
    value_physical_multiplier: real('value_physical_multiplier'),
    value_bypass_defend: integer('value_bypass_defend'),
    value_cooldown: integer('value_cooldown'),
    value_next_rank: text('value_next_rank'),
    value_ap_cost: integer('value_ap_cost'),
    value_stat_bonuses_present: integer('value_stat_bonuses_present').notNull(),
    value_stat_bonuses_strength: real('value_stat_bonuses_strength'),
    value_stat_bonuses_intelligence: real('value_stat_bonuses_intelligence'),
    value_stat_bonuses_dexterity: real('value_stat_bonuses_dexterity'),
    value_stat_bonuses_will: real('value_stat_bonuses_will'),
    value_stat_bonuses_luck: real('value_stat_bonuses_luck'),
    value_max_health: integer('value_max_health'),
    value_melee_min: integer('value_melee_min'),
    value_melee_max: integer('value_melee_max'),
    value_sword_min: integer('value_sword_min'),
    value_sword_max: integer('value_sword_max'),
    value_sword_balance: real('value_sword_balance'),
    value_ranged_min: integer('value_ranged_min'),
    value_ranged_max: integer('value_ranged_max'),
    value_ranged_balance: real('value_ranged_balance'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.game_ranks_key,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
        gameContentSkills.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_skills_game_ranks_check_0',
      sql`(value_min_power IS NULL OR value_min_power >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_1',
      sql`(value_min_power IS NULL OR value_min_power <= 1000000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_2',
      sql`(value_max_power IS NULL OR value_max_power >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_3',
      sql`(value_max_power IS NULL OR value_max_power <= 1000000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_4',
      sql`(value_mana_cost IS NULL OR value_mana_cost >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_5',
      sql`(value_mana_cost IS NULL OR value_mana_cost <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_6',
      sql`(value_stamina_cost IS NULL OR value_stamina_cost >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_7',
      sql`(value_stamina_cost IS NULL OR value_stamina_cost <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_8',
      sql`(value_physical_multiplier IS NULL OR value_physical_multiplier >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_9',
      sql`(value_physical_multiplier IS NULL OR value_physical_multiplier <= 10)`,
    ),
    check(
      'game_content_skills_game_ranks_check_10',
      sql`(value_bypass_defend IS NULL OR value_bypass_defend IN (0,1))`,
    ),
    check(
      'game_content_skills_game_ranks_check_11',
      sql`(value_cooldown IS NULL OR value_cooldown >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_12',
      sql`(value_cooldown IS NULL OR value_cooldown <= 100)`,
    ),
    check(
      'game_content_skills_game_ranks_check_13',
      sql`(value_next_rank IS NULL OR value_next_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))`,
    ),
    check(
      'game_content_skills_game_ranks_check_14',
      sql`(value_ap_cost IS NULL OR value_ap_cost >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_15',
      sql`(value_ap_cost IS NULL OR value_ap_cost <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_16',
      sql`(value_stat_bonuses_present IS NULL OR value_stat_bonuses_present IN (0,1))`,
    ),
    check(
      'game_content_skills_game_ranks_check_17',
      sql`(value_stat_bonuses_strength IS NULL OR value_stat_bonuses_strength >= -1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_18',
      sql`(value_stat_bonuses_strength IS NULL OR value_stat_bonuses_strength <= 1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_19',
      sql`(value_stat_bonuses_intelligence IS NULL OR value_stat_bonuses_intelligence >= -1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_20',
      sql`(value_stat_bonuses_intelligence IS NULL OR value_stat_bonuses_intelligence <= 1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_21',
      sql`(value_stat_bonuses_dexterity IS NULL OR value_stat_bonuses_dexterity >= -1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_22',
      sql`(value_stat_bonuses_dexterity IS NULL OR value_stat_bonuses_dexterity <= 1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_23',
      sql`(value_stat_bonuses_will IS NULL OR value_stat_bonuses_will >= -1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_24',
      sql`(value_stat_bonuses_will IS NULL OR value_stat_bonuses_will <= 1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_25',
      sql`(value_stat_bonuses_luck IS NULL OR value_stat_bonuses_luck >= -1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_26',
      sql`(value_stat_bonuses_luck IS NULL OR value_stat_bonuses_luck <= 1500)`,
    ),
    check(
      'game_content_skills_game_ranks_check_27',
      sql`(value_max_health IS NULL OR value_max_health >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_28',
      sql`(value_max_health IS NULL OR value_max_health <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_29',
      sql`(value_melee_min IS NULL OR value_melee_min >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_30',
      sql`(value_melee_min IS NULL OR value_melee_min <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_31',
      sql`(value_melee_max IS NULL OR value_melee_max >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_32',
      sql`(value_melee_max IS NULL OR value_melee_max <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_33',
      sql`(value_sword_min IS NULL OR value_sword_min >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_34',
      sql`(value_sword_min IS NULL OR value_sword_min <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_35',
      sql`(value_sword_max IS NULL OR value_sword_max >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_36',
      sql`(value_sword_max IS NULL OR value_sword_max <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_37',
      sql`(value_sword_balance IS NULL OR value_sword_balance >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_38',
      sql`(value_sword_balance IS NULL OR value_sword_balance <= 1)`,
    ),
    check(
      'game_content_skills_game_ranks_check_39',
      sql`(value_ranged_min IS NULL OR value_ranged_min >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_40',
      sql`(value_ranged_min IS NULL OR value_ranged_min <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_41',
      sql`(value_ranged_max IS NULL OR value_ranged_max >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_42',
      sql`(value_ranged_max IS NULL OR value_ranged_max <= 10000)`,
    ),
    check(
      'game_content_skills_game_ranks_check_43',
      sql`(value_ranged_balance IS NULL OR value_ranged_balance >= 0)`,
    ),
    check(
      'game_content_skills_game_ranks_check_44',
      sql`(value_ranged_balance IS NULL OR value_ranged_balance <= 1)`,
    ),
  ],
);

export const gameContentSkillsGameRanksValueObjectives = sqliteTable(
  'game_content_skills_game_ranks_value_objectives',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    game_ranks_key: text('game_ranks_key').notNull(),
    value_objectives_position: integer('value_objectives_position').notNull(),
    value_id: text('value_id').notNull(),
    value_label: text('value_label').notNull(),
    value_event: text('value_event').notNull(),
    value_scope: text('value_scope').notNull(),
    value_points: integer('value_points').notNull(),
    value_maximum: integer('value_maximum').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.game_ranks_key,
        t.value_objectives_position,
      ],
    }),
    foreignKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.game_ranks_key,
      ],
      foreignColumns: [
        gameContentSkillsGameRanks.content_version,
        gameContentSkillsGameRanks.definition_id,
        gameContentSkillsGameRanks.position,
        gameContentSkillsGameRanks.game_ranks_key,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_skills_game_ranks_value_objectives_check_0',
      sql`(value_event IS NULL OR value_event IN ('use','damage','defeat','heal','enchantSuccess','enchantFailure','burnUse','recovery'))`,
    ),
    check(
      'game_content_skills_game_ranks_value_objectives_check_1',
      sql`(value_scope IS NULL OR value_scope IN ('action','target','encounter'))`,
    ),
    check(
      'game_content_skills_game_ranks_value_objectives_check_2',
      sql`(value_points IS NULL OR value_points >= 1)`,
    ),
    check(
      'game_content_skills_game_ranks_value_objectives_check_3',
      sql`(value_points IS NULL OR value_points <= 100)`,
    ),
    check(
      'game_content_skills_game_ranks_value_objectives_check_4',
      sql`(value_maximum IS NULL OR value_maximum >= 1)`,
    ),
    check(
      'game_content_skills_game_ranks_value_objectives_check_5',
      sql`(value_maximum IS NULL OR value_maximum <= 1000)`,
    ),
  ],
);

export const gameContentEnemies = sqliteTable(
  'game_content_enemies',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    max_health: integer('max_health').notNull(),
    max_mana: integer('max_mana').notNull(),
    combatant_attack: integer('combatant_attack').notNull(),
    combatant_defense: integer('combatant_defense').notNull(),
    combatant_speed: integer('combatant_speed').notNull(),
    combatant_min_damage: integer('combatant_min_damage'),
    combatant_max_damage: integer('combatant_max_damage'),
    combatant_balance: real('combatant_balance'),
    combatant_magic_attack: integer('combatant_magic_attack'),
    combatant_magic_defense: integer('combatant_magic_defense'),
    combatant_protection: integer('combatant_protection'),
    combatant_magic_protection: integer('combatant_magic_protection'),
    combatant_magic_balance: real('combatant_magic_balance'),
    combatant_magic_critical_chance: real('combatant_magic_critical_chance'),
    combatant_critical_rating: real('combatant_critical_rating'),
    combatant_min_injury: real('combatant_min_injury'),
    combatant_max_injury: real('combatant_max_injury'),
    combatant_armor_pierce: integer('combatant_armor_pierce'),
    combatant_hit_chance: real('combatant_hit_chance'),
    combatant_evasion: real('combatant_evasion'),
    combatant_critical_chance: real('combatant_critical_chance'),
    combatant_critical_multiplier: real('combatant_critical_multiplier'),
    max_stamina: integer('max_stamina'),
    sprite_atlas: text('sprite_atlas').notNull(),
    sprite_frame: integer('sprite_frame').notNull(),
    sprite_idle_frames_present: integer('sprite_idle_frames_present').notNull(),
    battle_a_i_present: integer('battle_a_i_present').notNull(),
    battle_a_i_engine_id: text('battle_a_i_engine_id'),
    battle_a_i_config: text('battle_a_i_config'),
    experience: integer('experience'),
    gold: integer('gold'),
    loot_present: integer('loot_present').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_enemies_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.sprite_atlas],
      foreignColumns: [
        gameContentAtlases.content_version,
        gameContentAtlases.definition_id,
      ],
    }),
    check(
      'game_content_enemies_check_0',
      sql`(max_health IS NULL OR max_health >= 1)`,
    ),
    check(
      'game_content_enemies_check_1',
      sql`(max_health IS NULL OR max_health <= 100000)`,
    ),
    check(
      'game_content_enemies_check_2',
      sql`(max_mana IS NULL OR max_mana >= 0)`,
    ),
    check(
      'game_content_enemies_check_3',
      sql`(max_mana IS NULL OR max_mana <= 100000)`,
    ),
    check(
      'game_content_enemies_check_4',
      sql`(combatant_attack IS NULL OR combatant_attack >= 0)`,
    ),
    check(
      'game_content_enemies_check_5',
      sql`(combatant_attack IS NULL OR combatant_attack <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_6',
      sql`(combatant_defense IS NULL OR combatant_defense >= 0)`,
    ),
    check(
      'game_content_enemies_check_7',
      sql`(combatant_defense IS NULL OR combatant_defense <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_8',
      sql`(combatant_speed IS NULL OR combatant_speed >= 0)`,
    ),
    check(
      'game_content_enemies_check_9',
      sql`(combatant_speed IS NULL OR combatant_speed <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_10',
      sql`(combatant_min_damage IS NULL OR combatant_min_damage >= 0)`,
    ),
    check(
      'game_content_enemies_check_11',
      sql`(combatant_min_damage IS NULL OR combatant_min_damage <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_12',
      sql`(combatant_max_damage IS NULL OR combatant_max_damage >= 0)`,
    ),
    check(
      'game_content_enemies_check_13',
      sql`(combatant_max_damage IS NULL OR combatant_max_damage <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_14',
      sql`(combatant_balance IS NULL OR combatant_balance >= 0)`,
    ),
    check(
      'game_content_enemies_check_15',
      sql`(combatant_balance IS NULL OR combatant_balance <= 1)`,
    ),
    check(
      'game_content_enemies_check_16',
      sql`(combatant_magic_attack IS NULL OR combatant_magic_attack >= 0)`,
    ),
    check(
      'game_content_enemies_check_17',
      sql`(combatant_magic_attack IS NULL OR combatant_magic_attack <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_18',
      sql`(combatant_magic_defense IS NULL OR combatant_magic_defense >= 0)`,
    ),
    check(
      'game_content_enemies_check_19',
      sql`(combatant_magic_defense IS NULL OR combatant_magic_defense <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_20',
      sql`(combatant_protection IS NULL OR combatant_protection >= 0)`,
    ),
    check(
      'game_content_enemies_check_21',
      sql`(combatant_protection IS NULL OR combatant_protection <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_22',
      sql`(combatant_magic_protection IS NULL OR combatant_magic_protection >= 0)`,
    ),
    check(
      'game_content_enemies_check_23',
      sql`(combatant_magic_protection IS NULL OR combatant_magic_protection <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_24',
      sql`(combatant_magic_balance IS NULL OR combatant_magic_balance >= 0)`,
    ),
    check(
      'game_content_enemies_check_25',
      sql`(combatant_magic_balance IS NULL OR combatant_magic_balance <= 1)`,
    ),
    check(
      'game_content_enemies_check_26',
      sql`(combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance >= 0)`,
    ),
    check(
      'game_content_enemies_check_27',
      sql`(combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance <= 9.999)`,
    ),
    check(
      'game_content_enemies_check_28',
      sql`(combatant_critical_rating IS NULL OR combatant_critical_rating >= 0)`,
    ),
    check(
      'game_content_enemies_check_29',
      sql`(combatant_critical_rating IS NULL OR combatant_critical_rating <= 9.999)`,
    ),
    check(
      'game_content_enemies_check_30',
      sql`(combatant_min_injury IS NULL OR combatant_min_injury >= 0)`,
    ),
    check(
      'game_content_enemies_check_31',
      sql`(combatant_min_injury IS NULL OR combatant_min_injury <= 1)`,
    ),
    check(
      'game_content_enemies_check_32',
      sql`(combatant_max_injury IS NULL OR combatant_max_injury >= 0)`,
    ),
    check(
      'game_content_enemies_check_33',
      sql`(combatant_max_injury IS NULL OR combatant_max_injury <= 1)`,
    ),
    check(
      'game_content_enemies_check_34',
      sql`(combatant_armor_pierce IS NULL OR combatant_armor_pierce >= 0)`,
    ),
    check(
      'game_content_enemies_check_35',
      sql`(combatant_armor_pierce IS NULL OR combatant_armor_pierce <= 1000000)`,
    ),
    check(
      'game_content_enemies_check_36',
      sql`(combatant_hit_chance IS NULL OR combatant_hit_chance >= 0)`,
    ),
    check(
      'game_content_enemies_check_37',
      sql`(combatant_hit_chance IS NULL OR combatant_hit_chance <= 1)`,
    ),
    check(
      'game_content_enemies_check_38',
      sql`(combatant_evasion IS NULL OR combatant_evasion >= 0)`,
    ),
    check(
      'game_content_enemies_check_39',
      sql`(combatant_evasion IS NULL OR combatant_evasion <= 1)`,
    ),
    check(
      'game_content_enemies_check_40',
      sql`(combatant_critical_chance IS NULL OR combatant_critical_chance >= 0)`,
    ),
    check(
      'game_content_enemies_check_41',
      sql`(combatant_critical_chance IS NULL OR combatant_critical_chance <= 1)`,
    ),
    check(
      'game_content_enemies_check_42',
      sql`(combatant_critical_multiplier IS NULL OR combatant_critical_multiplier >= 1)`,
    ),
    check(
      'game_content_enemies_check_43',
      sql`(combatant_critical_multiplier IS NULL OR combatant_critical_multiplier <= 10)`,
    ),
    check(
      'game_content_enemies_check_44',
      sql`(max_stamina IS NULL OR max_stamina >= 0)`,
    ),
    check(
      'game_content_enemies_check_45',
      sql`(max_stamina IS NULL OR max_stamina <= 100000)`,
    ),
    check(
      'game_content_enemies_check_46',
      sql`(sprite_frame IS NULL OR sprite_frame >= 0)`,
    ),
    check(
      'game_content_enemies_check_47',
      sql`(sprite_frame IS NULL OR sprite_frame <= 9007199254740991)`,
    ),
    check(
      'game_content_enemies_check_48',
      sql`(sprite_idle_frames_present IS NULL OR sprite_idle_frames_present IN (0,1))`,
    ),
    check(
      'game_content_enemies_check_49',
      sql`(battle_a_i_present IS NULL OR battle_a_i_present IN (0,1))`,
    ),
    check(
      'game_content_enemies_check_50',
      sql`(battle_a_i_config IS NULL OR json_valid(battle_a_i_config))`,
    ),
    check(
      'game_content_enemies_check_51',
      sql`(experience IS NULL OR experience >= 0)`,
    ),
    check(
      'game_content_enemies_check_52',
      sql`(experience IS NULL OR experience <= 10000)`,
    ),
    check('game_content_enemies_check_53', sql`(gold IS NULL OR gold >= 0)`),
    check(
      'game_content_enemies_check_54',
      sql`(gold IS NULL OR gold <= 10000)`,
    ),
    check(
      'game_content_enemies_check_55',
      sql`(loot_present IS NULL OR loot_present IN (0,1))`,
    ),
  ],
);

export const gameContentEnemiesSkills = sqliteTable(
  'game_content_enemies_skills',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    skills_position: integer('skills_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.skills_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnemies.content_version,
        gameContentEnemies.definition_id,
        gameContentEnemies.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
  ],
);

export const gameContentEnemiesSpriteIdleFrames = sqliteTable(
  'game_content_enemies_sprite_idle_frames',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    sprite_idle_frames_position: integer(
      'sprite_idle_frames_position',
    ).notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.sprite_idle_frames_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnemies.content_version,
        gameContentEnemies.definition_id,
        gameContentEnemies.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_enemies_sprite_idle_frames_check_0',
      sql`(value IS NULL OR value >= 0)`,
    ),
    check(
      'game_content_enemies_sprite_idle_frames_check_1',
      sql`(value IS NULL OR value <= 9007199254740991)`,
    ),
  ],
);

export const gameContentEnemiesLoot = sqliteTable(
  'game_content_enemies_loot',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    loot_position: integer('loot_position').notNull(),
    value_item_id: text('value_item_id').notNull(),
    value_chance: real('value_chance').notNull(),
    value_min: integer('value_min').notNull(),
    value_max: integer('value_max').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.loot_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnemies.content_version,
        gameContentEnemies.definition_id,
        gameContentEnemies.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    check(
      'game_content_enemies_loot_check_0',
      sql`(value_chance IS NULL OR value_chance >= 0)`,
    ),
    check(
      'game_content_enemies_loot_check_1',
      sql`(value_chance IS NULL OR value_chance <= 1)`,
    ),
    check(
      'game_content_enemies_loot_check_2',
      sql`(value_min IS NULL OR value_min >= 1)`,
    ),
    check(
      'game_content_enemies_loot_check_3',
      sql`(value_min IS NULL OR value_min <= 99)`,
    ),
    check(
      'game_content_enemies_loot_check_4',
      sql`(value_max IS NULL OR value_max >= 1)`,
    ),
    check(
      'game_content_enemies_loot_check_5',
      sql`(value_max IS NULL OR value_max <= 99)`,
    ),
  ],
);

export const gameContentClasses = sqliteTable(
  'game_content_classes',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    max_health: integer('max_health').notNull(),
    max_mana: integer('max_mana').notNull(),
    combatant_attack: integer('combatant_attack').notNull(),
    combatant_defense: integer('combatant_defense').notNull(),
    combatant_speed: integer('combatant_speed').notNull(),
    combatant_min_damage: integer('combatant_min_damage'),
    combatant_max_damage: integer('combatant_max_damage'),
    combatant_balance: real('combatant_balance'),
    combatant_magic_attack: integer('combatant_magic_attack'),
    combatant_magic_defense: integer('combatant_magic_defense'),
    combatant_protection: integer('combatant_protection'),
    combatant_magic_protection: integer('combatant_magic_protection'),
    combatant_magic_balance: real('combatant_magic_balance'),
    combatant_magic_critical_chance: real('combatant_magic_critical_chance'),
    combatant_critical_rating: real('combatant_critical_rating'),
    combatant_min_injury: real('combatant_min_injury'),
    combatant_max_injury: real('combatant_max_injury'),
    combatant_armor_pierce: integer('combatant_armor_pierce'),
    combatant_hit_chance: real('combatant_hit_chance'),
    combatant_evasion: real('combatant_evasion'),
    combatant_critical_chance: real('combatant_critical_chance'),
    combatant_critical_multiplier: real('combatant_critical_multiplier'),
    max_stamina: integer('max_stamina'),
    sprite_atlas: text('sprite_atlas').notNull(),
    sprite_frame: integer('sprite_frame').notNull(),
    sprite_idle_frames_present: integer('sprite_idle_frames_present').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_classes_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.sprite_atlas],
      foreignColumns: [
        gameContentAtlases.content_version,
        gameContentAtlases.definition_id,
      ],
    }),
    check(
      'game_content_classes_check_0',
      sql`(max_health IS NULL OR max_health >= 1)`,
    ),
    check(
      'game_content_classes_check_1',
      sql`(max_health IS NULL OR max_health <= 100000)`,
    ),
    check(
      'game_content_classes_check_2',
      sql`(max_mana IS NULL OR max_mana >= 0)`,
    ),
    check(
      'game_content_classes_check_3',
      sql`(max_mana IS NULL OR max_mana <= 100000)`,
    ),
    check(
      'game_content_classes_check_4',
      sql`(combatant_attack IS NULL OR combatant_attack >= 0)`,
    ),
    check(
      'game_content_classes_check_5',
      sql`(combatant_attack IS NULL OR combatant_attack <= 1000000)`,
    ),
    check(
      'game_content_classes_check_6',
      sql`(combatant_defense IS NULL OR combatant_defense >= 0)`,
    ),
    check(
      'game_content_classes_check_7',
      sql`(combatant_defense IS NULL OR combatant_defense <= 1000000)`,
    ),
    check(
      'game_content_classes_check_8',
      sql`(combatant_speed IS NULL OR combatant_speed >= 0)`,
    ),
    check(
      'game_content_classes_check_9',
      sql`(combatant_speed IS NULL OR combatant_speed <= 1000000)`,
    ),
    check(
      'game_content_classes_check_10',
      sql`(combatant_min_damage IS NULL OR combatant_min_damage >= 0)`,
    ),
    check(
      'game_content_classes_check_11',
      sql`(combatant_min_damage IS NULL OR combatant_min_damage <= 1000000)`,
    ),
    check(
      'game_content_classes_check_12',
      sql`(combatant_max_damage IS NULL OR combatant_max_damage >= 0)`,
    ),
    check(
      'game_content_classes_check_13',
      sql`(combatant_max_damage IS NULL OR combatant_max_damage <= 1000000)`,
    ),
    check(
      'game_content_classes_check_14',
      sql`(combatant_balance IS NULL OR combatant_balance >= 0)`,
    ),
    check(
      'game_content_classes_check_15',
      sql`(combatant_balance IS NULL OR combatant_balance <= 1)`,
    ),
    check(
      'game_content_classes_check_16',
      sql`(combatant_magic_attack IS NULL OR combatant_magic_attack >= 0)`,
    ),
    check(
      'game_content_classes_check_17',
      sql`(combatant_magic_attack IS NULL OR combatant_magic_attack <= 1000000)`,
    ),
    check(
      'game_content_classes_check_18',
      sql`(combatant_magic_defense IS NULL OR combatant_magic_defense >= 0)`,
    ),
    check(
      'game_content_classes_check_19',
      sql`(combatant_magic_defense IS NULL OR combatant_magic_defense <= 1000000)`,
    ),
    check(
      'game_content_classes_check_20',
      sql`(combatant_protection IS NULL OR combatant_protection >= 0)`,
    ),
    check(
      'game_content_classes_check_21',
      sql`(combatant_protection IS NULL OR combatant_protection <= 1000000)`,
    ),
    check(
      'game_content_classes_check_22',
      sql`(combatant_magic_protection IS NULL OR combatant_magic_protection >= 0)`,
    ),
    check(
      'game_content_classes_check_23',
      sql`(combatant_magic_protection IS NULL OR combatant_magic_protection <= 1000000)`,
    ),
    check(
      'game_content_classes_check_24',
      sql`(combatant_magic_balance IS NULL OR combatant_magic_balance >= 0)`,
    ),
    check(
      'game_content_classes_check_25',
      sql`(combatant_magic_balance IS NULL OR combatant_magic_balance <= 1)`,
    ),
    check(
      'game_content_classes_check_26',
      sql`(combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance >= 0)`,
    ),
    check(
      'game_content_classes_check_27',
      sql`(combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance <= 9.999)`,
    ),
    check(
      'game_content_classes_check_28',
      sql`(combatant_critical_rating IS NULL OR combatant_critical_rating >= 0)`,
    ),
    check(
      'game_content_classes_check_29',
      sql`(combatant_critical_rating IS NULL OR combatant_critical_rating <= 9.999)`,
    ),
    check(
      'game_content_classes_check_30',
      sql`(combatant_min_injury IS NULL OR combatant_min_injury >= 0)`,
    ),
    check(
      'game_content_classes_check_31',
      sql`(combatant_min_injury IS NULL OR combatant_min_injury <= 1)`,
    ),
    check(
      'game_content_classes_check_32',
      sql`(combatant_max_injury IS NULL OR combatant_max_injury >= 0)`,
    ),
    check(
      'game_content_classes_check_33',
      sql`(combatant_max_injury IS NULL OR combatant_max_injury <= 1)`,
    ),
    check(
      'game_content_classes_check_34',
      sql`(combatant_armor_pierce IS NULL OR combatant_armor_pierce >= 0)`,
    ),
    check(
      'game_content_classes_check_35',
      sql`(combatant_armor_pierce IS NULL OR combatant_armor_pierce <= 1000000)`,
    ),
    check(
      'game_content_classes_check_36',
      sql`(combatant_hit_chance IS NULL OR combatant_hit_chance >= 0)`,
    ),
    check(
      'game_content_classes_check_37',
      sql`(combatant_hit_chance IS NULL OR combatant_hit_chance <= 1)`,
    ),
    check(
      'game_content_classes_check_38',
      sql`(combatant_evasion IS NULL OR combatant_evasion >= 0)`,
    ),
    check(
      'game_content_classes_check_39',
      sql`(combatant_evasion IS NULL OR combatant_evasion <= 1)`,
    ),
    check(
      'game_content_classes_check_40',
      sql`(combatant_critical_chance IS NULL OR combatant_critical_chance >= 0)`,
    ),
    check(
      'game_content_classes_check_41',
      sql`(combatant_critical_chance IS NULL OR combatant_critical_chance <= 1)`,
    ),
    check(
      'game_content_classes_check_42',
      sql`(combatant_critical_multiplier IS NULL OR combatant_critical_multiplier >= 1)`,
    ),
    check(
      'game_content_classes_check_43',
      sql`(combatant_critical_multiplier IS NULL OR combatant_critical_multiplier <= 10)`,
    ),
    check(
      'game_content_classes_check_44',
      sql`(max_stamina IS NULL OR max_stamina >= 0)`,
    ),
    check(
      'game_content_classes_check_45',
      sql`(max_stamina IS NULL OR max_stamina <= 100000)`,
    ),
    check(
      'game_content_classes_check_46',
      sql`(sprite_frame IS NULL OR sprite_frame >= 0)`,
    ),
    check(
      'game_content_classes_check_47',
      sql`(sprite_frame IS NULL OR sprite_frame <= 9007199254740991)`,
    ),
    check(
      'game_content_classes_check_48',
      sql`(sprite_idle_frames_present IS NULL OR sprite_idle_frames_present IN (0,1))`,
    ),
  ],
);

export const gameContentClassesSkills = sqliteTable(
  'game_content_classes_skills',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    skills_position: integer('skills_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.skills_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentClasses.content_version,
        gameContentClasses.definition_id,
        gameContentClasses.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
  ],
);

export const gameContentClassesSpriteIdleFrames = sqliteTable(
  'game_content_classes_sprite_idle_frames',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    sprite_idle_frames_position: integer(
      'sprite_idle_frames_position',
    ).notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.sprite_idle_frames_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentClasses.content_version,
        gameContentClasses.definition_id,
        gameContentClasses.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_classes_sprite_idle_frames_check_0',
      sql`(value IS NULL OR value >= 0)`,
    ),
    check(
      'game_content_classes_sprite_idle_frames_check_1',
      sql`(value IS NULL OR value <= 9007199254740991)`,
    ),
  ],
);

export const gameContentItems = sqliteTable(
  'game_content_items',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    enchant_id: text('enchant_id'),
    title_id: text('title_id'),
    price: integer('price').notNull(),
    power: integer('power').notNull(),
    description: text('description').notNull(),
    weapon_tags_present: integer('weapon_tags_present').notNull(),
    skill_id: text('skill_id'),
    recipe_id: text('recipe_id'),
    stat: text('stat'),
    max_durability: integer('max_durability'),
    restores: text('restores'),
    battle_usable: integer('battle_usable'),
    weapon_stats_present: integer('weapon_stats_present').notNull(),
    weapon_stats_min_damage: integer('weapon_stats_min_damage'),
    weapon_stats_max_damage: integer('weapon_stats_max_damage'),
    weapon_stats_balance: real('weapon_stats_balance'),
    weapon_stats_critical: real('weapon_stats_critical'),
    weapon_stats_min_injury: real('weapon_stats_min_injury'),
    weapon_stats_max_injury: real('weapon_stats_max_injury'),
    protection: integer('protection'),
    magic_defense: integer('magic_defense'),
    magic_protection: integer('magic_protection'),
    stat_bonuses_present: integer('stat_bonuses_present').notNull(),
    stat_bonuses_strength: real('stat_bonuses_strength'),
    stat_bonuses_intelligence: real('stat_bonuses_intelligence'),
    stat_bonuses_dexterity: real('stat_bonuses_dexterity'),
    stat_bonuses_will: real('stat_bonuses_will'),
    stat_bonuses_luck: real('stat_bonuses_luck'),
    stamina_recovery: integer('stamina_recovery'),
    fullness_recovery: real('fullness_recovery'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_items_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.enchant_id],
      foreignColumns: [
        gameContentEnchants.content_version,
        gameContentEnchants.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.title_id],
      foreignColumns: [
        gameContentTitles.content_version,
        gameContentTitles.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.skill_id],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.recipe_id],
      foreignColumns: [
        gameContentSkillBookRecipes.content_version,
        gameContentSkillBookRecipes.definition_id,
      ],
    }),
    check(
      'game_content_items_check_0',
      sql`(kind IS NULL OR kind IN ('consumable','weapon','armor','skillBook','incompleteBook','skillPage','enchantScroll','material','ammunition','titleCoupon'))`,
    ),
    check('game_content_items_check_1', sql`(price IS NULL OR price >= 0)`),
    check(
      'game_content_items_check_2',
      sql`(price IS NULL OR price <= 100000)`,
    ),
    check('game_content_items_check_3', sql`(power IS NULL OR power >= 0)`),
    check('game_content_items_check_4', sql`(power IS NULL OR power <= 10000)`),
    check(
      'game_content_items_check_5',
      sql`(weapon_tags_present IS NULL OR weapon_tags_present IN (0,1))`,
    ),
    check(
      'game_content_items_check_6',
      sql`(stat IS NULL OR stat IN ('attack','defense','speed'))`,
    ),
    check(
      'game_content_items_check_7',
      sql`(max_durability IS NULL OR max_durability >= 1)`,
    ),
    check(
      'game_content_items_check_8',
      sql`(max_durability IS NULL OR max_durability <= 10000)`,
    ),
    check(
      'game_content_items_check_9',
      sql`(restores IS NULL OR restores IN ('health','mana','stamina'))`,
    ),
    check(
      'game_content_items_check_10',
      sql`(battle_usable IS NULL OR battle_usable IN (0,1))`,
    ),
    check(
      'game_content_items_check_11',
      sql`(weapon_stats_present IS NULL OR weapon_stats_present IN (0,1))`,
    ),
    check(
      'game_content_items_check_12',
      sql`(weapon_stats_min_damage IS NULL OR weapon_stats_min_damage >= 0)`,
    ),
    check(
      'game_content_items_check_13',
      sql`(weapon_stats_min_damage IS NULL OR weapon_stats_min_damage <= 10000)`,
    ),
    check(
      'game_content_items_check_14',
      sql`(weapon_stats_max_damage IS NULL OR weapon_stats_max_damage >= 0)`,
    ),
    check(
      'game_content_items_check_15',
      sql`(weapon_stats_max_damage IS NULL OR weapon_stats_max_damage <= 10000)`,
    ),
    check(
      'game_content_items_check_16',
      sql`(weapon_stats_balance IS NULL OR weapon_stats_balance >= 0)`,
    ),
    check(
      'game_content_items_check_17',
      sql`(weapon_stats_balance IS NULL OR weapon_stats_balance <= 1)`,
    ),
    check(
      'game_content_items_check_18',
      sql`(weapon_stats_critical IS NULL OR weapon_stats_critical >= 0)`,
    ),
    check(
      'game_content_items_check_19',
      sql`(weapon_stats_critical IS NULL OR weapon_stats_critical <= 1)`,
    ),
    check(
      'game_content_items_check_20',
      sql`(weapon_stats_min_injury IS NULL OR weapon_stats_min_injury >= 0)`,
    ),
    check(
      'game_content_items_check_21',
      sql`(weapon_stats_min_injury IS NULL OR weapon_stats_min_injury <= 1)`,
    ),
    check(
      'game_content_items_check_22',
      sql`(weapon_stats_max_injury IS NULL OR weapon_stats_max_injury >= 0)`,
    ),
    check(
      'game_content_items_check_23',
      sql`(weapon_stats_max_injury IS NULL OR weapon_stats_max_injury <= 1)`,
    ),
    check(
      'game_content_items_check_24',
      sql`(protection IS NULL OR protection >= 0)`,
    ),
    check(
      'game_content_items_check_25',
      sql`(protection IS NULL OR protection <= 10000)`,
    ),
    check(
      'game_content_items_check_26',
      sql`(magic_defense IS NULL OR magic_defense >= 0)`,
    ),
    check(
      'game_content_items_check_27',
      sql`(magic_defense IS NULL OR magic_defense <= 10000)`,
    ),
    check(
      'game_content_items_check_28',
      sql`(magic_protection IS NULL OR magic_protection >= 0)`,
    ),
    check(
      'game_content_items_check_29',
      sql`(magic_protection IS NULL OR magic_protection <= 10000)`,
    ),
    check(
      'game_content_items_check_30',
      sql`(stat_bonuses_present IS NULL OR stat_bonuses_present IN (0,1))`,
    ),
    check(
      'game_content_items_check_31',
      sql`(stat_bonuses_strength IS NULL OR stat_bonuses_strength >= -1500)`,
    ),
    check(
      'game_content_items_check_32',
      sql`(stat_bonuses_strength IS NULL OR stat_bonuses_strength <= 1500)`,
    ),
    check(
      'game_content_items_check_33',
      sql`(stat_bonuses_intelligence IS NULL OR stat_bonuses_intelligence >= -1500)`,
    ),
    check(
      'game_content_items_check_34',
      sql`(stat_bonuses_intelligence IS NULL OR stat_bonuses_intelligence <= 1500)`,
    ),
    check(
      'game_content_items_check_35',
      sql`(stat_bonuses_dexterity IS NULL OR stat_bonuses_dexterity >= -1500)`,
    ),
    check(
      'game_content_items_check_36',
      sql`(stat_bonuses_dexterity IS NULL OR stat_bonuses_dexterity <= 1500)`,
    ),
    check(
      'game_content_items_check_37',
      sql`(stat_bonuses_will IS NULL OR stat_bonuses_will >= -1500)`,
    ),
    check(
      'game_content_items_check_38',
      sql`(stat_bonuses_will IS NULL OR stat_bonuses_will <= 1500)`,
    ),
    check(
      'game_content_items_check_39',
      sql`(stat_bonuses_luck IS NULL OR stat_bonuses_luck >= -1500)`,
    ),
    check(
      'game_content_items_check_40',
      sql`(stat_bonuses_luck IS NULL OR stat_bonuses_luck <= 1500)`,
    ),
    check(
      'game_content_items_check_41',
      sql`(stamina_recovery IS NULL OR stamina_recovery >= 0)`,
    ),
    check(
      'game_content_items_check_42',
      sql`(stamina_recovery IS NULL OR stamina_recovery <= 10000)`,
    ),
    check(
      'game_content_items_check_43',
      sql`(fullness_recovery IS NULL OR fullness_recovery >= 0)`,
    ),
    check(
      'game_content_items_check_44',
      sql`(fullness_recovery IS NULL OR fullness_recovery <= 50)`,
    ),
  ],
);

export const gameContentItemsWeaponTags = sqliteTable(
  'game_content_items_weapon_tags',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    weapon_tags_position: integer('weapon_tags_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.weapon_tags_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
        gameContentItems.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_items_weapon_tags_check_0',
      sql`(value IS NULL OR value IN ('melee','sword','bow'))`,
    ),
  ],
);

export const gameContentStatusEffects = sqliteTable(
  'game_content_status_effects',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    duration: integer('duration').notNull(),
    tick_timing: text('tick_timing').notNull(),
    stacking: text('stacking').notNull(),
    effect: text('effect').notNull(),
    health_fraction: real('health_fraction'),
    power: integer('power').notNull(),
    stat: text('stat'),
    modifier: integer('modifier'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_status_effects_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    check(
      'game_content_status_effects_check_0',
      sql`(duration IS NULL OR duration >= 1)`,
    ),
    check(
      'game_content_status_effects_check_1',
      sql`(duration IS NULL OR duration <= 100)`,
    ),
    check(
      'game_content_status_effects_check_2',
      sql`(tick_timing IS NULL OR tick_timing IN ('turnStart','turnEnd'))`,
    ),
    check(
      'game_content_status_effects_check_3',
      sql`(stacking IS NULL OR stacking IN ('refresh','stack','ignore'))`,
    ),
    check(
      'game_content_status_effects_check_4',
      sql`(effect IS NULL OR effect IN ('damage','heal','stat','poison'))`,
    ),
    check(
      'game_content_status_effects_check_5',
      sql`(health_fraction IS NULL OR health_fraction >= 0)`,
    ),
    check(
      'game_content_status_effects_check_6',
      sql`(health_fraction IS NULL OR health_fraction <= 1)`,
    ),
    check(
      'game_content_status_effects_check_7',
      sql`(power IS NULL OR power >= 0)`,
    ),
    check(
      'game_content_status_effects_check_8',
      sql`(power IS NULL OR power <= 10000)`,
    ),
    check(
      'game_content_status_effects_check_9',
      sql`(stat IS NULL OR stat IN ('attack','defense','speed'))`,
    ),
    check(
      'game_content_status_effects_check_10',
      sql`(modifier IS NULL OR modifier >= -1000)`,
    ),
    check(
      'game_content_status_effects_check_11',
      sql`(modifier IS NULL OR modifier <= 1000)`,
    ),
  ],
);

export const gameContentAtlases = sqliteTable(
  'game_content_atlases',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    columns: integer('columns').notNull(),
    rows: integer('rows').notNull(),
    frame_width: integer('frame_width').notNull(),
    frame_height: integer('frame_height').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_atlases_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    check(
      'game_content_atlases_check_0',
      sql`(columns IS NULL OR columns >= 1)`,
    ),
    check(
      'game_content_atlases_check_1',
      sql`(columns IS NULL OR columns <= 9007199254740991)`,
    ),
    check('game_content_atlases_check_2', sql`(rows IS NULL OR rows >= 1)`),
    check(
      'game_content_atlases_check_3',
      sql`(rows IS NULL OR rows <= 9007199254740991)`,
    ),
    check(
      'game_content_atlases_check_4',
      sql`(frame_width IS NULL OR frame_width >= 1)`,
    ),
    check(
      'game_content_atlases_check_5',
      sql`(frame_width IS NULL OR frame_width <= 9007199254740991)`,
    ),
    check(
      'game_content_atlases_check_6',
      sql`(frame_height IS NULL OR frame_height >= 1)`,
    ),
    check(
      'game_content_atlases_check_7',
      sql`(frame_height IS NULL OR frame_height <= 9007199254740991)`,
    ),
  ],
);

export const gameContentMaps = sqliteTable(
  'game_content_maps',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    tile_size: integer('tile_size').notNull(),
    tiles: text('tiles').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_maps_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    check('game_content_maps_check_0', sql`(width IS NULL OR width >= 1)`),
    check('game_content_maps_check_1', sql`(width IS NULL OR width <= 128)`),
    check('game_content_maps_check_2', sql`(height IS NULL OR height >= 1)`),
    check('game_content_maps_check_3', sql`(height IS NULL OR height <= 128)`),
    check(
      'game_content_maps_check_4',
      sql`(tile_size IS NULL OR tile_size >= 1)`,
    ),
    check(
      'game_content_maps_check_5',
      sql`(tile_size IS NULL OR tile_size <= 128)`,
    ),
    check(
      'game_content_maps_check_6',
      sql`(tiles IS NULL OR json_valid(tiles))`,
    ),
  ],
);

export const gameContentMapsSpawns = sqliteTable(
  'game_content_maps_spawns',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    spawns_position: integer('spawns_position').notNull(),
    value_entity_id: text('value_entity_id').notNull(),
    value_kind: text('value_kind').notNull(),
    value_definition_id: text('value_definition_id').notNull(),
    value_x: integer('value_x').notNull(),
    value_y: integer('value_y').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.spawns_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentMaps.content_version,
        gameContentMaps.definition_id,
        gameContentMaps.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_maps_spawns_check_0',
      sql`(value_kind IS NULL OR value_kind IN ('player','enemy'))`,
    ),
    check(
      'game_content_maps_spawns_check_1',
      sql`(value_x IS NULL OR value_x >= 0)`,
    ),
    check(
      'game_content_maps_spawns_check_2',
      sql`(value_x IS NULL OR value_x <= 9007199254740991)`,
    ),
    check(
      'game_content_maps_spawns_check_3',
      sql`(value_y IS NULL OR value_y >= 0)`,
    ),
    check(
      'game_content_maps_spawns_check_4',
      sql`(value_y IS NULL OR value_y <= 9007199254740991)`,
    ),
  ],
);

export const gameContentWorlds = sqliteTable(
  'game_content_worlds',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    tile_size: integer('tile_size').notNull(),
    tiles: text('tiles').notNull(),
    entry_x: integer('entry_x').notNull(),
    entry_y: integer('entry_y').notNull(),
    theme: text('theme'),
    decorations_present: integer('decorations_present').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_worlds_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    check('game_content_worlds_check_0', sql`(width IS NULL OR width >= 3)`),
    check('game_content_worlds_check_1', sql`(width IS NULL OR width <= 128)`),
    check('game_content_worlds_check_2', sql`(height IS NULL OR height >= 3)`),
    check(
      'game_content_worlds_check_3',
      sql`(height IS NULL OR height <= 128)`,
    ),
    check(
      'game_content_worlds_check_4',
      sql`(tile_size IS NULL OR tile_size >= 16)`,
    ),
    check(
      'game_content_worlds_check_5',
      sql`(tile_size IS NULL OR tile_size <= 128)`,
    ),
    check(
      'game_content_worlds_check_6',
      sql`(tiles IS NULL OR json_valid(tiles))`,
    ),
    check(
      'game_content_worlds_check_7',
      sql`(entry_x IS NULL OR entry_x >= 0)`,
    ),
    check(
      'game_content_worlds_check_8',
      sql`(entry_x IS NULL OR entry_x <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_check_9',
      sql`(entry_y IS NULL OR entry_y >= 0)`,
    ),
    check(
      'game_content_worlds_check_10',
      sql`(entry_y IS NULL OR entry_y <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_check_11',
      sql`(theme IS NULL OR theme IN ('town','interior'))`,
    ),
    check(
      'game_content_worlds_check_12',
      sql`(decorations_present IS NULL OR decorations_present IN (0,1))`,
    ),
  ],
);

export const gameContentWorldsDecorations = sqliteTable(
  'game_content_worlds_decorations',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    decorations_position: integer('decorations_position').notNull(),
    value_id: text('value_id').notNull(),
    value_x: integer('value_x').notNull(),
    value_y: integer('value_y').notNull(),
    value_sprite_atlas: text('value_sprite_atlas').notNull(),
    value_sprite_frame: integer('value_sprite_frame').notNull(),
    value_size: integer('value_size'),
    value_blocking: integer('value_blocking'),
    value_object_id: text('value_object_id'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.decorations_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentWorlds.content_version,
        gameContentWorlds.definition_id,
        gameContentWorlds.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_sprite_atlas],
      foreignColumns: [
        gameContentAtlases.content_version,
        gameContentAtlases.definition_id,
      ],
    }),
    check(
      'game_content_worlds_decorations_check_0',
      sql`(value_x IS NULL OR value_x >= 0)`,
    ),
    check(
      'game_content_worlds_decorations_check_1',
      sql`(value_x IS NULL OR value_x <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_decorations_check_2',
      sql`(value_y IS NULL OR value_y >= 0)`,
    ),
    check(
      'game_content_worlds_decorations_check_3',
      sql`(value_y IS NULL OR value_y <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_decorations_check_4',
      sql`(value_sprite_frame IS NULL OR value_sprite_frame >= 0)`,
    ),
    check(
      'game_content_worlds_decorations_check_5',
      sql`(value_sprite_frame IS NULL OR value_sprite_frame <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_decorations_check_6',
      sql`(value_size IS NULL OR value_size >= 1)`,
    ),
    check(
      'game_content_worlds_decorations_check_7',
      sql`(value_size IS NULL OR value_size <= 5)`,
    ),
    check(
      'game_content_worlds_decorations_check_8',
      sql`(value_blocking IS NULL OR value_blocking IN (0,1))`,
    ),
  ],
);

export const gameContentWorldsObjects = sqliteTable(
  'game_content_worlds_objects',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    objects_position: integer('objects_position').notNull(),
    value_id: text('value_id').notNull(),
    value_x: integer('value_x').notNull(),
    value_y: integer('value_y').notNull(),
    value_name: text('value_name').notNull(),
    value_sprite_present: integer('value_sprite_present').notNull(),
    value_sprite_atlas: text('value_sprite_atlas'),
    value_sprite_frame: integer('value_sprite_frame'),
    value_kind: text('value_kind').notNull(),
    value_enchanting: integer('value_enchanting'),
    value_lessons_present: integer('value_lessons_present').notNull(),
    value_dialogue: text('value_dialogue'),
    value_item_id: text('value_item_id'),
    value_quantity: integer('value_quantity'),
    value_destination: text('value_destination'),
    value_encounter_map: text('value_encounter_map'),
    value_requires_cleared_present: integer(
      'value_requires_cleared_present',
    ).notNull(),
    value_destination_position_present: integer(
      'value_destination_position_present',
    ).notNull(),
    value_destination_position_x: integer('value_destination_position_x'),
    value_destination_position_y: integer('value_destination_position_y'),
    value_shop_id: text('value_shop_id'),
    value_healing_cost: integer('value_healing_cost'),
    value_dungeon_id: text('value_dungeon_id'),
    value_gate_type: text('value_gate_type'),
    value_key_type: text('value_key_type'),
    value_blocked: integer('value_blocked'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.objects_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentWorlds.content_version,
        gameContentWorlds.definition_id,
        gameContentWorlds.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_sprite_atlas],
      foreignColumns: [
        gameContentAtlases.content_version,
        gameContentAtlases.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.value_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.value_encounter_map],
      foreignColumns: [
        gameContentMaps.content_version,
        gameContentMaps.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.value_shop_id],
      foreignColumns: [
        gameContentShops.content_version,
        gameContentShops.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.value_dungeon_id],
      foreignColumns: [
        gameContentDungeons.content_version,
        gameContentDungeons.definition_id,
      ],
    }),
    check(
      'game_content_worlds_objects_check_0',
      sql`(value_x IS NULL OR value_x >= 0)`,
    ),
    check(
      'game_content_worlds_objects_check_1',
      sql`(value_x IS NULL OR value_x <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_objects_check_2',
      sql`(value_y IS NULL OR value_y >= 0)`,
    ),
    check(
      'game_content_worlds_objects_check_3',
      sql`(value_y IS NULL OR value_y <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_objects_check_4',
      sql`(value_sprite_present IS NULL OR value_sprite_present IN (0,1))`,
    ),
    check(
      'game_content_worlds_objects_check_5',
      sql`(value_sprite_frame IS NULL OR value_sprite_frame >= 0)`,
    ),
    check(
      'game_content_worlds_objects_check_6',
      sql`(value_sprite_frame IS NULL OR value_sprite_frame <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_objects_check_7',
      sql`(value_kind IS NULL OR value_kind IN ('npc','chest','rest','portal','encounter','dungeonEntrance','statue','mimic','fountain','gate','key','finalChest','merchant','healer','altar'))`,
    ),
    check(
      'game_content_worlds_objects_check_8',
      sql`(value_enchanting IS NULL OR value_enchanting IN (0,1))`,
    ),
    check(
      'game_content_worlds_objects_check_9',
      sql`(value_lessons_present IS NULL OR value_lessons_present IN (0,1))`,
    ),
    check(
      'game_content_worlds_objects_check_10',
      sql`(value_quantity IS NULL OR value_quantity >= 1)`,
    ),
    check(
      'game_content_worlds_objects_check_11',
      sql`(value_quantity IS NULL OR value_quantity <= 99)`,
    ),
    check(
      'game_content_worlds_objects_check_12',
      sql`(value_requires_cleared_present IS NULL OR value_requires_cleared_present IN (0,1))`,
    ),
    check(
      'game_content_worlds_objects_check_13',
      sql`(value_destination_position_present IS NULL OR value_destination_position_present IN (0,1))`,
    ),
    check(
      'game_content_worlds_objects_check_14',
      sql`(value_destination_position_x IS NULL OR value_destination_position_x >= 0)`,
    ),
    check(
      'game_content_worlds_objects_check_15',
      sql`(value_destination_position_x IS NULL OR value_destination_position_x <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_objects_check_16',
      sql`(value_destination_position_y IS NULL OR value_destination_position_y >= 0)`,
    ),
    check(
      'game_content_worlds_objects_check_17',
      sql`(value_destination_position_y IS NULL OR value_destination_position_y <= 9007199254740991)`,
    ),
    check(
      'game_content_worlds_objects_check_18',
      sql`(value_healing_cost IS NULL OR value_healing_cost >= 1)`,
    ),
    check(
      'game_content_worlds_objects_check_19',
      sql`(value_healing_cost IS NULL OR value_healing_cost <= 100000)`,
    ),
    check(
      'game_content_worlds_objects_check_20',
      sql`(value_gate_type IS NULL OR value_gate_type IN ('boss','treasure'))`,
    ),
    check(
      'game_content_worlds_objects_check_21',
      sql`(value_key_type IS NULL OR value_key_type IN ('boss','treasure'))`,
    ),
    check(
      'game_content_worlds_objects_check_22',
      sql`(value_blocked IS NULL OR value_blocked IN (0,1))`,
    ),
  ],
);

export const gameContentWorldsObjectsValueLessons = sqliteTable(
  'game_content_worlds_objects_value_lessons',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    objects_position: integer('objects_position').notNull(),
    value_lessons_position: integer('value_lessons_position').notNull(),
    value_skill_id: text('value_skill_id').notNull(),
    value_fee: integer('value_fee').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.objects_position,
        t.value_lessons_position,
      ],
    }),
    foreignKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.objects_position,
      ],
      foreignColumns: [
        gameContentWorldsObjects.content_version,
        gameContentWorldsObjects.definition_id,
        gameContentWorldsObjects.position,
        gameContentWorldsObjects.objects_position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_skill_id],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    check(
      'game_content_worlds_objects_value_lessons_check_0',
      sql`(value_fee IS NULL OR value_fee >= 0)`,
    ),
    check(
      'game_content_worlds_objects_value_lessons_check_1',
      sql`(value_fee IS NULL OR value_fee <= 100000)`,
    ),
  ],
);

export const gameContentWorldsObjectsValueRequiresCleared = sqliteTable(
  'game_content_worlds_objects_value_requires_cleared',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    objects_position: integer('objects_position').notNull(),
    value_requires_cleared_position: integer(
      'value_requires_cleared_position',
    ).notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.objects_position,
        t.value_requires_cleared_position,
      ],
    }),
    foreignKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.objects_position,
      ],
      foreignColumns: [
        gameContentWorldsObjects.content_version,
        gameContentWorldsObjects.definition_id,
        gameContentWorldsObjects.position,
        gameContentWorldsObjects.objects_position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentDungeons = sqliteTable(
  'game_content_dungeons',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    min_rooms: integer('min_rooms').notNull(),
    max_rooms: integer('max_rooms').notNull(),
    room_weights_monster: real('room_weights_monster').notNull(),
    room_weights_chest: real('room_weights_chest').notNull(),
    room_weights_mimic: real('room_weights_mimic').notNull(),
    room_weights_fountain: real('room_weights_fountain').notNull(),
    mimic_id: text('mimic_id').notNull(),
    boss_id: text('boss_id').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_dungeons_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    check(
      'game_content_dungeons_check_0',
      sql`(min_rooms IS NULL OR min_rooms >= 4)`,
    ),
    check(
      'game_content_dungeons_check_1',
      sql`(min_rooms IS NULL OR min_rooms <= 12)`,
    ),
    check(
      'game_content_dungeons_check_2',
      sql`(max_rooms IS NULL OR max_rooms >= 4)`,
    ),
    check(
      'game_content_dungeons_check_3',
      sql`(max_rooms IS NULL OR max_rooms <= 12)`,
    ),
  ],
);

export const gameContentDungeonsMonsterIds = sqliteTable(
  'game_content_dungeons_monster_ids',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    monster_ids_position: integer('monster_ids_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.monster_ids_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentDungeons.content_version,
        gameContentDungeons.definition_id,
        gameContentDungeons.position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentDungeonsCompanionIds = sqliteTable(
  'game_content_dungeons_companion_ids',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    companion_ids_position: integer('companion_ids_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.companion_ids_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentDungeons.content_version,
        gameContentDungeons.definition_id,
        gameContentDungeons.position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentDungeonsFountainIds = sqliteTable(
  'game_content_dungeons_fountain_ids',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    fountain_ids_position: integer('fountain_ids_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.fountain_ids_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentDungeons.content_version,
        gameContentDungeons.definition_id,
        gameContentDungeons.position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentDungeonsOrdinaryRewards = sqliteTable(
  'game_content_dungeons_ordinary_rewards',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    ordinary_rewards_position: integer('ordinary_rewards_position').notNull(),
    value_item_id: text('value_item_id').notNull(),
    value_min: integer('value_min').notNull(),
    value_max: integer('value_max').notNull(),
    value_weight: integer('value_weight').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.ordinary_rewards_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentDungeons.content_version,
        gameContentDungeons.definition_id,
        gameContentDungeons.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    check(
      'game_content_dungeons_ordinary_rewards_check_0',
      sql`(value_min IS NULL OR value_min >= 1)`,
    ),
    check(
      'game_content_dungeons_ordinary_rewards_check_1',
      sql`(value_min IS NULL OR value_min <= 99)`,
    ),
    check(
      'game_content_dungeons_ordinary_rewards_check_2',
      sql`(value_max IS NULL OR value_max >= 1)`,
    ),
    check(
      'game_content_dungeons_ordinary_rewards_check_3',
      sql`(value_max IS NULL OR value_max <= 99)`,
    ),
    check(
      'game_content_dungeons_ordinary_rewards_check_4',
      sql`(value_weight IS NULL OR value_weight >= 1)`,
    ),
    check(
      'game_content_dungeons_ordinary_rewards_check_5',
      sql`(value_weight IS NULL OR value_weight <= 1000)`,
    ),
  ],
);

export const gameContentDungeonsFinalRewards = sqliteTable(
  'game_content_dungeons_final_rewards',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    final_rewards_position: integer('final_rewards_position').notNull(),
    value_item_id: text('value_item_id').notNull(),
    value_min: integer('value_min').notNull(),
    value_max: integer('value_max').notNull(),
    value_weight: integer('value_weight').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.final_rewards_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentDungeons.content_version,
        gameContentDungeons.definition_id,
        gameContentDungeons.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    check(
      'game_content_dungeons_final_rewards_check_0',
      sql`(value_min IS NULL OR value_min >= 1)`,
    ),
    check(
      'game_content_dungeons_final_rewards_check_1',
      sql`(value_min IS NULL OR value_min <= 99)`,
    ),
    check(
      'game_content_dungeons_final_rewards_check_2',
      sql`(value_max IS NULL OR value_max >= 1)`,
    ),
    check(
      'game_content_dungeons_final_rewards_check_3',
      sql`(value_max IS NULL OR value_max <= 99)`,
    ),
    check(
      'game_content_dungeons_final_rewards_check_4',
      sql`(value_weight IS NULL OR value_weight >= 1)`,
    ),
    check(
      'game_content_dungeons_final_rewards_check_5',
      sql`(value_weight IS NULL OR value_weight <= 1000)`,
    ),
  ],
);

export const gameContentShops = sqliteTable(
  'game_content_shops',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    bundles_present: integer('bundles_present').notNull(),
    buys_items: integer('buys_items'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_shops_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    check(
      'game_content_shops_check_0',
      sql`(kind IS NULL OR kind IN ('grocery','blacksmith','general'))`,
    ),
    check(
      'game_content_shops_check_1',
      sql`(bundles_present IS NULL OR bundles_present IN (0,1))`,
    ),
    check(
      'game_content_shops_check_2',
      sql`(buys_items IS NULL OR buys_items IN (0,1))`,
    ),
  ],
);

export const gameContentShopsItems = sqliteTable(
  'game_content_shops_items',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    items_position: integer('items_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.items_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentShops.content_version,
        gameContentShops.definition_id,
        gameContentShops.position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentShopsBundles = sqliteTable(
  'game_content_shops_bundles',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    bundles_position: integer('bundles_position').notNull(),
    value_item_id: text('value_item_id').notNull(),
    value_quantity: integer('value_quantity').notNull(),
    value_price: integer('value_price').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.bundles_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentShops.content_version,
        gameContentShops.definition_id,
        gameContentShops.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    check(
      'game_content_shops_bundles_check_0',
      sql`(value_quantity IS NULL OR value_quantity >= 2)`,
    ),
    check(
      'game_content_shops_bundles_check_1',
      sql`(value_quantity IS NULL OR value_quantity <= 999)`,
    ),
    check(
      'game_content_shops_bundles_check_2',
      sql`(value_price IS NULL OR value_price >= 0)`,
    ),
    check(
      'game_content_shops_bundles_check_3',
      sql`(value_price IS NULL OR value_price <= 100000)`,
    ),
  ],
);

export const gameContentSkillBookRecipes = sqliteTable(
  'game_content_skill_book_recipes',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    skill_id: text('skill_id').notNull(),
    incomplete_item_id: text('incomplete_item_id').notNull(),
    complete_item_id: text('complete_item_id').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_skill_book_recipes_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.skill_id],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.incomplete_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.complete_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
  ],
);

export const gameContentSkillBookRecipesPages = sqliteTable(
  'game_content_skill_book_recipes_pages',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    pages_position: integer('pages_position').notNull(),
    value_item_id: text('value_item_id').notNull(),
    value_hint: text('value_hint').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.pages_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentSkillBookRecipes.content_version,
        gameContentSkillBookRecipes.definition_id,
        gameContentSkillBookRecipes.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
  ],
);

export const gameContentEnchants = sqliteTable(
  'game_content_enchants',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    slot: text('slot').notNull(),
    rank: text('rank').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_enchants_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    check(
      'game_content_enchants_check_0',
      sql`(slot IS NULL OR slot IN ('prefix','suffix'))`,
    ),
    check(
      'game_content_enchants_check_1',
      sql`(rank IS NULL OR rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))`,
    ),
  ],
);

export const gameContentEnchantsKinds = sqliteTable(
  'game_content_enchants_kinds',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    kinds_position: integer('kinds_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.kinds_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnchants.content_version,
        gameContentEnchants.definition_id,
        gameContentEnchants.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_enchants_kinds_check_0',
      sql`(value IS NULL OR value IN ('weapon','armor'))`,
    ),
  ],
);

export const gameContentEnchantsTags = sqliteTable(
  'game_content_enchants_tags',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    tags_position: integer('tags_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.tags_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnchants.content_version,
        gameContentEnchants.definition_id,
        gameContentEnchants.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_enchants_tags_check_0',
      sql`(value IS NULL OR value IN ('melee','sword'))`,
    ),
  ],
);

export const gameContentEnchantsClauses = sqliteTable(
  'game_content_enchants_clauses',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    clauses_position: integer('clauses_position').notNull(),
    value_id: text('value_id').notNull(),
    value_stat: text('value_stat').notNull(),
    value_unit: text('value_unit').notNull(),
    value_min: integer('value_min').notNull(),
    value_max: integer('value_max').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.clauses_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnchants.content_version,
        gameContentEnchants.definition_id,
        gameContentEnchants.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_enchants_clauses_check_0',
      sql`(value_stat IS NULL OR value_stat IN ('strength','intelligence','dexterity','will','luck','maxHealth','maxMana','maxStamina','physicalAttack','magicAttack','defense','protection','magicDefense','magicProtection'))`,
    ),
    check(
      'game_content_enchants_clauses_check_1',
      sql`(value_unit IS NULL OR value_unit IN ('flat'))`,
    ),
    check(
      'game_content_enchants_clauses_check_2',
      sql`(value_min IS NULL OR value_min >= -1000)`,
    ),
    check(
      'game_content_enchants_clauses_check_3',
      sql`(value_min IS NULL OR value_min <= 1000)`,
    ),
    check(
      'game_content_enchants_clauses_check_4',
      sql`(value_max IS NULL OR value_max >= -1000)`,
    ),
    check(
      'game_content_enchants_clauses_check_5',
      sql`(value_max IS NULL OR value_max <= 1000)`,
    ),
  ],
);

export const gameContentEnchantsClausesValueConditions = sqliteTable(
  'game_content_enchants_clauses_value_conditions',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    clauses_position: integer('clauses_position').notNull(),
    value_conditions_position: integer('value_conditions_position').notNull(),
    value_kind: text('value_kind'),
    value_skill_id: text('value_skill_id'),
    value_rank: text('value_rank'),
    value_minimum: integer('value_minimum'),
    value_talent: text('value_talent'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.clauses_position,
        t.value_conditions_position,
      ],
    }),
    foreignKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.clauses_position,
      ],
      foreignColumns: [
        gameContentEnchantsClauses.content_version,
        gameContentEnchantsClauses.definition_id,
        gameContentEnchantsClauses.position,
        gameContentEnchantsClauses.clauses_position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_skill_id],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    check(
      'game_content_enchants_clauses_value_conditions_check_0',
      sql`(value_rank IS NULL OR value_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))`,
    ),
    check(
      'game_content_enchants_clauses_value_conditions_check_1',
      sql`(value_minimum IS NULL OR value_minimum >= 1)`,
    ),
    check(
      'game_content_enchants_clauses_value_conditions_check_2',
      sql`(value_minimum IS NULL OR value_minimum <= 200)`,
    ),
    check(
      'game_content_enchants_clauses_value_conditions_check_3',
      sql`(value_talent IS NULL OR value_talent IN ('warrior','mage','archery'))`,
    ),
  ],
);

export const gameContentEnchantingRules = sqliteTable(
  'game_content_enchanting_rules',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    value_int_cap: integer('value_int_cap').notNull(),
    value_int_bonus_bp_per_point: integer(
      'value_int_bonus_bp_per_point',
    ).notNull(),
    value_mana_herb_id: text('value_mana_herb_id').notNull(),
    value_holy_water_id: text('value_holy_water_id').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_enchanting_rules_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    check(
      'game_content_enchanting_rules_check_0',
      sql`(value_int_cap IS NULL OR value_int_cap >= 0)`,
    ),
    check(
      'game_content_enchanting_rules_check_1',
      sql`(value_int_cap IS NULL OR value_int_cap <= 1500)`,
    ),
    check(
      'game_content_enchanting_rules_check_2',
      sql`(value_int_bonus_bp_per_point IS NULL OR value_int_bonus_bp_per_point >= 0)`,
    ),
    check(
      'game_content_enchanting_rules_check_3',
      sql`(value_int_bonus_bp_per_point IS NULL OR value_int_bonus_bp_per_point <= 10000)`,
    ),
  ],
);

export const gameContentEnchantingRulesValueBaseChanceBp = sqliteTable(
  'game_content_enchanting_rules_value_base_chance_bp',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    value_base_chance_bp_key: text('value_base_chance_bp_key').notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.value_base_chance_bp_key,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnchantingRules.content_version,
        gameContentEnchantingRules.definition_id,
        gameContentEnchantingRules.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_enchanting_rules_value_base_chance_bp_check_0',
      sql`(value IS NULL OR value >= 0)`,
    ),
    check(
      'game_content_enchanting_rules_value_base_chance_bp_check_1',
      sql`(value IS NULL OR value <= 10000)`,
    ),
  ],
);

export const gameContentEnchantingRulesValuePowderBonusBp = sqliteTable(
  'game_content_enchanting_rules_value_powder_bonus_bp',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    value_powder_bonus_bp_key: text('value_powder_bonus_bp_key').notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.value_powder_bonus_bp_key,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnchantingRules.content_version,
        gameContentEnchantingRules.definition_id,
        gameContentEnchantingRules.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_enchanting_rules_value_powder_bonus_bp_check_0',
      sql`(value IS NULL OR value >= 0)`,
    ),
    check(
      'game_content_enchanting_rules_value_powder_bonus_bp_check_1',
      sql`(value IS NULL OR value <= 10000)`,
    ),
  ],
);

export const gameContentEnchantingRulesValueRecipes = sqliteTable(
  'game_content_enchanting_rules_value_recipes',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    value_recipes_key: text('value_recipes_key').notNull(),
    value_scroll_count: real('value_scroll_count').notNull(),
    value_powder_count: real('value_powder_count').notNull(),
    value_mana_cost: integer('value_mana_cost').notNull(),
    value_burn_mana_cost: integer('value_burn_mana_cost').notNull(),
    value_burn_chance_bp: integer('value_burn_chance_bp').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.value_recipes_key,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentEnchantingRules.content_version,
        gameContentEnchantingRules.definition_id,
        gameContentEnchantingRules.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_enchanting_rules_value_recipes_check_0',
      sql`(value_scroll_count IS NULL OR value_scroll_count IN (1))`,
    ),
    check(
      'game_content_enchanting_rules_value_recipes_check_1',
      sql`(value_powder_count IS NULL OR value_powder_count IN (1))`,
    ),
    check(
      'game_content_enchanting_rules_value_recipes_check_2',
      sql`(value_mana_cost IS NULL OR value_mana_cost >= 1)`,
    ),
    check(
      'game_content_enchanting_rules_value_recipes_check_3',
      sql`(value_mana_cost IS NULL OR value_mana_cost <= 10000)`,
    ),
    check(
      'game_content_enchanting_rules_value_recipes_check_4',
      sql`(value_burn_mana_cost IS NULL OR value_burn_mana_cost >= 1)`,
    ),
    check(
      'game_content_enchanting_rules_value_recipes_check_5',
      sql`(value_burn_mana_cost IS NULL OR value_burn_mana_cost <= 10000)`,
    ),
    check(
      'game_content_enchanting_rules_value_recipes_check_6',
      sql`(value_burn_chance_bp IS NULL OR value_burn_chance_bp >= 0)`,
    ),
    check(
      'game_content_enchanting_rules_value_recipes_check_7',
      sql`(value_burn_chance_bp IS NULL OR value_burn_chance_bp <= 10000)`,
    ),
  ],
);

export const gameContentQuests = sqliteTable(
  'game_content_quests',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    chapter_present: integer('chapter_present').notNull(),
    chapter_id: text('chapter_id'),
    chapter_name: text('chapter_name'),
    generation_present: integer('generation_present').notNull(),
    generation_id: text('generation_id'),
    generation_name: text('generation_name'),
    delivery: text('delivery').notNull(),
    offer_npc_present: integer('offer_npc_present').notNull(),
    offer_npc_world_id: text('offer_npc_world_id'),
    offer_npc_object_id: text('offer_npc_object_id'),
    claim_npc_present: integer('claim_npc_present').notNull(),
    claim_npc_world_id: text('claim_npc_world_id'),
    claim_npc_object_id: text('claim_npc_object_id'),
    prerequisite: text('prerequisite'),
    rewards_experience: integer('rewards_experience'),
    rewards_gold: integer('rewards_gold'),
    rewards_ap: integer('rewards_ap'),
    rewards_items_present: integer('rewards_items_present').notNull(),
    rewards_skills_present: integer('rewards_skills_present').notNull(),
    rewards_titles_present: integer('rewards_titles_present').notNull(),
    rewards_flags_present: integer('rewards_flags_present').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_quests_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.offer_npc_world_id],
      foreignColumns: [
        gameContentWorlds.content_version,
        gameContentWorlds.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.claim_npc_world_id],
      foreignColumns: [
        gameContentWorlds.content_version,
        gameContentWorlds.definition_id,
      ],
    }),
    check(
      'game_content_quests_check_0',
      sql`(category IS NULL OR category IN ('mainstream','sidequest','skill'))`,
    ),
    check(
      'game_content_quests_check_1',
      sql`(chapter_present IS NULL OR chapter_present IN (0,1))`,
    ),
    check(
      'game_content_quests_check_2',
      sql`(generation_present IS NULL OR generation_present IN (0,1))`,
    ),
    check(
      'game_content_quests_check_3',
      sql`(delivery IS NULL OR delivery IN ('automatic','npc'))`,
    ),
    check(
      'game_content_quests_check_4',
      sql`(offer_npc_present IS NULL OR offer_npc_present IN (0,1))`,
    ),
    check(
      'game_content_quests_check_5',
      sql`(claim_npc_present IS NULL OR claim_npc_present IN (0,1))`,
    ),
    check(
      'game_content_quests_check_6',
      sql`(prerequisite IS NULL OR json_valid(prerequisite))`,
    ),
    check(
      'game_content_quests_check_7',
      sql`(rewards_experience IS NULL OR rewards_experience >= 0)`,
    ),
    check(
      'game_content_quests_check_8',
      sql`(rewards_experience IS NULL OR rewards_experience <= 1000000)`,
    ),
    check(
      'game_content_quests_check_9',
      sql`(rewards_gold IS NULL OR rewards_gold >= 0)`,
    ),
    check(
      'game_content_quests_check_10',
      sql`(rewards_gold IS NULL OR rewards_gold <= 1000000)`,
    ),
    check(
      'game_content_quests_check_11',
      sql`(rewards_ap IS NULL OR rewards_ap >= 0)`,
    ),
    check(
      'game_content_quests_check_12',
      sql`(rewards_ap IS NULL OR rewards_ap <= 1000000)`,
    ),
    check(
      'game_content_quests_check_13',
      sql`(rewards_items_present IS NULL OR rewards_items_present IN (0,1))`,
    ),
    check(
      'game_content_quests_check_14',
      sql`(rewards_skills_present IS NULL OR rewards_skills_present IN (0,1))`,
    ),
    check(
      'game_content_quests_check_15',
      sql`(rewards_titles_present IS NULL OR rewards_titles_present IN (0,1))`,
    ),
    check(
      'game_content_quests_check_16',
      sql`(rewards_flags_present IS NULL OR rewards_flags_present IN (0,1))`,
    ),
  ],
);

export const gameContentQuestsStages = sqliteTable(
  'game_content_quests_stages',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    stages_position: integer('stages_position').notNull(),
    value_id: text('value_id').notNull(),
    value_name: text('value_name').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.stages_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentQuests.content_version,
        gameContentQuests.definition_id,
        gameContentQuests.position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentQuestsStagesValueObjectives = sqliteTable(
  'game_content_quests_stages_value_objectives',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    stages_position: integer('stages_position').notNull(),
    value_objectives_position: integer('value_objectives_position').notNull(),
    value_id: text('value_id'),
    value_label: text('value_label'),
    value_target: real('value_target'),
    value_kind: text('value_kind'),
    value_world_id: text('value_world_id'),
    value_object_id: text('value_object_id'),
    value_skill_id: text('value_skill_id'),
    value_allow_defeat: integer('value_allow_defeat'),
    value_map_id: text('value_map_id'),
    value_dungeon_id: text('value_dungeon_id'),
    value_rank: text('value_rank'),
    value_item_id: text('value_item_id'),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.stages_position,
        t.value_objectives_position,
      ],
    }),
    foreignKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.stages_position,
      ],
      foreignColumns: [
        gameContentQuestsStages.content_version,
        gameContentQuestsStages.definition_id,
        gameContentQuestsStages.position,
        gameContentQuestsStages.stages_position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_world_id],
      foreignColumns: [
        gameContentWorlds.content_version,
        gameContentWorlds.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.value_skill_id],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.value_map_id],
      foreignColumns: [
        gameContentMaps.content_version,
        gameContentMaps.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.value_dungeon_id],
      foreignColumns: [
        gameContentDungeons.content_version,
        gameContentDungeons.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.value_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    check(
      'game_content_quests_stages_value_objectives_check_0',
      sql`(value_allow_defeat IS NULL OR value_allow_defeat IN (0,1))`,
    ),
    check(
      'game_content_quests_stages_value_objectives_check_1',
      sql`(value_rank IS NULL OR value_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))`,
    ),
  ],
);

export const gameContentQuestsRewardsItems = sqliteTable(
  'game_content_quests_rewards_items',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    rewards_items_position: integer('rewards_items_position').notNull(),
    value_item_id: text('value_item_id').notNull(),
    value_quantity: integer('value_quantity').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.rewards_items_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentQuests.content_version,
        gameContentQuests.definition_id,
        gameContentQuests.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    check(
      'game_content_quests_rewards_items_check_0',
      sql`(value_quantity IS NULL OR value_quantity >= 1)`,
    ),
    check(
      'game_content_quests_rewards_items_check_1',
      sql`(value_quantity IS NULL OR value_quantity <= 999)`,
    ),
  ],
);

export const gameContentQuestsRewardsSkills = sqliteTable(
  'game_content_quests_rewards_skills',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    rewards_skills_position: integer('rewards_skills_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.rewards_skills_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentQuests.content_version,
        gameContentQuests.definition_id,
        gameContentQuests.position,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
  ],
);

export const gameContentQuestsRewardsTitles = sqliteTable(
  'game_content_quests_rewards_titles',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    rewards_titles_position: integer('rewards_titles_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.rewards_titles_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentQuests.content_version,
        gameContentQuests.definition_id,
        gameContentQuests.position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentQuestsRewardsFlags = sqliteTable(
  'game_content_quests_rewards_flags',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    rewards_flags_position: integer('rewards_flags_position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.rewards_flags_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentQuests.content_version,
        gameContentQuests.definition_id,
        gameContentQuests.position,
      ],
    }).onDelete('cascade'),
  ],
);

export const gameContentTitles = sqliteTable(
  'game_content_titles',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    slot: text('slot').notNull(),
    category: text('category'),
    spoiler: text('spoiler'),
    hint: text('hint'),
    award: text('award'),
    discovery_first: integer('discovery_first'),
    eligibility_present: integer('eligibility_present').notNull(),
    eligibility_skill_id: text('eligibility_skill_id'),
    eligibility_rank: text('eligibility_rank'),
    effects_present: integer('effects_present').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_titles_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.eligibility_skill_id],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    check(
      'game_content_titles_check_0',
      sql`(slot IS NULL OR slot IN ('first','second'))`,
    ),
    check(
      'game_content_titles_check_1',
      sql`(category IS NULL OR category IN ('General','Story','Combat','Master','Event'))`,
    ),
    check(
      'game_content_titles_check_2',
      sql`(spoiler IS NULL OR spoiler IN ('hidden','placeholder'))`,
    ),
    check(
      'game_content_titles_check_3',
      sql`(hint IS NULL OR json_valid(hint))`,
    ),
    check(
      'game_content_titles_check_4',
      sql`(award IS NULL OR json_valid(award))`,
    ),
    check(
      'game_content_titles_check_5',
      sql`(discovery_first IS NULL OR discovery_first IN (0,1))`,
    ),
    check(
      'game_content_titles_check_6',
      sql`(eligibility_present IS NULL OR eligibility_present IN (0,1))`,
    ),
    check(
      'game_content_titles_check_7',
      sql`(eligibility_rank IS NULL OR eligibility_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))`,
    ),
    check(
      'game_content_titles_check_8',
      sql`(effects_present IS NULL OR effects_present IN (0,1))`,
    ),
  ],
);

export const gameContentTitlesEffects = sqliteTable(
  'game_content_titles_effects',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    effects_position: integer('effects_position').notNull(),
    value_stat: text('value_stat').notNull(),
    value_value: integer('value_value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.content_version,
        t.definition_id,
        t.position,
        t.effects_position,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.definition_id, t.position],
      foreignColumns: [
        gameContentTitles.content_version,
        gameContentTitles.definition_id,
        gameContentTitles.position,
      ],
    }).onDelete('cascade'),
    check(
      'game_content_titles_effects_check_0',
      sql`(value_stat IS NULL OR value_stat IN ('strength','intelligence','dexterity','will','luck','maxHealth','maxMana','maxStamina','physicalAttack','magicAttack','defense','protection','magicDefense','magicProtection'))`,
    ),
    check(
      'game_content_titles_effects_check_1',
      sql`(value_value IS NULL OR value_value >= -1500)`,
    ),
    check(
      'game_content_titles_effects_check_2',
      sql`(value_value IS NULL OR value_value <= 1500)`,
    ),
  ],
);

export const gameContentQuestFlags = sqliteTable(
  'game_content_quest_flags',
  {
    content_version: text('content_version').notNull(),
    definition_id: text('definition_id').notNull(),
    position: integer('position').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.content_version, t.definition_id, t.position] }),
    uniqueIndex('game_content_quest_flags_definition_idx').on(
      t.content_version,
      t.definition_id,
    ),
    foreignKey({
      columns: [t.content_version],
      foreignColumns: [gameContentReleases.content_version],
    }).onDelete('cascade'),
  ],
);

export const catalogModels = {
  skills: {
    table: 'game_content_skills',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'manaCost',
        optional: false,
        kind: 'scalar',
        column: 'mana_cost',
        boolean: false,
      },
      {
        name: 'power',
        optional: false,
        kind: 'scalar',
        column: 'power',
        boolean: false,
      },
      {
        name: 'element',
        optional: false,
        kind: 'scalar',
        column: 'element',
        boolean: false,
      },
      {
        name: 'target',
        optional: false,
        kind: 'scalar',
        column: 'target',
        boolean: false,
      },
      {
        name: 'effect',
        optional: true,
        kind: 'scalar',
        column: 'effect',
        boolean: false,
      },
      {
        name: 'statuses',
        optional: true,
        kind: 'array',
        presence: 'statuses_present',
        table: 'game_content_skills_statuses',
        key: 'statuses_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'hitChance',
        optional: true,
        kind: 'scalar',
        column: 'hit_chance',
        boolean: false,
      },
      {
        name: 'criticalChance',
        optional: true,
        kind: 'scalar',
        column: 'critical_chance',
        boolean: false,
      },
      {
        name: 'staminaCost',
        optional: true,
        kind: 'scalar',
        column: 'stamina_cost',
        boolean: false,
      },
      {
        name: 'physicalMultiplier',
        optional: true,
        kind: 'scalar',
        column: 'physical_multiplier',
        boolean: false,
      },
      {
        name: 'bypassDefend',
        optional: true,
        kind: 'scalar',
        column: 'bypass_defend',
        boolean: true,
      },
      {
        name: 'statBonuses',
        optional: true,
        kind: 'object',
        presence: 'stat_bonuses_present',
        fields: [
          {
            name: 'strength',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_strength',
            boolean: false,
          },
          {
            name: 'intelligence',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_intelligence',
            boolean: false,
          },
          {
            name: 'dexterity',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_dexterity',
            boolean: false,
          },
          {
            name: 'will',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_will',
            boolean: false,
          },
          {
            name: 'luck',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_luck',
            boolean: false,
          },
        ],
      },
      {
        name: 'minPower',
        optional: true,
        kind: 'scalar',
        column: 'min_power',
        boolean: false,
      },
      {
        name: 'maxPower',
        optional: true,
        kind: 'scalar',
        column: 'max_power',
        boolean: false,
      },
      {
        name: 'minMagicModifier',
        optional: true,
        kind: 'scalar',
        column: 'min_magic_modifier',
        boolean: false,
      },
      {
        name: 'maxMagicModifier',
        optional: true,
        kind: 'scalar',
        column: 'max_magic_modifier',
        boolean: false,
      },
      {
        name: 'category',
        optional: true,
        kind: 'scalar',
        column: 'category',
        boolean: false,
      },
      {
        name: 'kind',
        optional: true,
        kind: 'scalar',
        column: 'kind',
        boolean: false,
      },
      {
        name: 'battleUsable',
        optional: true,
        kind: 'scalar',
        column: 'battle_usable',
        boolean: true,
      },
      {
        name: 'rank',
        optional: true,
        kind: 'scalar',
        column: 'rank',
        boolean: false,
      },
      {
        name: 'description',
        optional: true,
        kind: 'scalar',
        column: 'description',
        boolean: false,
      },
      {
        name: 'reference',
        optional: true,
        kind: 'json',
        column: 'reference',
      },
      {
        name: 'gameRanks',
        optional: true,
        kind: 'record',
        presence: 'game_ranks_present',
        table: 'game_content_skills_game_ranks',
        key: 'game_ranks_key',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'minPower',
              optional: false,
              kind: 'scalar',
              column: 'value_min_power',
              boolean: false,
            },
            {
              name: 'maxPower',
              optional: false,
              kind: 'scalar',
              column: 'value_max_power',
              boolean: false,
            },
            {
              name: 'manaCost',
              optional: false,
              kind: 'scalar',
              column: 'value_mana_cost',
              boolean: false,
            },
            {
              name: 'staminaCost',
              optional: false,
              kind: 'scalar',
              column: 'value_stamina_cost',
              boolean: false,
            },
            {
              name: 'physicalMultiplier',
              optional: true,
              kind: 'scalar',
              column: 'value_physical_multiplier',
              boolean: false,
            },
            {
              name: 'bypassDefend',
              optional: true,
              kind: 'scalar',
              column: 'value_bypass_defend',
              boolean: true,
            },
            {
              name: 'cooldown',
              optional: true,
              kind: 'scalar',
              column: 'value_cooldown',
              boolean: false,
            },
            {
              name: 'nextRank',
              optional: true,
              kind: 'scalar',
              column: 'value_next_rank',
              boolean: false,
            },
            {
              name: 'apCost',
              optional: true,
              kind: 'scalar',
              column: 'value_ap_cost',
              boolean: false,
            },
            {
              name: 'objectives',
              optional: false,
              kind: 'array',
              table: 'game_content_skills_game_ranks_value_objectives',
              key: 'value_objectives_position',
              element: {
                name: 'value',
                optional: false,
                kind: 'object',
                fields: [
                  {
                    name: 'id',
                    optional: false,
                    kind: 'scalar',
                    column: 'value_id',
                    boolean: false,
                  },
                  {
                    name: 'label',
                    optional: false,
                    kind: 'scalar',
                    column: 'value_label',
                    boolean: false,
                  },
                  {
                    name: 'event',
                    optional: false,
                    kind: 'scalar',
                    column: 'value_event',
                    boolean: false,
                  },
                  {
                    name: 'scope',
                    optional: false,
                    kind: 'scalar',
                    column: 'value_scope',
                    boolean: false,
                  },
                  {
                    name: 'points',
                    optional: false,
                    kind: 'scalar',
                    column: 'value_points',
                    boolean: false,
                  },
                  {
                    name: 'maximum',
                    optional: false,
                    kind: 'scalar',
                    column: 'value_maximum',
                    boolean: false,
                  },
                ],
              },
            },
            {
              name: 'statBonuses',
              optional: true,
              kind: 'object',
              presence: 'value_stat_bonuses_present',
              fields: [
                {
                  name: 'strength',
                  optional: true,
                  kind: 'scalar',
                  column: 'value_stat_bonuses_strength',
                  boolean: false,
                },
                {
                  name: 'intelligence',
                  optional: true,
                  kind: 'scalar',
                  column: 'value_stat_bonuses_intelligence',
                  boolean: false,
                },
                {
                  name: 'dexterity',
                  optional: true,
                  kind: 'scalar',
                  column: 'value_stat_bonuses_dexterity',
                  boolean: false,
                },
                {
                  name: 'will',
                  optional: true,
                  kind: 'scalar',
                  column: 'value_stat_bonuses_will',
                  boolean: false,
                },
                {
                  name: 'luck',
                  optional: true,
                  kind: 'scalar',
                  column: 'value_stat_bonuses_luck',
                  boolean: false,
                },
              ],
            },
            {
              name: 'maxHealth',
              optional: true,
              kind: 'scalar',
              column: 'value_max_health',
              boolean: false,
            },
            {
              name: 'meleeMin',
              optional: true,
              kind: 'scalar',
              column: 'value_melee_min',
              boolean: false,
            },
            {
              name: 'meleeMax',
              optional: true,
              kind: 'scalar',
              column: 'value_melee_max',
              boolean: false,
            },
            {
              name: 'swordMin',
              optional: true,
              kind: 'scalar',
              column: 'value_sword_min',
              boolean: false,
            },
            {
              name: 'swordMax',
              optional: true,
              kind: 'scalar',
              column: 'value_sword_max',
              boolean: false,
            },
            {
              name: 'swordBalance',
              optional: true,
              kind: 'scalar',
              column: 'value_sword_balance',
              boolean: false,
            },
            {
              name: 'rangedMin',
              optional: true,
              kind: 'scalar',
              column: 'value_ranged_min',
              boolean: false,
            },
            {
              name: 'rangedMax',
              optional: true,
              kind: 'scalar',
              column: 'value_ranged_max',
              boolean: false,
            },
            {
              name: 'rangedBalance',
              optional: true,
              kind: 'scalar',
              column: 'value_ranged_balance',
              boolean: false,
            },
          ],
        },
      },
      {
        name: 'requiresWeapon',
        optional: true,
        kind: 'scalar',
        column: 'requires_weapon',
        boolean: false,
      },
      {
        name: 'acquisitionHint',
        optional: true,
        kind: 'scalar',
        column: 'acquisition_hint',
        boolean: false,
      },
      {
        name: 'enemyOnly',
        optional: true,
        kind: 'scalar',
        column: 'enemy_only',
        boolean: true,
      },
      {
        name: 'enemyUse',
        optional: true,
        kind: 'object',
        presence: 'enemy_use_present',
        fields: [
          {
            name: 'type',
            optional: true,
            kind: 'scalar',
            column: 'enemy_use_type',
            boolean: false,
          },
          {
            name: 'statusId',
            optional: true,
            kind: 'scalar',
            column: 'enemy_use_status_id',
            boolean: false,
          },
          {
            name: 'chance',
            optional: true,
            kind: 'scalar',
            column: 'enemy_use_chance',
            boolean: false,
          },
        ],
      },
    ],
  },
  enemies: {
    table: 'game_content_enemies',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'maxHealth',
        optional: false,
        kind: 'scalar',
        column: 'max_health',
        boolean: false,
      },
      {
        name: 'maxMana',
        optional: false,
        kind: 'scalar',
        column: 'max_mana',
        boolean: false,
      },
      {
        name: 'combatant',
        optional: false,
        kind: 'object',
        fields: [
          {
            name: 'attack',
            optional: false,
            kind: 'scalar',
            column: 'combatant_attack',
            boolean: false,
          },
          {
            name: 'defense',
            optional: false,
            kind: 'scalar',
            column: 'combatant_defense',
            boolean: false,
          },
          {
            name: 'speed',
            optional: false,
            kind: 'scalar',
            column: 'combatant_speed',
            boolean: false,
          },
          {
            name: 'minDamage',
            optional: true,
            kind: 'scalar',
            column: 'combatant_min_damage',
            boolean: false,
          },
          {
            name: 'maxDamage',
            optional: true,
            kind: 'scalar',
            column: 'combatant_max_damage',
            boolean: false,
          },
          {
            name: 'balance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_balance',
            boolean: false,
          },
          {
            name: 'magicAttack',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_attack',
            boolean: false,
          },
          {
            name: 'magicDefense',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_defense',
            boolean: false,
          },
          {
            name: 'protection',
            optional: true,
            kind: 'scalar',
            column: 'combatant_protection',
            boolean: false,
          },
          {
            name: 'magicProtection',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_protection',
            boolean: false,
          },
          {
            name: 'magicBalance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_balance',
            boolean: false,
          },
          {
            name: 'magicCriticalChance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_critical_chance',
            boolean: false,
          },
          {
            name: 'criticalRating',
            optional: true,
            kind: 'scalar',
            column: 'combatant_critical_rating',
            boolean: false,
          },
          {
            name: 'minInjury',
            optional: true,
            kind: 'scalar',
            column: 'combatant_min_injury',
            boolean: false,
          },
          {
            name: 'maxInjury',
            optional: true,
            kind: 'scalar',
            column: 'combatant_max_injury',
            boolean: false,
          },
          {
            name: 'armorPierce',
            optional: true,
            kind: 'scalar',
            column: 'combatant_armor_pierce',
            boolean: false,
          },
          {
            name: 'hitChance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_hit_chance',
            boolean: false,
          },
          {
            name: 'evasion',
            optional: true,
            kind: 'scalar',
            column: 'combatant_evasion',
            boolean: false,
          },
          {
            name: 'criticalChance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_critical_chance',
            boolean: false,
          },
          {
            name: 'criticalMultiplier',
            optional: true,
            kind: 'scalar',
            column: 'combatant_critical_multiplier',
            boolean: false,
          },
        ],
      },
      {
        name: 'maxStamina',
        optional: true,
        kind: 'scalar',
        column: 'max_stamina',
        boolean: false,
      },
      {
        name: 'skills',
        optional: false,
        kind: 'array',
        table: 'game_content_enemies_skills',
        key: 'skills_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'sprite',
        optional: false,
        kind: 'object',
        fields: [
          {
            name: 'atlas',
            optional: false,
            kind: 'scalar',
            column: 'sprite_atlas',
            boolean: false,
          },
          {
            name: 'frame',
            optional: false,
            kind: 'scalar',
            column: 'sprite_frame',
            boolean: false,
          },
          {
            name: 'idleFrames',
            optional: true,
            kind: 'array',
            presence: 'sprite_idle_frames_present',
            table: 'game_content_enemies_sprite_idle_frames',
            key: 'sprite_idle_frames_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'scalar',
              column: 'value',
              boolean: false,
            },
          },
        ],
      },
      {
        name: 'battleAI',
        optional: true,
        kind: 'object',
        presence: 'battle_a_i_present',
        fields: [
          {
            name: 'engineId',
            optional: false,
            kind: 'scalar',
            column: 'battle_a_i_engine_id',
            boolean: false,
          },
          {
            name: 'config',
            optional: true,
            kind: 'json',
            column: 'battle_a_i_config',
          },
        ],
      },
      {
        name: 'experience',
        optional: true,
        kind: 'scalar',
        column: 'experience',
        boolean: false,
      },
      {
        name: 'gold',
        optional: true,
        kind: 'scalar',
        column: 'gold',
        boolean: false,
      },
      {
        name: 'loot',
        optional: true,
        kind: 'array',
        presence: 'loot_present',
        table: 'game_content_enemies_loot',
        key: 'loot_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'itemId',
              optional: false,
              kind: 'scalar',
              column: 'value_item_id',
              boolean: false,
            },
            {
              name: 'chance',
              optional: false,
              kind: 'scalar',
              column: 'value_chance',
              boolean: false,
            },
            {
              name: 'min',
              optional: false,
              kind: 'scalar',
              column: 'value_min',
              boolean: false,
            },
            {
              name: 'max',
              optional: false,
              kind: 'scalar',
              column: 'value_max',
              boolean: false,
            },
          ],
        },
      },
    ],
  },
  classes: {
    table: 'game_content_classes',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'maxHealth',
        optional: false,
        kind: 'scalar',
        column: 'max_health',
        boolean: false,
      },
      {
        name: 'maxMana',
        optional: false,
        kind: 'scalar',
        column: 'max_mana',
        boolean: false,
      },
      {
        name: 'combatant',
        optional: false,
        kind: 'object',
        fields: [
          {
            name: 'attack',
            optional: false,
            kind: 'scalar',
            column: 'combatant_attack',
            boolean: false,
          },
          {
            name: 'defense',
            optional: false,
            kind: 'scalar',
            column: 'combatant_defense',
            boolean: false,
          },
          {
            name: 'speed',
            optional: false,
            kind: 'scalar',
            column: 'combatant_speed',
            boolean: false,
          },
          {
            name: 'minDamage',
            optional: true,
            kind: 'scalar',
            column: 'combatant_min_damage',
            boolean: false,
          },
          {
            name: 'maxDamage',
            optional: true,
            kind: 'scalar',
            column: 'combatant_max_damage',
            boolean: false,
          },
          {
            name: 'balance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_balance',
            boolean: false,
          },
          {
            name: 'magicAttack',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_attack',
            boolean: false,
          },
          {
            name: 'magicDefense',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_defense',
            boolean: false,
          },
          {
            name: 'protection',
            optional: true,
            kind: 'scalar',
            column: 'combatant_protection',
            boolean: false,
          },
          {
            name: 'magicProtection',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_protection',
            boolean: false,
          },
          {
            name: 'magicBalance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_balance',
            boolean: false,
          },
          {
            name: 'magicCriticalChance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_magic_critical_chance',
            boolean: false,
          },
          {
            name: 'criticalRating',
            optional: true,
            kind: 'scalar',
            column: 'combatant_critical_rating',
            boolean: false,
          },
          {
            name: 'minInjury',
            optional: true,
            kind: 'scalar',
            column: 'combatant_min_injury',
            boolean: false,
          },
          {
            name: 'maxInjury',
            optional: true,
            kind: 'scalar',
            column: 'combatant_max_injury',
            boolean: false,
          },
          {
            name: 'armorPierce',
            optional: true,
            kind: 'scalar',
            column: 'combatant_armor_pierce',
            boolean: false,
          },
          {
            name: 'hitChance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_hit_chance',
            boolean: false,
          },
          {
            name: 'evasion',
            optional: true,
            kind: 'scalar',
            column: 'combatant_evasion',
            boolean: false,
          },
          {
            name: 'criticalChance',
            optional: true,
            kind: 'scalar',
            column: 'combatant_critical_chance',
            boolean: false,
          },
          {
            name: 'criticalMultiplier',
            optional: true,
            kind: 'scalar',
            column: 'combatant_critical_multiplier',
            boolean: false,
          },
        ],
      },
      {
        name: 'maxStamina',
        optional: true,
        kind: 'scalar',
        column: 'max_stamina',
        boolean: false,
      },
      {
        name: 'skills',
        optional: false,
        kind: 'array',
        table: 'game_content_classes_skills',
        key: 'skills_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'sprite',
        optional: false,
        kind: 'object',
        fields: [
          {
            name: 'atlas',
            optional: false,
            kind: 'scalar',
            column: 'sprite_atlas',
            boolean: false,
          },
          {
            name: 'frame',
            optional: false,
            kind: 'scalar',
            column: 'sprite_frame',
            boolean: false,
          },
          {
            name: 'idleFrames',
            optional: true,
            kind: 'array',
            presence: 'sprite_idle_frames_present',
            table: 'game_content_classes_sprite_idle_frames',
            key: 'sprite_idle_frames_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'scalar',
              column: 'value',
              boolean: false,
            },
          },
        ],
      },
    ],
  },
  items: {
    table: 'game_content_items',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'kind',
        optional: false,
        kind: 'scalar',
        column: 'kind',
        boolean: false,
      },
      {
        name: 'enchantId',
        optional: true,
        kind: 'scalar',
        column: 'enchant_id',
        boolean: false,
      },
      {
        name: 'titleId',
        optional: true,
        kind: 'scalar',
        column: 'title_id',
        boolean: false,
      },
      {
        name: 'price',
        optional: false,
        kind: 'scalar',
        column: 'price',
        boolean: false,
      },
      {
        name: 'power',
        optional: false,
        kind: 'scalar',
        column: 'power',
        boolean: false,
      },
      {
        name: 'description',
        optional: false,
        kind: 'scalar',
        column: 'description',
        boolean: false,
      },
      {
        name: 'weaponTags',
        optional: true,
        kind: 'array',
        presence: 'weapon_tags_present',
        table: 'game_content_items_weapon_tags',
        key: 'weapon_tags_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'skillId',
        optional: true,
        kind: 'scalar',
        column: 'skill_id',
        boolean: false,
      },
      {
        name: 'recipeId',
        optional: true,
        kind: 'scalar',
        column: 'recipe_id',
        boolean: false,
      },
      {
        name: 'stat',
        optional: true,
        kind: 'scalar',
        column: 'stat',
        boolean: false,
      },
      {
        name: 'maxDurability',
        optional: true,
        kind: 'scalar',
        column: 'max_durability',
        boolean: false,
      },
      {
        name: 'restores',
        optional: true,
        kind: 'scalar',
        column: 'restores',
        boolean: false,
      },
      {
        name: 'battleUsable',
        optional: true,
        kind: 'scalar',
        column: 'battle_usable',
        boolean: true,
      },
      {
        name: 'weaponStats',
        optional: true,
        kind: 'object',
        presence: 'weapon_stats_present',
        fields: [
          {
            name: 'minDamage',
            optional: false,
            kind: 'scalar',
            column: 'weapon_stats_min_damage',
            boolean: false,
          },
          {
            name: 'maxDamage',
            optional: false,
            kind: 'scalar',
            column: 'weapon_stats_max_damage',
            boolean: false,
          },
          {
            name: 'balance',
            optional: false,
            kind: 'scalar',
            column: 'weapon_stats_balance',
            boolean: false,
          },
          {
            name: 'critical',
            optional: false,
            kind: 'scalar',
            column: 'weapon_stats_critical',
            boolean: false,
          },
          {
            name: 'minInjury',
            optional: false,
            kind: 'scalar',
            column: 'weapon_stats_min_injury',
            boolean: false,
          },
          {
            name: 'maxInjury',
            optional: false,
            kind: 'scalar',
            column: 'weapon_stats_max_injury',
            boolean: false,
          },
        ],
      },
      {
        name: 'protection',
        optional: true,
        kind: 'scalar',
        column: 'protection',
        boolean: false,
      },
      {
        name: 'magicDefense',
        optional: true,
        kind: 'scalar',
        column: 'magic_defense',
        boolean: false,
      },
      {
        name: 'magicProtection',
        optional: true,
        kind: 'scalar',
        column: 'magic_protection',
        boolean: false,
      },
      {
        name: 'statBonuses',
        optional: true,
        kind: 'object',
        presence: 'stat_bonuses_present',
        fields: [
          {
            name: 'strength',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_strength',
            boolean: false,
          },
          {
            name: 'intelligence',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_intelligence',
            boolean: false,
          },
          {
            name: 'dexterity',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_dexterity',
            boolean: false,
          },
          {
            name: 'will',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_will',
            boolean: false,
          },
          {
            name: 'luck',
            optional: true,
            kind: 'scalar',
            column: 'stat_bonuses_luck',
            boolean: false,
          },
        ],
      },
      {
        name: 'staminaRecovery',
        optional: true,
        kind: 'scalar',
        column: 'stamina_recovery',
        boolean: false,
      },
      {
        name: 'fullnessRecovery',
        optional: true,
        kind: 'scalar',
        column: 'fullness_recovery',
        boolean: false,
      },
    ],
  },
  statusEffects: {
    table: 'game_content_status_effects',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'duration',
        optional: false,
        kind: 'scalar',
        column: 'duration',
        boolean: false,
      },
      {
        name: 'tickTiming',
        optional: false,
        kind: 'scalar',
        column: 'tick_timing',
        boolean: false,
      },
      {
        name: 'stacking',
        optional: false,
        kind: 'scalar',
        column: 'stacking',
        boolean: false,
      },
      {
        name: 'effect',
        optional: false,
        kind: 'scalar',
        column: 'effect',
        boolean: false,
      },
      {
        name: 'healthFraction',
        optional: true,
        kind: 'scalar',
        column: 'health_fraction',
        boolean: false,
      },
      {
        name: 'power',
        optional: false,
        kind: 'scalar',
        column: 'power',
        boolean: false,
      },
      {
        name: 'stat',
        optional: true,
        kind: 'scalar',
        column: 'stat',
        boolean: false,
      },
      {
        name: 'modifier',
        optional: true,
        kind: 'scalar',
        column: 'modifier',
        boolean: false,
      },
    ],
  },
  atlases: {
    table: 'game_content_atlases',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'columns',
        optional: false,
        kind: 'scalar',
        column: 'columns',
        boolean: false,
      },
      {
        name: 'rows',
        optional: false,
        kind: 'scalar',
        column: 'rows',
        boolean: false,
      },
      {
        name: 'frameWidth',
        optional: false,
        kind: 'scalar',
        column: 'frame_width',
        boolean: false,
      },
      {
        name: 'frameHeight',
        optional: false,
        kind: 'scalar',
        column: 'frame_height',
        boolean: false,
      },
    ],
  },
  maps: {
    table: 'game_content_maps',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'width',
        optional: false,
        kind: 'scalar',
        column: 'width',
        boolean: false,
      },
      {
        name: 'height',
        optional: false,
        kind: 'scalar',
        column: 'height',
        boolean: false,
      },
      {
        name: 'tileSize',
        optional: false,
        kind: 'scalar',
        column: 'tile_size',
        boolean: false,
      },
      {
        name: 'tiles',
        optional: false,
        kind: 'json',
        column: 'tiles',
      },
      {
        name: 'spawns',
        optional: false,
        kind: 'array',
        table: 'game_content_maps_spawns',
        key: 'spawns_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'entityId',
              optional: false,
              kind: 'scalar',
              column: 'value_entity_id',
              boolean: false,
            },
            {
              name: 'kind',
              optional: false,
              kind: 'scalar',
              column: 'value_kind',
              boolean: false,
            },
            {
              name: 'definitionId',
              optional: false,
              kind: 'scalar',
              column: 'value_definition_id',
              boolean: false,
            },
            {
              name: 'x',
              optional: false,
              kind: 'scalar',
              column: 'value_x',
              boolean: false,
            },
            {
              name: 'y',
              optional: false,
              kind: 'scalar',
              column: 'value_y',
              boolean: false,
            },
          ],
        },
      },
    ],
  },
  worlds: {
    table: 'game_content_worlds',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'width',
        optional: false,
        kind: 'scalar',
        column: 'width',
        boolean: false,
      },
      {
        name: 'height',
        optional: false,
        kind: 'scalar',
        column: 'height',
        boolean: false,
      },
      {
        name: 'tileSize',
        optional: false,
        kind: 'scalar',
        column: 'tile_size',
        boolean: false,
      },
      {
        name: 'tiles',
        optional: false,
        kind: 'json',
        column: 'tiles',
      },
      {
        name: 'entry',
        optional: false,
        kind: 'object',
        fields: [
          {
            name: 'x',
            optional: false,
            kind: 'scalar',
            column: 'entry_x',
            boolean: false,
          },
          {
            name: 'y',
            optional: false,
            kind: 'scalar',
            column: 'entry_y',
            boolean: false,
          },
        ],
      },
      {
        name: 'theme',
        optional: true,
        kind: 'scalar',
        column: 'theme',
        boolean: false,
      },
      {
        name: 'decorations',
        optional: true,
        kind: 'array',
        presence: 'decorations_present',
        table: 'game_content_worlds_decorations',
        key: 'decorations_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'id',
              optional: false,
              kind: 'scalar',
              column: 'value_id',
              boolean: false,
            },
            {
              name: 'x',
              optional: false,
              kind: 'scalar',
              column: 'value_x',
              boolean: false,
            },
            {
              name: 'y',
              optional: false,
              kind: 'scalar',
              column: 'value_y',
              boolean: false,
            },
            {
              name: 'sprite',
              optional: false,
              kind: 'object',
              fields: [
                {
                  name: 'atlas',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_sprite_atlas',
                  boolean: false,
                },
                {
                  name: 'frame',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_sprite_frame',
                  boolean: false,
                },
              ],
            },
            {
              name: 'size',
              optional: true,
              kind: 'scalar',
              column: 'value_size',
              boolean: false,
            },
            {
              name: 'blocking',
              optional: true,
              kind: 'scalar',
              column: 'value_blocking',
              boolean: true,
            },
            {
              name: 'objectId',
              optional: true,
              kind: 'scalar',
              column: 'value_object_id',
              boolean: false,
            },
          ],
        },
      },
      {
        name: 'objects',
        optional: false,
        kind: 'array',
        table: 'game_content_worlds_objects',
        key: 'objects_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'id',
              optional: false,
              kind: 'scalar',
              column: 'value_id',
              boolean: false,
            },
            {
              name: 'x',
              optional: false,
              kind: 'scalar',
              column: 'value_x',
              boolean: false,
            },
            {
              name: 'y',
              optional: false,
              kind: 'scalar',
              column: 'value_y',
              boolean: false,
            },
            {
              name: 'name',
              optional: false,
              kind: 'scalar',
              column: 'value_name',
              boolean: false,
            },
            {
              name: 'sprite',
              optional: true,
              kind: 'object',
              presence: 'value_sprite_present',
              fields: [
                {
                  name: 'atlas',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_sprite_atlas',
                  boolean: false,
                },
                {
                  name: 'frame',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_sprite_frame',
                  boolean: false,
                },
              ],
            },
            {
              name: 'kind',
              optional: false,
              kind: 'scalar',
              column: 'value_kind',
              boolean: false,
            },
            {
              name: 'enchanting',
              optional: true,
              kind: 'scalar',
              column: 'value_enchanting',
              boolean: true,
            },
            {
              name: 'lessons',
              optional: true,
              kind: 'array',
              presence: 'value_lessons_present',
              table: 'game_content_worlds_objects_value_lessons',
              key: 'value_lessons_position',
              element: {
                name: 'value',
                optional: false,
                kind: 'object',
                fields: [
                  {
                    name: 'skillId',
                    optional: false,
                    kind: 'scalar',
                    column: 'value_skill_id',
                    boolean: false,
                  },
                  {
                    name: 'fee',
                    optional: false,
                    kind: 'scalar',
                    column: 'value_fee',
                    boolean: false,
                  },
                ],
              },
            },
            {
              name: 'dialogue',
              optional: true,
              kind: 'scalar',
              column: 'value_dialogue',
              boolean: false,
            },
            {
              name: 'itemId',
              optional: true,
              kind: 'scalar',
              column: 'value_item_id',
              boolean: false,
            },
            {
              name: 'quantity',
              optional: true,
              kind: 'scalar',
              column: 'value_quantity',
              boolean: false,
            },
            {
              name: 'destination',
              optional: true,
              kind: 'scalar',
              column: 'value_destination',
              boolean: false,
            },
            {
              name: 'encounterMap',
              optional: true,
              kind: 'scalar',
              column: 'value_encounter_map',
              boolean: false,
            },
            {
              name: 'requiresCleared',
              optional: true,
              kind: 'array',
              presence: 'value_requires_cleared_present',
              table: 'game_content_worlds_objects_value_requires_cleared',
              key: 'value_requires_cleared_position',
              element: {
                name: 'value',
                optional: false,
                kind: 'scalar',
                column: 'value',
                boolean: false,
              },
            },
            {
              name: 'destinationPosition',
              optional: true,
              kind: 'object',
              presence: 'value_destination_position_present',
              fields: [
                {
                  name: 'x',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_destination_position_x',
                  boolean: false,
                },
                {
                  name: 'y',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_destination_position_y',
                  boolean: false,
                },
              ],
            },
            {
              name: 'shopId',
              optional: true,
              kind: 'scalar',
              column: 'value_shop_id',
              boolean: false,
            },
            {
              name: 'healingCost',
              optional: true,
              kind: 'scalar',
              column: 'value_healing_cost',
              boolean: false,
            },
            {
              name: 'dungeonId',
              optional: true,
              kind: 'scalar',
              column: 'value_dungeon_id',
              boolean: false,
            },
            {
              name: 'gateType',
              optional: true,
              kind: 'scalar',
              column: 'value_gate_type',
              boolean: false,
            },
            {
              name: 'keyType',
              optional: true,
              kind: 'scalar',
              column: 'value_key_type',
              boolean: false,
            },
            {
              name: 'blocked',
              optional: true,
              kind: 'scalar',
              column: 'value_blocked',
              boolean: true,
            },
          ],
        },
      },
    ],
  },
  dungeons: {
    table: 'game_content_dungeons',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'minRooms',
        optional: false,
        kind: 'scalar',
        column: 'min_rooms',
        boolean: false,
      },
      {
        name: 'maxRooms',
        optional: false,
        kind: 'scalar',
        column: 'max_rooms',
        boolean: false,
      },
      {
        name: 'roomWeights',
        optional: false,
        kind: 'object',
        fields: [
          {
            name: 'monster',
            optional: false,
            kind: 'scalar',
            column: 'room_weights_monster',
            boolean: false,
          },
          {
            name: 'chest',
            optional: false,
            kind: 'scalar',
            column: 'room_weights_chest',
            boolean: false,
          },
          {
            name: 'mimic',
            optional: false,
            kind: 'scalar',
            column: 'room_weights_mimic',
            boolean: false,
          },
          {
            name: 'fountain',
            optional: false,
            kind: 'scalar',
            column: 'room_weights_fountain',
            boolean: false,
          },
        ],
      },
      {
        name: 'monsterIds',
        optional: false,
        kind: 'array',
        table: 'game_content_dungeons_monster_ids',
        key: 'monster_ids_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'mimicId',
        optional: false,
        kind: 'scalar',
        column: 'mimic_id',
        boolean: false,
      },
      {
        name: 'bossId',
        optional: false,
        kind: 'scalar',
        column: 'boss_id',
        boolean: false,
      },
      {
        name: 'companionIds',
        optional: false,
        kind: 'array',
        table: 'game_content_dungeons_companion_ids',
        key: 'companion_ids_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'fountainIds',
        optional: false,
        kind: 'array',
        table: 'game_content_dungeons_fountain_ids',
        key: 'fountain_ids_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'ordinaryRewards',
        optional: false,
        kind: 'array',
        table: 'game_content_dungeons_ordinary_rewards',
        key: 'ordinary_rewards_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'itemId',
              optional: false,
              kind: 'scalar',
              column: 'value_item_id',
              boolean: false,
            },
            {
              name: 'min',
              optional: false,
              kind: 'scalar',
              column: 'value_min',
              boolean: false,
            },
            {
              name: 'max',
              optional: false,
              kind: 'scalar',
              column: 'value_max',
              boolean: false,
            },
            {
              name: 'weight',
              optional: false,
              kind: 'scalar',
              column: 'value_weight',
              boolean: false,
            },
          ],
        },
      },
      {
        name: 'finalRewards',
        optional: false,
        kind: 'array',
        table: 'game_content_dungeons_final_rewards',
        key: 'final_rewards_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'itemId',
              optional: false,
              kind: 'scalar',
              column: 'value_item_id',
              boolean: false,
            },
            {
              name: 'min',
              optional: false,
              kind: 'scalar',
              column: 'value_min',
              boolean: false,
            },
            {
              name: 'max',
              optional: false,
              kind: 'scalar',
              column: 'value_max',
              boolean: false,
            },
            {
              name: 'weight',
              optional: false,
              kind: 'scalar',
              column: 'value_weight',
              boolean: false,
            },
          ],
        },
      },
    ],
  },
  shops: {
    table: 'game_content_shops',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'kind',
        optional: false,
        kind: 'scalar',
        column: 'kind',
        boolean: false,
      },
      {
        name: 'items',
        optional: false,
        kind: 'array',
        table: 'game_content_shops_items',
        key: 'items_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'bundles',
        optional: true,
        kind: 'array',
        presence: 'bundles_present',
        table: 'game_content_shops_bundles',
        key: 'bundles_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'itemId',
              optional: false,
              kind: 'scalar',
              column: 'value_item_id',
              boolean: false,
            },
            {
              name: 'quantity',
              optional: false,
              kind: 'scalar',
              column: 'value_quantity',
              boolean: false,
            },
            {
              name: 'price',
              optional: false,
              kind: 'scalar',
              column: 'value_price',
              boolean: false,
            },
          ],
        },
      },
      {
        name: 'buysItems',
        optional: true,
        kind: 'scalar',
        column: 'buys_items',
        boolean: true,
      },
    ],
  },
  skillBookRecipes: {
    table: 'game_content_skill_book_recipes',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'skillId',
        optional: false,
        kind: 'scalar',
        column: 'skill_id',
        boolean: false,
      },
      {
        name: 'incompleteItemId',
        optional: false,
        kind: 'scalar',
        column: 'incomplete_item_id',
        boolean: false,
      },
      {
        name: 'completeItemId',
        optional: false,
        kind: 'scalar',
        column: 'complete_item_id',
        boolean: false,
      },
      {
        name: 'pages',
        optional: false,
        kind: 'array',
        table: 'game_content_skill_book_recipes_pages',
        key: 'pages_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'itemId',
              optional: false,
              kind: 'scalar',
              column: 'value_item_id',
              boolean: false,
            },
            {
              name: 'hint',
              optional: false,
              kind: 'scalar',
              column: 'value_hint',
              boolean: false,
            },
          ],
        },
      },
    ],
  },
  enchants: {
    table: 'game_content_enchants',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'slot',
        optional: false,
        kind: 'scalar',
        column: 'slot',
        boolean: false,
      },
      {
        name: 'rank',
        optional: false,
        kind: 'scalar',
        column: 'rank',
        boolean: false,
      },
      {
        name: 'kinds',
        optional: false,
        kind: 'array',
        table: 'game_content_enchants_kinds',
        key: 'kinds_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'tags',
        optional: false,
        kind: 'array',
        table: 'game_content_enchants_tags',
        key: 'tags_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'clauses',
        optional: false,
        kind: 'array',
        table: 'game_content_enchants_clauses',
        key: 'clauses_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'id',
              optional: false,
              kind: 'scalar',
              column: 'value_id',
              boolean: false,
            },
            {
              name: 'stat',
              optional: false,
              kind: 'scalar',
              column: 'value_stat',
              boolean: false,
            },
            {
              name: 'unit',
              optional: false,
              kind: 'scalar',
              column: 'value_unit',
              boolean: false,
            },
            {
              name: 'min',
              optional: false,
              kind: 'scalar',
              column: 'value_min',
              boolean: false,
            },
            {
              name: 'max',
              optional: false,
              kind: 'scalar',
              column: 'value_max',
              boolean: false,
            },
            {
              name: 'conditions',
              optional: false,
              kind: 'array',
              table: 'game_content_enchants_clauses_value_conditions',
              key: 'value_conditions_position',
              element: {
                name: 'value',
                optional: false,
                kind: 'object',
                fields: [
                  {
                    name: 'kind',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_kind',
                    boolean: false,
                  },
                  {
                    name: 'skillId',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_skill_id',
                    boolean: false,
                  },
                  {
                    name: 'rank',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_rank',
                    boolean: false,
                  },
                  {
                    name: 'minimum',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_minimum',
                    boolean: false,
                  },
                  {
                    name: 'talent',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_talent',
                    boolean: false,
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
  enchantingRules: {
    table: 'game_content_enchanting_rules',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'value',
        optional: false,
        kind: 'object',
        fields: [
          {
            name: 'intCap',
            optional: false,
            kind: 'scalar',
            column: 'value_int_cap',
            boolean: false,
          },
          {
            name: 'intBonusBpPerPoint',
            optional: false,
            kind: 'scalar',
            column: 'value_int_bonus_bp_per_point',
            boolean: false,
          },
          {
            name: 'baseChanceBp',
            optional: false,
            kind: 'record',
            table: 'game_content_enchanting_rules_value_base_chance_bp',
            key: 'value_base_chance_bp_key',
            element: {
              name: 'value',
              optional: false,
              kind: 'scalar',
              column: 'value',
              boolean: false,
            },
          },
          {
            name: 'powderBonusBp',
            optional: false,
            kind: 'record',
            table: 'game_content_enchanting_rules_value_powder_bonus_bp',
            key: 'value_powder_bonus_bp_key',
            element: {
              name: 'value',
              optional: false,
              kind: 'scalar',
              column: 'value',
              boolean: false,
            },
          },
          {
            name: 'recipes',
            optional: false,
            kind: 'record',
            table: 'game_content_enchanting_rules_value_recipes',
            key: 'value_recipes_key',
            element: {
              name: 'value',
              optional: false,
              kind: 'object',
              fields: [
                {
                  name: 'scrollCount',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_scroll_count',
                  boolean: false,
                },
                {
                  name: 'powderCount',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_powder_count',
                  boolean: false,
                },
                {
                  name: 'manaCost',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_mana_cost',
                  boolean: false,
                },
                {
                  name: 'burnManaCost',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_burn_mana_cost',
                  boolean: false,
                },
                {
                  name: 'burnChanceBp',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_burn_chance_bp',
                  boolean: false,
                },
              ],
            },
          },
          {
            name: 'manaHerbId',
            optional: false,
            kind: 'scalar',
            column: 'value_mana_herb_id',
            boolean: false,
          },
          {
            name: 'holyWaterId',
            optional: false,
            kind: 'scalar',
            column: 'value_holy_water_id',
            boolean: false,
          },
        ],
      },
    ],
  },
  quests: {
    table: 'game_content_quests',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'description',
        optional: false,
        kind: 'scalar',
        column: 'description',
        boolean: false,
      },
      {
        name: 'category',
        optional: false,
        kind: 'scalar',
        column: 'category',
        boolean: false,
      },
      {
        name: 'chapter',
        optional: true,
        kind: 'object',
        presence: 'chapter_present',
        fields: [
          {
            name: 'id',
            optional: false,
            kind: 'scalar',
            column: 'chapter_id',
            boolean: false,
          },
          {
            name: 'name',
            optional: false,
            kind: 'scalar',
            column: 'chapter_name',
            boolean: false,
          },
        ],
      },
      {
        name: 'generation',
        optional: true,
        kind: 'object',
        presence: 'generation_present',
        fields: [
          {
            name: 'id',
            optional: false,
            kind: 'scalar',
            column: 'generation_id',
            boolean: false,
          },
          {
            name: 'name',
            optional: false,
            kind: 'scalar',
            column: 'generation_name',
            boolean: false,
          },
        ],
      },
      {
        name: 'delivery',
        optional: false,
        kind: 'scalar',
        column: 'delivery',
        boolean: false,
      },
      {
        name: 'offerNpc',
        optional: true,
        kind: 'object',
        presence: 'offer_npc_present',
        fields: [
          {
            name: 'worldId',
            optional: false,
            kind: 'scalar',
            column: 'offer_npc_world_id',
            boolean: false,
          },
          {
            name: 'objectId',
            optional: false,
            kind: 'scalar',
            column: 'offer_npc_object_id',
            boolean: false,
          },
        ],
      },
      {
        name: 'claimNpc',
        optional: true,
        kind: 'object',
        presence: 'claim_npc_present',
        fields: [
          {
            name: 'worldId',
            optional: false,
            kind: 'scalar',
            column: 'claim_npc_world_id',
            boolean: false,
          },
          {
            name: 'objectId',
            optional: false,
            kind: 'scalar',
            column: 'claim_npc_object_id',
            boolean: false,
          },
        ],
      },
      {
        name: 'prerequisite',
        optional: true,
        kind: 'json',
        column: 'prerequisite',
      },
      {
        name: 'stages',
        optional: false,
        kind: 'array',
        table: 'game_content_quests_stages',
        key: 'stages_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'id',
              optional: false,
              kind: 'scalar',
              column: 'value_id',
              boolean: false,
            },
            {
              name: 'name',
              optional: false,
              kind: 'scalar',
              column: 'value_name',
              boolean: false,
            },
            {
              name: 'objectives',
              optional: false,
              kind: 'array',
              table: 'game_content_quests_stages_value_objectives',
              key: 'value_objectives_position',
              element: {
                name: 'value',
                optional: false,
                kind: 'object',
                fields: [
                  {
                    name: 'id',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_id',
                    boolean: false,
                  },
                  {
                    name: 'label',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_label',
                    boolean: false,
                  },
                  {
                    name: 'target',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_target',
                    boolean: false,
                  },
                  {
                    name: 'kind',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_kind',
                    boolean: false,
                  },
                  {
                    name: 'worldId',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_world_id',
                    boolean: false,
                  },
                  {
                    name: 'objectId',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_object_id',
                    boolean: false,
                  },
                  {
                    name: 'skillId',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_skill_id',
                    boolean: false,
                  },
                  {
                    name: 'allowDefeat',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_allow_defeat',
                    boolean: true,
                  },
                  {
                    name: 'mapId',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_map_id',
                    boolean: false,
                  },
                  {
                    name: 'dungeonId',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_dungeon_id',
                    boolean: false,
                  },
                  {
                    name: 'rank',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_rank',
                    boolean: false,
                  },
                  {
                    name: 'itemId',
                    optional: true,
                    kind: 'scalar',
                    column: 'value_item_id',
                    boolean: false,
                  },
                ],
              },
            },
          ],
        },
      },
      {
        name: 'rewards',
        optional: false,
        kind: 'object',
        fields: [
          {
            name: 'experience',
            optional: true,
            kind: 'scalar',
            column: 'rewards_experience',
            boolean: false,
          },
          {
            name: 'gold',
            optional: true,
            kind: 'scalar',
            column: 'rewards_gold',
            boolean: false,
          },
          {
            name: 'ap',
            optional: true,
            kind: 'scalar',
            column: 'rewards_ap',
            boolean: false,
          },
          {
            name: 'items',
            optional: true,
            kind: 'array',
            presence: 'rewards_items_present',
            table: 'game_content_quests_rewards_items',
            key: 'rewards_items_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'object',
              fields: [
                {
                  name: 'itemId',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_item_id',
                  boolean: false,
                },
                {
                  name: 'quantity',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_quantity',
                  boolean: false,
                },
              ],
            },
          },
          {
            name: 'skills',
            optional: true,
            kind: 'array',
            presence: 'rewards_skills_present',
            table: 'game_content_quests_rewards_skills',
            key: 'rewards_skills_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'scalar',
              column: 'value',
              boolean: false,
            },
          },
          {
            name: 'titles',
            optional: true,
            kind: 'array',
            presence: 'rewards_titles_present',
            table: 'game_content_quests_rewards_titles',
            key: 'rewards_titles_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'scalar',
              column: 'value',
              boolean: false,
            },
          },
          {
            name: 'flags',
            optional: true,
            kind: 'array',
            presence: 'rewards_flags_present',
            table: 'game_content_quests_rewards_flags',
            key: 'rewards_flags_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'scalar',
              column: 'value',
              boolean: false,
            },
          },
        ],
      },
    ],
  },
  titles: {
    table: 'game_content_titles',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'id',
        optional: false,
        kind: 'scalar',
        column: 'id',
        boolean: false,
      },
      {
        name: 'name',
        optional: false,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'description',
        optional: false,
        kind: 'scalar',
        column: 'description',
        boolean: false,
      },
      {
        name: 'slot',
        optional: false,
        kind: 'scalar',
        column: 'slot',
        boolean: false,
      },
      {
        name: 'category',
        optional: true,
        kind: 'scalar',
        column: 'category',
        boolean: false,
      },
      {
        name: 'spoiler',
        optional: true,
        kind: 'scalar',
        column: 'spoiler',
        boolean: false,
      },
      {
        name: 'hint',
        optional: true,
        kind: 'json',
        column: 'hint',
      },
      {
        name: 'award',
        optional: true,
        kind: 'json',
        column: 'award',
      },
      {
        name: 'discoveryFirst',
        optional: true,
        kind: 'scalar',
        column: 'discovery_first',
        boolean: true,
      },
      {
        name: 'eligibility',
        optional: true,
        kind: 'object',
        presence: 'eligibility_present',
        fields: [
          {
            name: 'skillId',
            optional: false,
            kind: 'scalar',
            column: 'eligibility_skill_id',
            boolean: false,
          },
          {
            name: 'rank',
            optional: false,
            kind: 'scalar',
            column: 'eligibility_rank',
            boolean: false,
          },
        ],
      },
      {
        name: 'effects',
        optional: true,
        kind: 'array',
        presence: 'effects_present',
        table: 'game_content_titles_effects',
        key: 'effects_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'stat',
              optional: false,
              kind: 'scalar',
              column: 'value_stat',
              boolean: false,
            },
            {
              name: 'value',
              optional: false,
              kind: 'scalar',
              column: 'value_value',
              boolean: false,
            },
          ],
        },
      },
    ],
  },
  questFlags: {
    table: 'game_content_quest_flags',
    keys: ['content_version', 'definition_id', 'position'],
    fields: [
      {
        name: 'value',
        optional: false,
        kind: 'scalar',
        column: 'value',
        boolean: false,
      },
    ],
  },
} as const satisfies Record<string, RelationalModel>;
export const catalogTables = [
  gameContentSkills,
  gameContentSkillsStatuses,
  gameContentSkillsGameRanks,
  gameContentSkillsGameRanksValueObjectives,
  gameContentEnemies,
  gameContentEnemiesSkills,
  gameContentEnemiesSpriteIdleFrames,
  gameContentEnemiesLoot,
  gameContentClasses,
  gameContentClassesSkills,
  gameContentClassesSpriteIdleFrames,
  gameContentItems,
  gameContentItemsWeaponTags,
  gameContentStatusEffects,
  gameContentAtlases,
  gameContentMaps,
  gameContentMapsSpawns,
  gameContentWorlds,
  gameContentWorldsDecorations,
  gameContentWorldsObjects,
  gameContentWorldsObjectsValueLessons,
  gameContentWorldsObjectsValueRequiresCleared,
  gameContentDungeons,
  gameContentDungeonsMonsterIds,
  gameContentDungeonsCompanionIds,
  gameContentDungeonsFountainIds,
  gameContentDungeonsOrdinaryRewards,
  gameContentDungeonsFinalRewards,
  gameContentShops,
  gameContentShopsItems,
  gameContentShopsBundles,
  gameContentSkillBookRecipes,
  gameContentSkillBookRecipesPages,
  gameContentEnchants,
  gameContentEnchantsKinds,
  gameContentEnchantsTags,
  gameContentEnchantsClauses,
  gameContentEnchantsClausesValueConditions,
  gameContentEnchantingRules,
  gameContentEnchantingRulesValueBaseChanceBp,
  gameContentEnchantingRulesValuePowderBonusBp,
  gameContentEnchantingRulesValueRecipes,
  gameContentQuests,
  gameContentQuestsStages,
  gameContentQuestsStagesValueObjectives,
  gameContentQuestsRewardsItems,
  gameContentQuestsRewardsSkills,
  gameContentQuestsRewardsTitles,
  gameContentQuestsRewardsFlags,
  gameContentTitles,
  gameContentTitlesEffects,
  gameContentQuestFlags,
];
