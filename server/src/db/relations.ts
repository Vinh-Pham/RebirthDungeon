import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.js';

export const gameRelations = defineRelations(schema, (r) => ({
  gameCharacters: {
    owner: r.one.user({
      from: r.gameCharacters.user_id,
      to: r.user.id,
      optional: false,
    }),
    progression: r.one.gameHeroes({
      from: r.gameCharacters.id,
      to: r.gameHeroes.character_id,
      optional: false,
    }),
    resources: r.one.gameResources({
      from: r.gameCharacters.id,
      to: r.gameResources.character_id,
      optional: false,
    }),
    inventoryMetadata: r.one.gameInventoryMetadata({
      from: r.gameCharacters.id,
      to: r.gameInventoryMetadata.character_id,
      optional: false,
    }),
    inventory: r.many.gameInventoryStacks({
      from: r.gameCharacters.id,
      to: r.gameInventoryStacks.character_id,
    }),
    equipment: r.many.gameEquipmentInstances({
      from: r.gameCharacters.id,
      to: r.gameEquipmentInstances.character_id,
    }),
    loadout: r.one.gameLoadouts({
      from: r.gameCharacters.id,
      to: r.gameLoadouts.character_id,
      optional: false,
    }),
    skills: r.many.gameCharacterSkills({
      from: r.gameCharacters.id,
      to: r.gameCharacterSkills.character_id,
    }),
    quests: r.many.gameQuests({
      from: r.gameCharacters.id,
      to: r.gameQuests.character_id,
    }),
    titles: r.many.gameCharacterTitles({
      from: r.gameCharacters.id,
      to: r.gameCharacterTitles.character_id,
    }),
    randomStreams: r.many.gameRngStreams({
      from: r.gameCharacters.id,
      to: r.gameRngStreams.character_id,
    }),
    milestones: r.many.gameMilestoneClaims({
      from: r.gameCharacters.id,
      to: r.gameMilestoneClaims.character_id,
    }),
    hotbar: r.many.gameItemHotbar({
      from: r.gameCharacters.id,
      to: r.gameItemHotbar.character_id,
    }),
    books: r.many.gameSkillBookCollections({
      from: r.gameCharacters.id,
      to: r.gameSkillBookCollections.character_id,
    }),
    questFlags: r.many.gameQuestFlags({
      from: r.gameCharacters.id,
      to: r.gameQuestFlags.character_id,
    }),
    trackedObjectives: r.many.gameTrackedObjectives({
      from: r.gameCharacters.id,
      to: r.gameTrackedObjectives.character_id,
    }),
    titleSlots: r.many.gameSelectedTitles({
      from: r.gameCharacters.id,
      to: r.gameSelectedTitles.character_id,
    }),
    journey: r.one.gameCampaigns({
      from: r.gameCharacters.id,
      to: r.gameCampaigns.character_id,
      optional: false,
    }),
    rest: r.one.gameRestState({
      from: r.gameCharacters.id,
      to: r.gameRestState.character_id,
      optional: false,
    }),
    dungeon: r.one.gameDungeonRuns({
      from: r.gameCharacters.id,
      to: r.gameDungeonRuns.character_id,
    }),
    encounter: r.one.gameEncounters({
      from: r.gameCharacters.id,
      to: r.gameEncounters.character_id,
    }),
    receipts: r.many.gameCommandReceipts({
      from: r.gameCharacters.id,
      to: r.gameCommandReceipts.character_id,
    }),
    release: r.one.gameContentReleases({
      from: r.gameCharacters.content_version,
      to: r.gameContentReleases.content_version,
      optional: false,
    }),
  },
  gameEquipmentInstances: {
    enchants: r.many.gameEquipmentEnchants({
      from: [
        r.gameEquipmentInstances.character_id,
        r.gameEquipmentInstances.instance_id,
      ],
      to: [
        r.gameEquipmentEnchants.character_id,
        r.gameEquipmentEnchants.instance_id,
      ],
    }),
  },
  gameCharacterSkills: {
    objectives: r.many.gameSkillObjectiveCounts({
      from: [
        r.gameCharacterSkills.character_id,
        r.gameCharacterSkills.skill_id,
      ],
      to: [
        r.gameSkillObjectiveCounts.character_id,
        r.gameSkillObjectiveCounts.skill_id,
      ],
    }),
  },
  gameQuests: {
    objectives: r.many.gameQuestObjectiveCounts({
      from: [r.gameQuests.character_id, r.gameQuests.quest_id],
      to: [
        r.gameQuestObjectiveCounts.character_id,
        r.gameQuestObjectiveCounts.quest_id,
      ],
    }),
  },
  gameEncounters: {
    actors: r.many.gameEncounterActors({
      from: r.gameEncounters.character_id,
      to: r.gameEncounterActors.character_id,
    }),
  },
  gameCommandReceipts: {
    features: r.many.gameCommandReceiptFeatures({
      from: [r.gameCommandReceipts.user_id, r.gameCommandReceipts.command_id],
      to: [
        r.gameCommandReceiptFeatures.user_id,
        r.gameCommandReceiptFeatures.command_id,
      ],
    }),
  },
}));
