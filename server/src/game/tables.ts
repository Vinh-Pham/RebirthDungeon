import { getTableConfig } from 'drizzle-orm/sqlite-core';
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import { gameCharacters } from '../db/schema/game/characters.js';
import {
  gameHeroes,
  gameMilestoneClaims,
} from '../db/schema/game/progression.js';
import { gameResources } from '../db/schema/game/resources.js';
import {
  gameInventoryMetadata,
  gameInventoryStacks,
  gameEquipmentInstances,
  gameLoadouts,
  gameEquipmentEnchants,
  gameEquipmentEnchantValues,
  gameItemHotbar,
} from '../db/schema/game/inventory.js';
import {
  gameCharacterSkills,
  gameSkillObjectiveCounts,
  gameSkillBookCollections,
  gameSkillBookPages,
} from '../db/schema/game/skills.js';
import {
  gameQuests,
  gameQuestObjectiveCounts,
  gameQuestFlags,
  gameTrackedObjectives,
} from '../db/schema/game/quests.js';
import {
  gameCharacterTitles,
  gameTitleEvidence,
  gameSelectedTitles,
} from '../db/schema/game/titles.js';
import {
  gameRngStreams,
  gameEnchantReceipts,
  gameEnchantRecoveredItems,
} from '../db/schema/game/enchanting.js';
import {
  gameCampaigns,
  gameRestState,
  gameWorldFlags,
} from '../db/schema/game/journey.js';
import {
  gameDungeonRuns,
  gameDungeonFlags,
  gameDungeonKeys,
  gameDungeonEffects,
} from '../db/schema/game/dungeon.js';
import {
  gameEncounters,
  gameEncounterActors,
  gameEncounterTurnOrder,
  gameEncounterEnemyHistory,
  gameEncounterTraining,
  gameEncounterQuestEvidence,
  gameEncounterRewards,
  gameEncounterRewardItems,
} from '../db/schema/game/encounters.js';
import { gameCommandReceipts } from '../db/schema/game/commands.js';
import { actorsTables } from '../db/schema/game/actors.js';

export const stateSchemaTables: AnySQLiteTable[] = [
  gameCharacters,
  gameHeroes,
  gameMilestoneClaims,
  gameResources,
  gameInventoryMetadata,
  gameInventoryStacks,
  gameEquipmentInstances,
  gameLoadouts,
  gameEquipmentEnchants,
  gameEquipmentEnchantValues,
  gameItemHotbar,
  gameCharacterSkills,
  gameSkillObjectiveCounts,
  gameSkillBookCollections,
  gameSkillBookPages,
  gameQuests,
  gameQuestObjectiveCounts,
  gameQuestFlags,
  gameTrackedObjectives,
  gameCharacterTitles,
  gameTitleEvidence,
  gameSelectedTitles,
  gameRngStreams,
  gameEnchantReceipts,
  gameEnchantRecoveredItems,
  gameCampaigns,
  gameRestState,
  gameWorldFlags,
  gameDungeonRuns,
  gameDungeonFlags,
  gameDungeonKeys,
  gameDungeonEffects,
  gameEncounters,
  gameEncounterActors,
  ...actorsTables,
  gameEncounterTurnOrder,
  gameEncounterEnemyHistory,
  gameEncounterTraining,
  gameEncounterQuestEvidence,
  gameEncounterRewards,
  gameEncounterRewardItems,
  gameCommandReceipts,
];
export const gameTables = stateSchemaTables.map((table) => {
  const config = getTableConfig(table);
  return {
    name: config.name,
    columns: config.columns.map((c) => c.name),
    keys:
      config.primaryKeys[0]?.columns.map((c) => c.name) ??
      config.columns.filter((c) => c.primary).map((c) => c.name),
  };
});
export type TableName = string;
export type Row = Record<string, string | number | null>;
export type Rows = Record<TableName, Row[]>;
