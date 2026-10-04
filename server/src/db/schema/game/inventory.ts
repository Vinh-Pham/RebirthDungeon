import { gameContentEnchants, gameContentItems } from './catalog.js';
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

export const gameInventoryMetadata = sqliteTable(
  'game_inventory_metadata',
  {
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    next_weapon_id: integer('next_weapon_id').notNull(),
    next_armor_id: integer('next_armor_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.character_id] }),
    check('game_inventory_metadata_check_10', sql`next_weapon_id >= 1`),
    check('game_inventory_metadata_check_11', sql`next_armor_id >= 1`),
  ],
);

export const gameInventoryStacks = sqliteTable(
  'game_inventory_stacks',
  {
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull(),
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
    primaryKey({ columns: [t.character_id, t.item_id] }),
    check('game_inventory_stacks_check_0', sql`quantity BETWEEN 1 AND 999`),
  ],
);

export const gameEquipmentInstances = sqliteTable(
  'game_equipment_instances',
  {
    content_version: text('content_version').notNull(),
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
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.definition_id],
      foreignColumns: [
        gameContentItems.content_version,
        gameContentItems.definition_id,
      ],
    }),
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
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    instance_id: text('instance_id').notNull(),
    slot: text('slot').notNull(),
    enchant_id: text('enchant_id').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.character_id, t.content_version],
      foreignColumns: [gameCharacters.id, gameCharacters.content_version],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.content_version, t.enchant_id],
      foreignColumns: [
        gameContentEnchants.content_version,
        gameContentEnchants.definition_id,
      ],
    }),
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
    content_version: text('content_version').notNull(),
    character_id: text('character_id')
      .notNull()
      .references(() => gameCharacters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    item_id: text('item_id').notNull(),
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
    check('game_item_hotbar_check_0', sql`position BETWEEN 0 AND 99`),
  ],
);
