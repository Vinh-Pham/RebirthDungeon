import { GAME_CONTENT_VERSION } from '@rebirth/game-core/online/Contracts';
import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import { CampaignSchema } from '@rebirth/game-core/persistence/SaveSchema';
import { gameTables, type Rows, type TableName } from './tables.js';
import {
  n,
  s,
  optional,
  ordered,
  singleton,
  words,
  rowReader,
} from './codecs/rows.js';
import { encodeProgression, decodeProgression } from './codecs/progression.js';
import { encodeResources, decodeResources } from './codecs/resources.js';
import { encodeJourney } from './codecs/journey.js';
import { encodeInventory, decodeInventory } from './codecs/inventory.js';
import { encodeEquipment, decodeEquipment } from './codecs/equipment.js';
import { encodeSkills, decodeSkills } from './codecs/skills.js';
import { encodeQuests, decodeQuests } from './codecs/quests.js';
import { encodeTitles, decodeTitles } from './codecs/titles.js';
import { encodeEnchanting, decodeEnchanting } from './codecs/enchanting.js';
import { encodeDungeon, decodeDungeon } from './codecs/dungeon.js';
import { encodeEncounter, decodeEncounter } from './codecs/encounter.js';
const emptyRows = () =>
  Object.fromEntries(gameTables.map((t) => [t.name, []])) as Rows;
export function encodeState(
  id: string,
  state: OnlineState,
  contentVersion = GAME_CONTENT_VERSION,
): Rows {
  const rows = emptyRows();
  const add = (
    table: string,
    row: Record<string, string | number | null | undefined>,
  ) => {
    const name = `game_${table}` as TableName;
    const descriptor = gameTables.find((t) => t.name === name)!;
    rows[name].push(
      Object.fromEntries(
        descriptor.columns.map((column) => [
          column,
          column === 'character_id'
            ? id
            : column === 'content_version'
              ? contentVersion
              : (row[column] ?? null),
        ]),
      ),
    );
  };

  encodeProgression(state, id, rows, add);
  encodeResources(state, id, rows, add);
  encodeJourney(state, id, rows, add);
  encodeInventory(state, id, rows, add);
  encodeEquipment(state, id, rows, add);
  encodeSkills(state, id, rows, add);
  encodeQuests(state, id, rows, add);
  encodeTitles(state, id, rows, add);
  encodeEnchanting(state, id, rows, add);
  encodeDungeon(state, id, rows, add);
  encodeEncounter(state, id, rows, add);
  for (const table of gameTables)
    if (table.columns.includes('content_version'))
      for (const row of rows[table.name]) row.content_version = contentVersion;
  return rows;
}
export function decodeState(rows: Rows, talent: string): OnlineState {
  const { get, matching } = rowReader(rows);
  const h = {
      ...singleton(get('heroes')),
      ...singleton(get('resources')),
      ...singleton(get('inventory_metadata')),
    },
    c = { ...singleton(get('campaigns')), ...singleton(get('rest_state')) },
    j = singleton(matching('rng_streams', 'kind', 'journey')),
    e = singleton(matching('rng_streams', 'kind', 'enchant'));
  const campaign: Record<string, unknown> = {
    seed: n(j, 'seed'),
    randomState: words(j),
    worldId: s(c, 'world_id'),
    position: { x: n(c, 'x'), y: n(c, 'y') },
    encounterCount: n(c, 'encounter_count'),
    opened: ordered(matching('world_flags', 'kind', 'opened')).map((r) =>
      s(r, 'object_id'),
    ),
    cleared: ordered(matching('world_flags', 'kind', 'cleared')).map((r) =>
      s(r, 'object_id'),
    ),
    audio: { music: 0.3, sfx: 0.7, enabled: false },
    hero: {
      ...decodeProgression(rows, talent),
      ...decodeResources(rows, talent),
      ...decodeInventory(rows, talent),
      equipment: decodeEquipment(rows, talent),
      ...decodeSkills(rows, talent),
      ...decodeQuests(rows, talent),
      ...decodeTitles(rows, talent),
      nextWeaponId: n(h, 'next_weapon_id'),
      nextArmorId: n(h, 'next_armor_id'),
      enchanting: {
        algorithm: 'xoroshiro128plus',
        version: 1,
        seed: n(e, 'seed'),
        state: words(e),
        nextOperationId: n(e, 'next_operation_id'),
        ...decodeEnchanting(rows, talent),
      },
    },
  };
  campaign.dungeon = decodeDungeon(rows);
  const { battle, pending } = decodeEncounter(rows);
  campaign.pending = pending;
  const rewards = get('encounter_rewards').length
    ? singleton(get('encounter_rewards'))
    : undefined;
  return {
    campaign: CampaignSchema.parse(campaign),
    context: {
      resting: !!n(c, 'resting'),
      activeService: optional(c, 'active_service'),
      ...(c.last_rest_tick === null
        ? {}
        : { lastRestTick: n(c, 'last_rest_tick') }),
      ...(c.rest_lease_until === null
        ? {}
        : { restLeaseUntil: n(c, 'rest_lease_until') }),
    },
    ...(battle ? { battle } : {}),
    ...(rewards
      ? {
          rewards: {
            loot: {
              gold: n(rewards, 'gold'),
              experience: n(rewards, 'experience'),
              items: ordered(get('encounter_reward_items')).map((r) => ({
                itemId: s(r, 'item_id'),
                quantity: n(r, 'quantity'),
                collectable: n(r, 'collectable'),
              })),
            },
            randomState: words(rewards),
          },
        }
      : {}),
  };
}

export { decodeDungeon, decodeEncounter };
export function decodeHeroFeature(
  rows: Rows,
  talent: string,
  feature:
    | 'progression'
    | 'resources'
    | 'inventory'
    | 'equipment'
    | 'skills'
    | 'quests'
    | 'titles'
    | 'enchanting',
) {
  switch (feature) {
    case 'progression':
      return decodeProgression(rows, talent);
    case 'resources':
      return decodeResources(rows, talent);
    case 'inventory':
      return decodeInventory(rows, talent);
    case 'equipment':
      return decodeEquipment(rows, talent);
    case 'skills':
      return decodeSkills(rows, talent);
    case 'quests':
      return decodeQuests(rows, talent);
    case 'titles':
      return decodeTitles(rows, talent);
    case 'enchanting':
      return decodeEnchanting(rows, talent);
  }
}
