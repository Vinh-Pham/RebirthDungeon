// Typed encounter snapshots; no generic property/value storage.
import { gameEncounterActors } from './encounters.js';
import { gameCharacters } from './characters.js';
import {
  gameContentItems,
  gameContentSkills,
  gameContentStatusEffects,
  gameContentEnchants,
  gameContentClasses,
  gameContentAtlases,
} from './catalog.js';
import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  foreignKey,
  check,
  type SQLiteTableExtraConfigValue,
} from 'drizzle-orm/sqlite-core';
import type { RelationalModel } from '../../relational-model.js';

export const gameEncounterActorState = sqliteTable(
  'game_encounter_actor_state',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    content_version: text('content_version').notNull(),
    id: text('id').notNull(),
    name: text('name'),
    inventory_present: integer('inventory_present').notNull(),
    item_hotbar_present: integer('item_hotbar_present').notNull(),
    ammunition_item_id: text('ammunition_item_id'),
    weapon_present: integer('weapon_present').notNull(),
    weapon_item_id: text('weapon_item_id'),
    weapon_durability: integer('weapon_durability'),
    weapon_locked: integer('weapon_locked'),
    weapon_prefix_present: integer('weapon_prefix_present').notNull(),
    weapon_prefix_enchant_id: text('weapon_prefix_enchant_id'),
    weapon_suffix_present: integer('weapon_suffix_present').notNull(),
    weapon_suffix_enchant_id: text('weapon_suffix_enchant_id'),
    weapon_id: text('weapon_id'),
    statuses_present: integer('statuses_present').notNull(),
    stamina_present: integer('stamina_present').notNull(),
    stamina_current: integer('stamina_current'),
    stamina_max: integer('stamina_max'),
    mana_present: integer('mana_present').notNull(),
    mana_current: integer('mana_current'),
    mana_max: integer('mana_max'),
    health_present: integer('health_present').notNull(),
    health_current: integer('health_current'),
    health_max: integer('health_max'),
    wounds: integer('wounds'),
    fullness: real('fullness'),
    skills_present: integer('skills_present').notNull(),
    learned_skills_present: integer('learned_skills_present').notNull(),
    cooldowns_present: integer('cooldowns_present').notNull(),
    position_present: integer('position_present').notNull(),
    position_x: integer('position_x'),
    position_y: integer('position_y'),
    sprite_present: integer('sprite_present').notNull(),
    sprite_atlas: text('sprite_atlas'),
    sprite_frame: integer('sprite_frame'),
    sprite_idle_frames_present: integer('sprite_idle_frames_present').notNull(),
    combatant_present: integer('combatant_present').notNull(),
    combatant_attack: integer('combatant_attack'),
    combatant_defense: integer('combatant_defense'),
    combatant_speed: integer('combatant_speed'),
    combatant_min_damage: real('combatant_min_damage'),
    combatant_max_damage: real('combatant_max_damage'),
    combatant_balance: real('combatant_balance'),
    combatant_magic_attack: real('combatant_magic_attack'),
    combatant_magic_defense: real('combatant_magic_defense'),
    combatant_protection: real('combatant_protection'),
    combatant_magic_protection: real('combatant_magic_protection'),
    combatant_magic_balance: real('combatant_magic_balance'),
    combatant_critical_rating: real('combatant_critical_rating'),
    combatant_magic_critical_chance: real('combatant_magic_critical_chance'),
    combatant_min_injury: real('combatant_min_injury'),
    combatant_max_injury: real('combatant_max_injury'),
    combatant_armor_pierce: real('combatant_armor_pierce'),
    combatant_hit_chance: real('combatant_hit_chance'),
    combatant_evasion: real('combatant_evasion'),
    combatant_critical_chance: real('combatant_critical_chance'),
    combatant_critical_multiplier: real('combatant_critical_multiplier'),
    dead: integer('dead'),
    player: integer('player'),
    enemy: integer('enemy'),
    battle_a_i_present: integer('battle_a_i_present').notNull(),
    battle_a_i_engine_id: text('battle_a_i_engine_id'),
    battle_a_i_config: text('battle_a_i_config'),
    stat_source_present: integer('stat_source_present').notNull(),
    stat_source_class_id: text('stat_source_class_id'),
    stat_source_level: integer('stat_source_level'),
    stat_source_growth_talent: text('stat_source_growth_talent'),
    stat_source_weapon_item_id: text('stat_source_weapon_item_id'),
    stat_source_ammunition_item_id: text('stat_source_ammunition_item_id'),
    stat_source_armor_item_id: text('stat_source_armor_item_id'),
    stat_source_enchantments_present: integer(
      'stat_source_enchantments_present',
    ).notNull(),
    stat_source_titles_present: integer('stat_source_titles_present').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.character_id, t.actor_id] }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActors.character_id,
        gameEncounterActors.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.ammunition_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.weapon_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.weapon_prefix_enchant_id],
      foreignColumns: [
        gameContentEnchants.content_version,
        gameContentEnchants.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.weapon_suffix_enchant_id],
      foreignColumns: [
        gameContentEnchants.content_version,
        gameContentEnchants.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.sprite_atlas],
      foreignColumns: [
        gameContentAtlases.content_version,
        gameContentAtlases.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.stat_source_class_id],
      foreignColumns: [
        gameContentClasses.content_version,
        gameContentClasses.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.stat_source_weapon_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.stat_source_ammunition_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    foreignKey({
      columns: [t.content_version, t.stat_source_armor_item_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    check(
      'game_encounter_actor_state_check_0',
      sql`(inventory_present IS NULL OR inventory_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_1',
      sql`(item_hotbar_present IS NULL OR item_hotbar_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_2',
      sql`(weapon_present IS NULL OR weapon_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_3',
      sql`(weapon_durability IS NULL OR weapon_durability >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_4',
      sql`(weapon_durability IS NULL OR weapon_durability <= 10000)`,
    ),
    check(
      'game_encounter_actor_state_check_5',
      sql`(weapon_locked IS NULL OR weapon_locked IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_6',
      sql`(weapon_prefix_present IS NULL OR weapon_prefix_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_7',
      sql`(weapon_suffix_present IS NULL OR weapon_suffix_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_8',
      sql`(statuses_present IS NULL OR statuses_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_9',
      sql`(stamina_present IS NULL OR stamina_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_10',
      sql`(stamina_current IS NULL OR stamina_current >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_11',
      sql`(stamina_current IS NULL OR stamina_current <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_12',
      sql`(stamina_max IS NULL OR stamina_max >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_13',
      sql`(stamina_max IS NULL OR stamina_max <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_14',
      sql`(mana_present IS NULL OR mana_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_15',
      sql`(mana_current IS NULL OR mana_current >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_16',
      sql`(mana_current IS NULL OR mana_current <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_17',
      sql`(mana_max IS NULL OR mana_max >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_18',
      sql`(mana_max IS NULL OR mana_max <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_19',
      sql`(health_present IS NULL OR health_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_20',
      sql`(health_current IS NULL OR health_current >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_21',
      sql`(health_current IS NULL OR health_current <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_22',
      sql`(health_max IS NULL OR health_max >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_23',
      sql`(health_max IS NULL OR health_max <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_24',
      sql`(wounds IS NULL OR wounds >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_25',
      sql`(wounds IS NULL OR wounds <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_26',
      sql`(fullness IS NULL OR fullness >= 50)`,
    ),
    check(
      'game_encounter_actor_state_check_27',
      sql`(fullness IS NULL OR fullness <= 100)`,
    ),
    check(
      'game_encounter_actor_state_check_28',
      sql`(skills_present IS NULL OR skills_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_29',
      sql`(learned_skills_present IS NULL OR learned_skills_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_30',
      sql`(cooldowns_present IS NULL OR cooldowns_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_31',
      sql`(position_present IS NULL OR position_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_32',
      sql`(position_x IS NULL OR position_x >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_33',
      sql`(position_x IS NULL OR position_x <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_34',
      sql`(position_y IS NULL OR position_y >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_35',
      sql`(position_y IS NULL OR position_y <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_36',
      sql`(sprite_present IS NULL OR sprite_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_37',
      sql`(sprite_frame IS NULL OR sprite_frame >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_38',
      sql`(sprite_frame IS NULL OR sprite_frame <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_39',
      sql`(sprite_idle_frames_present IS NULL OR sprite_idle_frames_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_40',
      sql`(combatant_present IS NULL OR combatant_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_41',
      sql`(combatant_attack IS NULL OR combatant_attack >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_42',
      sql`(combatant_attack IS NULL OR combatant_attack <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_43',
      sql`(combatant_defense IS NULL OR combatant_defense >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_44',
      sql`(combatant_defense IS NULL OR combatant_defense <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_45',
      sql`(combatant_speed IS NULL OR combatant_speed >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_46',
      sql`(combatant_speed IS NULL OR combatant_speed <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_check_47',
      sql`(combatant_min_damage IS NULL OR combatant_min_damage >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_48',
      sql`(combatant_max_damage IS NULL OR combatant_max_damage >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_49',
      sql`(combatant_balance IS NULL OR combatant_balance >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_50',
      sql`(combatant_magic_attack IS NULL OR combatant_magic_attack >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_51',
      sql`(combatant_magic_defense IS NULL OR combatant_magic_defense >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_52',
      sql`(combatant_protection IS NULL OR combatant_protection >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_53',
      sql`(combatant_magic_protection IS NULL OR combatant_magic_protection >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_54',
      sql`(combatant_magic_balance IS NULL OR combatant_magic_balance >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_55',
      sql`(combatant_critical_rating IS NULL OR combatant_critical_rating >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_56',
      sql`(combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_57',
      sql`(combatant_min_injury IS NULL OR combatant_min_injury >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_58',
      sql`(combatant_max_injury IS NULL OR combatant_max_injury >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_59',
      sql`(combatant_armor_pierce IS NULL OR combatant_armor_pierce >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_60',
      sql`(combatant_hit_chance IS NULL OR combatant_hit_chance >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_61',
      sql`(combatant_evasion IS NULL OR combatant_evasion >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_62',
      sql`(combatant_critical_chance IS NULL OR combatant_critical_chance >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_63',
      sql`(combatant_critical_multiplier IS NULL OR combatant_critical_multiplier >= 0)`,
    ),
    check(
      'game_encounter_actor_state_check_64',
      sql`(dead IS NULL OR dead IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_65',
      sql`(dead IS NULL OR dead IN (1))`,
    ),
    check(
      'game_encounter_actor_state_check_66',
      sql`(player IS NULL OR player IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_67',
      sql`(player IS NULL OR player IN (1))`,
    ),
    check(
      'game_encounter_actor_state_check_68',
      sql`(enemy IS NULL OR enemy IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_69',
      sql`(enemy IS NULL OR enemy IN (1))`,
    ),
    check(
      'game_encounter_actor_state_check_70',
      sql`(battle_a_i_present IS NULL OR battle_a_i_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_71',
      sql`(battle_a_i_config IS NULL OR json_valid(battle_a_i_config))`,
    ),
    check(
      'game_encounter_actor_state_check_72',
      sql`(stat_source_present IS NULL OR stat_source_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_73',
      sql`(stat_source_level IS NULL OR stat_source_level >= 1)`,
    ),
    check(
      'game_encounter_actor_state_check_74',
      sql`(stat_source_level IS NULL OR stat_source_level <= 200)`,
    ),
    check(
      'game_encounter_actor_state_check_75',
      sql`(stat_source_growth_talent IS NULL OR stat_source_growth_talent IN ('warrior','archery','mage'))`,
    ),
    check(
      'game_encounter_actor_state_check_76',
      sql`(stat_source_enchantments_present IS NULL OR stat_source_enchantments_present IN (0,1))`,
    ),
    check(
      'game_encounter_actor_state_check_77',
      sql`(stat_source_titles_present IS NULL OR stat_source_titles_present IN (0,1))`,
    ),
  ],
);

export const gameEncounterActorStateInventory = sqliteTable(
  'game_encounter_actor_state_inventory',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    inventory_key: text('inventory_key').notNull(),
    content_version: text('content_version').notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.inventory_key] }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.inventory_key],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
    check(
      'game_encounter_actor_state_inventory_check_0',
      sql`(value IS NULL OR value >= 1)`,
    ),
    check(
      'game_encounter_actor_state_inventory_check_1',
      sql`(value IS NULL OR value <= 999)`,
    ),
  ],
);

export const gameEncounterActorStateItemHotbar = sqliteTable(
  'game_encounter_actor_state_item_hotbar',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    item_hotbar_position: integer('item_hotbar_position').notNull(),
    content_version: text('content_version').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [t.character_id, t.actor_id, t.item_hotbar_position],
    }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
  ],
);

export const gameEncounterActorStateWeaponPrefixValues = sqliteTable(
  'game_encounter_actor_state_weapon_prefix_values',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    weapon_prefix_values_key: text('weapon_prefix_values_key').notNull(),
    content_version: text('content_version').notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [t.character_id, t.actor_id, t.weapon_prefix_values_key],
    }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    check(
      'game_encounter_actor_state_weapon_prefix_values_check_0',
      sql`(value IS NULL OR value >= -1000)`,
    ),
    check(
      'game_encounter_actor_state_weapon_prefix_values_check_1',
      sql`(value IS NULL OR value <= 1000)`,
    ),
  ],
);

export const gameEncounterActorStateWeaponSuffixValues = sqliteTable(
  'game_encounter_actor_state_weapon_suffix_values',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    weapon_suffix_values_key: text('weapon_suffix_values_key').notNull(),
    content_version: text('content_version').notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [t.character_id, t.actor_id, t.weapon_suffix_values_key],
    }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    check(
      'game_encounter_actor_state_weapon_suffix_values_check_0',
      sql`(value IS NULL OR value >= -1000)`,
    ),
    check(
      'game_encounter_actor_state_weapon_suffix_values_check_1',
      sql`(value IS NULL OR value <= 1000)`,
    ),
  ],
);

export const gameEncounterActorStateStatuses = sqliteTable(
  'game_encounter_actor_state_statuses',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    statuses_position: integer('statuses_position').notNull(),
    content_version: text('content_version').notNull(),
    value_id: text('value_id').notNull(),
    value_source_id: text('value_source_id').notNull(),
    value_remaining_turns: integer('value_remaining_turns').notNull(),
    value_stacks: integer('value_stacks').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.statuses_position] }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_id],
      foreignColumns: [
        gameContentStatusEffects.content_version,
        gameContentStatusEffects.definition_id,
      ],
    }),
    check(
      'game_encounter_actor_state_statuses_check_0',
      sql`(value_remaining_turns IS NULL OR value_remaining_turns >= 0)`,
    ),
    check(
      'game_encounter_actor_state_statuses_check_1',
      sql`(value_remaining_turns IS NULL OR value_remaining_turns <= 9007199254740991)`,
    ),
    check(
      'game_encounter_actor_state_statuses_check_2',
      sql`(value_stacks IS NULL OR value_stacks >= 1)`,
    ),
    check(
      'game_encounter_actor_state_statuses_check_3',
      sql`(value_stacks IS NULL OR value_stacks <= 10)`,
    ),
  ],
);

export const gameEncounterActorStateSkills = sqliteTable(
  'game_encounter_actor_state_skills',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    skills_position: integer('skills_position').notNull(),
    content_version: text('content_version').notNull(),
    value: text('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.skills_position] }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
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

export const gameEncounterActorStateLearnedSkills = sqliteTable(
  'game_encounter_actor_state_learned_skills',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    learned_skills_key: text('learned_skills_key').notNull(),
    content_version: text('content_version').notNull(),
    value_rank: text('value_rank').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.learned_skills_key] }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.learned_skills_key],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    check(
      'game_encounter_actor_state_learned_skills_check_0',
      sql`(value_rank IS NULL OR value_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))`,
    ),
  ],
);

export const gameEncounterActorStateLearnedSkillsValueObjectiveCounts =
  sqliteTable(
    'game_encounter_actor_state_learned_skills_value_objective_counts',
    {
      character_id: text('character_id').notNull(),
      actor_id: text('actor_id').notNull(),
      learned_skills_key: text('learned_skills_key').notNull(),
      value_objective_counts_key: text('value_objective_counts_key').notNull(),
      content_version: text('content_version').notNull(),
      value: integer('value').notNull(),
    },
    (t): SQLiteTableExtraConfigValue[] => [
      primaryKey({
        columns: [
          t.character_id,
          t.actor_id,
          t.learned_skills_key,
          t.value_objective_counts_key,
        ],
      }),
      foreignKey({
        columns: [t.character_id, t.actor_id, t.learned_skills_key],
        foreignColumns: [
          gameEncounterActorStateLearnedSkills.character_id,
          gameEncounterActorStateLearnedSkills.actor_id,
          gameEncounterActorStateLearnedSkills.learned_skills_key,
        ],
      }).onDelete('cascade'),
      foreignKey({
        columns: [t.character_id, t.content_version],
        foreignColumns: [gameCharacters.id, gameCharacters.content_version],
      }).onDelete('cascade'),
      foreignKey({
        columns: [t.content_version, t.learned_skills_key],
        foreignColumns: [
          gameContentSkills.content_version,
          gameContentSkills.definition_id,
        ],
      }),
      check(
        'game_encounter_actor_state_learned_skills_value_objective_counts_check_0',
        sql`(value IS NULL OR value >= 0)`,
      ),
      check(
        'game_encounter_actor_state_learned_skills_value_objective_counts_check_1',
        sql`(value IS NULL OR value <= 1000)`,
      ),
    ],
  );

export const gameEncounterActorStateCooldowns = sqliteTable(
  'game_encounter_actor_state_cooldowns',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    cooldowns_key: text('cooldowns_key').notNull(),
    content_version: text('content_version').notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({ columns: [t.character_id, t.actor_id, t.cooldowns_key] }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.cooldowns_key],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    check(
      'game_encounter_actor_state_cooldowns_check_0',
      sql`(value IS NULL OR value >= 0)`,
    ),
    check(
      'game_encounter_actor_state_cooldowns_check_1',
      sql`(value IS NULL OR value <= 9007199254740991)`,
    ),
  ],
);

export const gameEncounterActorStateSpriteIdleFrames = sqliteTable(
  'game_encounter_actor_state_sprite_idle_frames',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    sprite_idle_frames_position: integer(
      'sprite_idle_frames_position',
    ).notNull(),
    content_version: text('content_version').notNull(),
    value: integer('value').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [t.character_id, t.actor_id, t.sprite_idle_frames_position],
    }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    check(
      'game_encounter_actor_state_sprite_idle_frames_check_0',
      sql`(value IS NULL OR value >= 0)`,
    ),
    check(
      'game_encounter_actor_state_sprite_idle_frames_check_1',
      sql`(value IS NULL OR value <= 9007199254740991)`,
    ),
  ],
);

export const gameEncounterActorStateStatSourceEnchantments = sqliteTable(
  'game_encounter_actor_state_stat_source_enchantments',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    stat_source_enchantments_position: integer(
      'stat_source_enchantments_position',
    ).notNull(),
    content_version: text('content_version').notNull(),
    value_source_id: text('value_source_id').notNull(),
    value_name: text('value_name').notNull(),
    value_stat: text('value_stat').notNull(),
    value_value: integer('value_value').notNull(),
    value_active: integer('value_active').notNull(),
    value_condition: text('value_condition').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [
        t.character_id,
        t.actor_id,
        t.stat_source_enchantments_position,
      ],
    }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    check(
      'game_encounter_actor_state_stat_source_enchantments_check_0',
      sql`(value_stat IS NULL OR value_stat IN ('strength','intelligence','dexterity','will','luck','maxHealth','maxMana','maxStamina','physicalAttack','magicAttack','defense','protection','magicDefense','magicProtection'))`,
    ),
    check(
      'game_encounter_actor_state_stat_source_enchantments_check_1',
      sql`(value_value IS NULL OR value_value >= -1000)`,
    ),
    check(
      'game_encounter_actor_state_stat_source_enchantments_check_2',
      sql`(value_value IS NULL OR value_value <= 1000)`,
    ),
    check(
      'game_encounter_actor_state_stat_source_enchantments_check_3',
      sql`(value_active IS NULL OR value_active IN (0,1))`,
    ),
  ],
);

export const gameEncounterActorStateStatSourceTitles = sqliteTable(
  'game_encounter_actor_state_stat_source_titles',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    stat_source_titles_position: integer(
      'stat_source_titles_position',
    ).notNull(),
    content_version: text('content_version').notNull(),
    value_source_id: text('value_source_id').notNull(),
    value_name: text('value_name').notNull(),
    value_stat: text('value_stat').notNull(),
    value_value: integer('value_value').notNull(),
    value_active: integer('value_active').notNull(),
    value_condition: text('value_condition').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [t.character_id, t.actor_id, t.stat_source_titles_position],
    }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    check(
      'game_encounter_actor_state_stat_source_titles_check_0',
      sql`(value_stat IS NULL OR value_stat IN ('strength','intelligence','dexterity','will','luck','maxHealth','maxMana','maxStamina','physicalAttack','magicAttack','defense','protection','magicDefense','magicProtection'))`,
    ),
    check(
      'game_encounter_actor_state_stat_source_titles_check_1',
      sql`(value_value IS NULL OR value_value >= -1000)`,
    ),
    check(
      'game_encounter_actor_state_stat_source_titles_check_2',
      sql`(value_value IS NULL OR value_value <= 1000)`,
    ),
    check(
      'game_encounter_actor_state_stat_source_titles_check_3',
      sql`(value_active IS NULL OR value_active IN (0,1))`,
    ),
  ],
);

export const gameEncounterActorStateStatSourceEffects = sqliteTable(
  'game_encounter_actor_state_stat_source_effects',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    stat_source_effects_position: integer(
      'stat_source_effects_position',
    ).notNull(),
    content_version: text('content_version').notNull(),
    value_status_id: text('value_status_id').notNull(),
    value_stacks: integer('value_stacks').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [t.character_id, t.actor_id, t.stat_source_effects_position],
    }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.value_status_id],
      foreignColumns: [
        gameContentStatusEffects.content_version,
        gameContentStatusEffects.definition_id,
      ],
    }),
    check(
      'game_encounter_actor_state_stat_source_effects_check_0',
      sql`(value_stacks IS NULL OR value_stacks >= 1)`,
    ),
    check(
      'game_encounter_actor_state_stat_source_effects_check_1',
      sql`(value_stacks IS NULL OR value_stacks <= 10)`,
    ),
  ],
);

export const gameEncounterActorStateStatSourceLearnedSkills = sqliteTable(
  'game_encounter_actor_state_stat_source_learned_skills',
  {
    character_id: text('character_id').notNull(),
    actor_id: text('actor_id').notNull(),
    stat_source_learned_skills_key: text(
      'stat_source_learned_skills_key',
    ).notNull(),
    content_version: text('content_version').notNull(),
    value_rank: text('value_rank').notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    primaryKey({
      columns: [t.character_id, t.actor_id, t.stat_source_learned_skills_key],
    }),
    foreignKey({
      columns: [t.character_id, t.actor_id],
      foreignColumns: [
        gameEncounterActorState.character_id,
        gameEncounterActorState.actor_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.stat_source_learned_skills_key],
      foreignColumns: [
        gameContentSkills.content_version,
        gameContentSkills.definition_id,
      ],
    }),
    check(
      'game_encounter_actor_state_stat_source_learned_skills_check_0',
      sql`(value_rank IS NULL OR value_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))`,
    ),
  ],
);

export const gameEncounterActorStateStatSourceLearnedSkillsValueObjectiveCounts =
  sqliteTable(
    'game_encounter_actor_state_stat_source_learned_skills_value_objective_counts',
    {
      character_id: text('character_id').notNull(),
      actor_id: text('actor_id').notNull(),
      stat_source_learned_skills_key: text(
        'stat_source_learned_skills_key',
      ).notNull(),
      value_objective_counts_key: text('value_objective_counts_key').notNull(),
      content_version: text('content_version').notNull(),
      value: integer('value').notNull(),
    },
    (t): SQLiteTableExtraConfigValue[] => [
      primaryKey({
        columns: [
          t.character_id,
          t.actor_id,
          t.stat_source_learned_skills_key,
          t.value_objective_counts_key,
        ],
      }),
      foreignKey({
        columns: [t.character_id, t.actor_id, t.stat_source_learned_skills_key],
        foreignColumns: [
          gameEncounterActorStateStatSourceLearnedSkills.character_id,
          gameEncounterActorStateStatSourceLearnedSkills.actor_id,
          gameEncounterActorStateStatSourceLearnedSkills.stat_source_learned_skills_key,
        ],
      }).onDelete('cascade'),
      foreignKey({
        columns: [t.character_id, t.content_version],
        foreignColumns: [gameCharacters.id, gameCharacters.content_version],
      }).onDelete('cascade'),
      foreignKey({
        columns: [t.content_version, t.stat_source_learned_skills_key],
        foreignColumns: [
          gameContentSkills.content_version,
          gameContentSkills.definition_id,
        ],
      }),
      check(
        'game_encounter_actor_state_stat_source_learned_skills_value_objective_counts_check_0',
        sql`(value IS NULL OR value >= 0)`,
      ),
      check(
        'game_encounter_actor_state_stat_source_learned_skills_value_objective_counts_check_1',
        sql`(value IS NULL OR value <= 1000)`,
      ),
    ],
  );

export const actorsModels = {
  actor: {
    table: 'game_encounter_actor_state',
    keys: ['character_id', 'actor_id'],
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
        optional: true,
        kind: 'scalar',
        column: 'name',
        boolean: false,
      },
      {
        name: 'inventory',
        optional: true,
        kind: 'record',
        presence: 'inventory_present',
        table: 'game_encounter_actor_state_inventory',
        key: 'inventory_key',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'itemHotbar',
        optional: true,
        kind: 'array',
        presence: 'item_hotbar_present',
        table: 'game_encounter_actor_state_item_hotbar',
        key: 'item_hotbar_position',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'ammunitionItemId',
        optional: true,
        kind: 'scalar',
        column: 'ammunition_item_id',
        boolean: false,
      },
      {
        name: 'weapon',
        optional: true,
        kind: 'object',
        presence: 'weapon_present',
        fields: [
          {
            name: 'itemId',
            optional: false,
            kind: 'scalar',
            column: 'weapon_item_id',
            boolean: false,
          },
          {
            name: 'durability',
            optional: false,
            kind: 'scalar',
            column: 'weapon_durability',
            boolean: false,
          },
          {
            name: 'locked',
            optional: true,
            kind: 'scalar',
            column: 'weapon_locked',
            boolean: true,
          },
          {
            name: 'prefix',
            optional: true,
            kind: 'object',
            presence: 'weapon_prefix_present',
            fields: [
              {
                name: 'enchantId',
                optional: false,
                kind: 'scalar',
                column: 'weapon_prefix_enchant_id',
                boolean: false,
              },
              {
                name: 'values',
                optional: false,
                kind: 'record',
                table: 'game_encounter_actor_state_weapon_prefix_values',
                key: 'weapon_prefix_values_key',
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
            name: 'suffix',
            optional: true,
            kind: 'object',
            presence: 'weapon_suffix_present',
            fields: [
              {
                name: 'enchantId',
                optional: false,
                kind: 'scalar',
                column: 'weapon_suffix_enchant_id',
                boolean: false,
              },
              {
                name: 'values',
                optional: false,
                kind: 'record',
                table: 'game_encounter_actor_state_weapon_suffix_values',
                key: 'weapon_suffix_values_key',
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
            name: 'id',
            optional: false,
            kind: 'scalar',
            column: 'weapon_id',
            boolean: false,
          },
        ],
      },
      {
        name: 'statuses',
        optional: true,
        kind: 'array',
        presence: 'statuses_present',
        table: 'game_encounter_actor_state_statuses',
        key: 'statuses_position',
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
              name: 'sourceId',
              optional: false,
              kind: 'scalar',
              column: 'value_source_id',
              boolean: false,
            },
            {
              name: 'remainingTurns',
              optional: false,
              kind: 'scalar',
              column: 'value_remaining_turns',
              boolean: false,
            },
            {
              name: 'stacks',
              optional: false,
              kind: 'scalar',
              column: 'value_stacks',
              boolean: false,
            },
          ],
        },
      },
      {
        name: 'stamina',
        optional: true,
        kind: 'object',
        presence: 'stamina_present',
        fields: [
          {
            name: 'current',
            optional: false,
            kind: 'scalar',
            column: 'stamina_current',
            boolean: false,
          },
          {
            name: 'max',
            optional: false,
            kind: 'scalar',
            column: 'stamina_max',
            boolean: false,
          },
        ],
      },
      {
        name: 'mana',
        optional: true,
        kind: 'object',
        presence: 'mana_present',
        fields: [
          {
            name: 'current',
            optional: false,
            kind: 'scalar',
            column: 'mana_current',
            boolean: false,
          },
          {
            name: 'max',
            optional: false,
            kind: 'scalar',
            column: 'mana_max',
            boolean: false,
          },
        ],
      },
      {
        name: 'health',
        optional: true,
        kind: 'object',
        presence: 'health_present',
        fields: [
          {
            name: 'current',
            optional: false,
            kind: 'scalar',
            column: 'health_current',
            boolean: false,
          },
          {
            name: 'max',
            optional: false,
            kind: 'scalar',
            column: 'health_max',
            boolean: false,
          },
        ],
      },
      {
        name: 'wounds',
        optional: true,
        kind: 'scalar',
        column: 'wounds',
        boolean: false,
      },
      {
        name: 'fullness',
        optional: true,
        kind: 'scalar',
        column: 'fullness',
        boolean: false,
      },
      {
        name: 'skills',
        optional: true,
        kind: 'array',
        presence: 'skills_present',
        table: 'game_encounter_actor_state_skills',
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
        name: 'learnedSkills',
        optional: true,
        kind: 'record',
        presence: 'learned_skills_present',
        table: 'game_encounter_actor_state_learned_skills',
        key: 'learned_skills_key',
        element: {
          name: 'value',
          optional: false,
          kind: 'object',
          fields: [
            {
              name: 'rank',
              optional: false,
              kind: 'scalar',
              column: 'value_rank',
              boolean: false,
            },
            {
              name: 'objectiveCounts',
              optional: false,
              kind: 'record',
              table:
                'game_encounter_actor_state_learned_skills_value_objective_counts',
              key: 'value_objective_counts_key',
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
      },
      {
        name: 'cooldowns',
        optional: true,
        kind: 'record',
        presence: 'cooldowns_present',
        table: 'game_encounter_actor_state_cooldowns',
        key: 'cooldowns_key',
        element: {
          name: 'value',
          optional: false,
          kind: 'scalar',
          column: 'value',
          boolean: false,
        },
      },
      {
        name: 'position',
        optional: true,
        kind: 'object',
        presence: 'position_present',
        fields: [
          {
            name: 'x',
            optional: false,
            kind: 'scalar',
            column: 'position_x',
            boolean: false,
          },
          {
            name: 'y',
            optional: false,
            kind: 'scalar',
            column: 'position_y',
            boolean: false,
          },
        ],
      },
      {
        name: 'sprite',
        optional: true,
        kind: 'object',
        presence: 'sprite_present',
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
            table: 'game_encounter_actor_state_sprite_idle_frames',
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
        name: 'combatant',
        optional: true,
        kind: 'object',
        presence: 'combatant_present',
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
            name: 'criticalRating',
            optional: true,
            kind: 'scalar',
            column: 'combatant_critical_rating',
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
        name: 'dead',
        optional: true,
        kind: 'scalar',
        column: 'dead',
        boolean: true,
      },
      {
        name: 'player',
        optional: true,
        kind: 'scalar',
        column: 'player',
        boolean: true,
      },
      {
        name: 'enemy',
        optional: true,
        kind: 'scalar',
        column: 'enemy',
        boolean: true,
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
        name: 'statSource',
        optional: true,
        kind: 'object',
        presence: 'stat_source_present',
        fields: [
          {
            name: 'classId',
            optional: false,
            kind: 'scalar',
            column: 'stat_source_class_id',
            boolean: false,
          },
          {
            name: 'level',
            optional: false,
            kind: 'scalar',
            column: 'stat_source_level',
            boolean: false,
          },
          {
            name: 'growthTalent',
            optional: false,
            kind: 'scalar',
            column: 'stat_source_growth_talent',
            boolean: false,
          },
          {
            name: 'weaponItemId',
            optional: true,
            kind: 'scalar',
            column: 'stat_source_weapon_item_id',
            boolean: false,
          },
          {
            name: 'ammunitionItemId',
            optional: true,
            kind: 'scalar',
            column: 'stat_source_ammunition_item_id',
            boolean: false,
          },
          {
            name: 'armorItemId',
            optional: true,
            kind: 'scalar',
            column: 'stat_source_armor_item_id',
            boolean: false,
          },
          {
            name: 'enchantments',
            optional: true,
            kind: 'array',
            presence: 'stat_source_enchantments_present',
            table: 'game_encounter_actor_state_stat_source_enchantments',
            key: 'stat_source_enchantments_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'object',
              fields: [
                {
                  name: 'sourceId',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_source_id',
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
                {
                  name: 'active',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_active',
                  boolean: true,
                },
                {
                  name: 'condition',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_condition',
                  boolean: false,
                },
              ],
            },
          },
          {
            name: 'titles',
            optional: true,
            kind: 'array',
            presence: 'stat_source_titles_present',
            table: 'game_encounter_actor_state_stat_source_titles',
            key: 'stat_source_titles_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'object',
              fields: [
                {
                  name: 'sourceId',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_source_id',
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
                {
                  name: 'active',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_active',
                  boolean: true,
                },
                {
                  name: 'condition',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_condition',
                  boolean: false,
                },
              ],
            },
          },
          {
            name: 'effects',
            optional: false,
            kind: 'array',
            table: 'game_encounter_actor_state_stat_source_effects',
            key: 'stat_source_effects_position',
            element: {
              name: 'value',
              optional: false,
              kind: 'object',
              fields: [
                {
                  name: 'statusId',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_status_id',
                  boolean: false,
                },
                {
                  name: 'stacks',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_stacks',
                  boolean: false,
                },
              ],
            },
          },
          {
            name: 'learnedSkills',
            optional: false,
            kind: 'record',
            table: 'game_encounter_actor_state_stat_source_learned_skills',
            key: 'stat_source_learned_skills_key',
            element: {
              name: 'value',
              optional: false,
              kind: 'object',
              fields: [
                {
                  name: 'rank',
                  optional: false,
                  kind: 'scalar',
                  column: 'value_rank',
                  boolean: false,
                },
                {
                  name: 'objectiveCounts',
                  optional: false,
                  kind: 'record',
                  table:
                    'game_encounter_actor_state_stat_source_learned_skills_value_objective_counts',
                  key: 'value_objective_counts_key',
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
          },
        ],
      },
    ],
  },
} as const satisfies Record<string, RelationalModel>;
export const actorsTables = [
  gameEncounterActorState,
  gameEncounterActorStateInventory,
  gameEncounterActorStateItemHotbar,
  gameEncounterActorStateWeaponPrefixValues,
  gameEncounterActorStateWeaponSuffixValues,
  gameEncounterActorStateStatuses,
  gameEncounterActorStateSkills,
  gameEncounterActorStateLearnedSkills,
  gameEncounterActorStateLearnedSkillsValueObjectiveCounts,
  gameEncounterActorStateCooldowns,
  gameEncounterActorStateSpriteIdleFrames,
  gameEncounterActorStateStatSourceEnchantments,
  gameEncounterActorStateStatSourceTitles,
  gameEncounterActorStateStatSourceEffects,
  gameEncounterActorStateStatSourceLearnedSkills,
  gameEncounterActorStateStatSourceLearnedSkillsValueObjectiveCounts,
];
