import { publicFeatures } from '@rebirth/game-core/online/PublicFeatures';
import {
  FeatureSchemas,
  GAME_FEATURES,
  type FeatureData,
  type GameFeature,
} from '@rebirth/game-core/online/Features';
import type { CharacterMetadata } from '@rebirth/game-core/online/Contracts';
import type {
  OnlineState,
  OnlineRuntime,
} from '@rebirth/game-core/online/Runtime';
import {
  heroStats,
  heroStatSource,
  type HeroStatFacts,
} from '@rebirth/game-core/engine/rpg/Character';
import { ContentRegistry } from '@rebirth/game-core/engine/data/ContentRegistry';
import { BattleSession } from '@rebirth/game-core/game/BattleSession';
import { battleAvailability } from '@rebirth/game-core/online/BattleAvailability';
import { effectiveEntity } from '@rebirth/game-core/engine/rpg/StatusEffects';
import { projectWorldMap } from '@rebirth/game-core/engine/world/TileMap';
import {
  projectDungeonMap,
  dungeonObjectClaimed,
  bossCleared,
  remainingEnemies,
  inRoom,
} from '@rebirth/game-core/engine/dungeon/Dungeon';
import { worldObjectSprite } from '@rebirth/game-core/game/WorldObjectArt';
import { decodeHeroFeature, decodeDungeon, decodeEncounter } from './codec.js';
import { gameTables, type Rows } from './tables.js';

export const featureTables: Record<GameFeature, string[]> = {
  character: [],
  progression: ['heroes', 'milestone_claims'],
  resources: ['resources'],
  inventory: [
    'inventory_stacks',
    'equipment_instances',
    'equipment_enchants',
    'equipment_enchant_values',
    'item_hotbar',
  ],
  equipment: ['loadouts'],
  skills: [
    'character_skills',
    'skill_objective_counts',
    'skill_book_collections',
    'skill_book_pages',
  ],
  quests: [
    'quests',
    'quest_objective_counts',
    'quest_flags',
    'tracked_objectives',
  ],
  titles: ['character_titles', 'title_evidence', 'selected_titles'],
  enchanting: ['enchant_receipts', 'enchant_recovered_items'],
  rest: ['rest_state'],
  journey: [
    'campaigns',
    'world_flags',
    'dungeon_runs',
    'dungeon_flags',
    'dungeon_keys',
    'dungeon_effects',
  ],
  dungeon: [
    'campaigns',
    'dungeon_runs',
    'dungeon_flags',
    'dungeon_keys',
    'dungeon_effects',
  ],
  stats: [
    'heroes',
    'milestone_claims',
    'inventory_stacks',
    'equipment_instances',
    'equipment_enchants',
    'equipment_enchant_values',
    'loadouts',
    'character_skills',
    'skill_objective_counts',
    'character_titles',
    'title_evidence',
    'selected_titles',
    'dungeon_runs',
    'dungeon_flags',
    'dungeon_keys',
    'dungeon_effects',
  ],
  encounter: [],
};
featureTables.encounter = gameTables
  .map((table) => table.name)
  .filter((name) => name.startsWith('game_encounter'))
  .map((name) => name.slice(5))
  .concat(featureTables.dungeon);
export const sqlFeatureTables = (feature: GameFeature) =>
  featureTables[feature].map((name) => 'game_' + name);

/** Persistence ownership is separate from a feature read's projection dependencies. */
const persistedFeatureTables: Record<GameFeature, string[]> = {
  ...featureTables,
  character: ['characters'],
  inventory: ['inventory_metadata', ...featureTables.inventory],
  journey: ['campaigns', 'world_flags'],
  dungeon: ['dungeon_runs', 'dungeon_flags', 'dungeon_keys', 'dungeon_effects'],
  encounter: gameTables
    .map((t) => t.name)
    .filter((name) => name.startsWith('game_encounter'))
    .map((name) => name.slice(5)),
  stats: [],
};

function weaponReview(hero: HeroStatFacts, content: ContentRegistry) {
  const weapon = hero.equipment.weapon
    ? hero.weapons[hero.equipment.weapon]
    : undefined;
  return weapon
    ? {
        name: content.item(weapon.itemId).name,
        durability: weapon.durability,
        maxDurability: content.item(weapon.itemId).maxDurability!,
      }
    : undefined;
}
export function projectAll(
  state: OnlineState,
  character: CharacterMetadata,
  runtime: OnlineRuntime,
  content: ContentRegistry,
): FeatureData {
  return publicFeatures(runtime.publicView(state, character), content, {
    receipts: state.campaign.hero.enchanting.receipts,
  });
}
export function changedFeatures(
  before: FeatureData,
  after: FeatureData,
  beforeRows?: Rows,
  afterRows?: Rows,
): GameFeature[] {
  return GAME_FEATURES.filter(
    (feature) =>
      feature === 'character' ||
      JSON.stringify(before[feature]) !== JSON.stringify(after[feature]) ||
      (beforeRows !== undefined &&
        afterRows !== undefined &&
        persistedFeatureTables[feature]
          .map((name) => 'game_' + name)
          .some(
            (table) =>
              JSON.stringify(beforeRows[table]) !==
              JSON.stringify(afterRows[table]),
          )),
  );
}
export function selectedUpdates(
  data: FeatureData,
  features: readonly GameFeature[],
) {
  return Object.fromEntries(
    ['character', ...features].map((feature) => [
      feature,
      data[feature as GameFeature],
    ]),
  ) as Partial<FeatureData> & Pick<FeatureData, 'character'>;
}

export function projectFeature<K extends GameFeature>(
  feature: K,
  rows: Rows,
  character: CharacterMetadata,
  content?: ContentRegistry,
): FeatureData[K] {
  const get = (table: string) => rows['game_' + table];
  const one = (table: string) => {
    if (get(table).length !== 1) throw new Error('Missing ' + table);
    return get(table)[0];
  };
  const list = (table: string, column: string, kind?: string) =>
    get(table)
      .filter((row) => !kind || row.kind === kind)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((row) => String(row[column]));
  let value: unknown;
  if (feature === 'character') value = character;
  else if (
    [
      'progression',
      'resources',
      'inventory',
      'equipment',
      'skills',
      'quests',
      'titles',
      'enchanting',
    ].includes(feature)
  )
    value = decodeHeroFeature(
      rows,
      character.talent,
      feature as Parameters<typeof decodeHeroFeature>[2],
    );
  else if (feature === 'rest') value = { resting: !!one('rest_state').resting };
  else {
    const run = decodeDungeon(rows);
    if (feature === 'stats') {
      if (!content) throw new Error('Content required');
      const progression = FeatureSchemas.progression.parse(
        decodeHeroFeature(rows, character.talent, 'progression'),
      );
      const inventory = FeatureSchemas.inventory.parse(
        decodeHeroFeature(rows, character.talent, 'inventory'),
      );
      const skills = FeatureSchemas.skills.parse(
        decodeHeroFeature(rows, character.talent, 'skills'),
      );
      const titles = FeatureSchemas.titles.parse(
        decodeHeroFeature(rows, character.talent, 'titles'),
      );
      const hero: HeroStatFacts = {
        ...progression,
        ...inventory,
        ...skills,
        ...titles,
        equipment: FeatureSchemas.equipment.parse(
          decodeHeroFeature(rows, character.talent, 'equipment'),
        ),
      };
      value = {
        stats: heroStats(hero, content, run?.effects),
        source: heroStatSource(hero, run?.effects, content),
        weapon: weaponReview(hero, content),
      };
    } else if (feature === 'dungeon') {
      const location = one('campaigns');
      value = run
        ? {
            definitionId: run.blueprint.definitionId,
            bossDoorOpened: run.bossDoorOpened,
            selectedChest: run.selectedChest,
            currentRoomKind: (() => {
              const room = run.blueprint.rooms.find((room) =>
                inRoom(room, { x: Number(location.x), y: Number(location.y) }),
              );
              return room?.kind === 'mimic'
                ? 'chest'
                : (room?.kind ?? 'corridor');
            })(),
            remainingEnemies: remainingEnemies(run),
            bossCleared: bossCleared(run),
            effects: run.effects,
            bossKey: run.bossKey.status,
            treasureKey: run.treasureKey.status,
          }
        : null;
    } else if (feature === 'journey') {
      if (!content) throw new Error('Content required');
      const location = one('campaigns'),
        opened = list('world_flags', 'object_id', 'opened'),
        cleared = list('world_flags', 'object_id', 'cleared');
      const projection = run
        ? projectDungeonMap(run)
        : projectWorldMap(
            content.data.worlds.find(
              (world) => world.id === location.world_id,
            )!,
            cleared,
          );
      const map = {
        ...projection,
        objects: projection.objects.map((object) => ({ ...object })),
      };
      const claimed = (id: string) =>
        run
          ? dungeonObjectClaimed(run, id)
          : opened.includes(`${location.world_id}/${id}`) ||
            cleared.includes(`${location.world_id}/${id}`);
      if (run) {
        map.id = `dungeon:${character.id}`;
        map.objects = map.objects.map((object) => {
          const copy = {
            ...object,
            sprite: worldObjectSprite(
              object,
              content.data,
              run,
              claimed(object.id),
            ),
          };
          delete copy.encounterMap;
          if (copy.kind === 'encounter') copy.encounterMap = 'unrevealed';
          if (copy.kind === 'chest' || copy.kind === 'finalChest') {
            copy.itemId = 'unrevealed';
            copy.quantity = 1;
          }
          return copy;
        });
      }
      value = {
        worldId: map.id,
        position: { x: Number(location.x), y: Number(location.y) },
        map,
        opened,
        cleared,
        activeService: location.active_service ?? undefined,
        claimedObjectIds: map.objects
          .filter((object) => claimed(object.id))
          .map((object) => object.id),
      };
    } else if (feature === 'encounter') {
      if (!content) throw new Error('Content required');
      const { battle, pending } = decodeEncounter(rows);
      if (!battle) value = null;
      else {
        const map = run
          ? run.blueprint.encounters.find(
              (entry) => entry.objectId === pending!.objectId,
            )!.map
          : content.data.maps.find((map) => map.id === pending!.mapId)!;
        const session = new BattleSession(
          content,
          battle.seed,
          map,
          undefined,
          [],
          character.name,
          battle.encounterId,
          true,
        );
        try {
          session.restoreState(battle);
          value = {
            id: `encounter:${one('campaigns').encounter_count}`,
            phase: battle.combat.outcome ?? 'selectingAction',
            map: run ? { ...map, id: `${character.id}:battle` } : map,
            actionSequence: battle.combat.actionSequence,
            turnId: session.combat.currentTurn(),
            actors: session.engine.world.entities.map((entity) => ({
              id: entity.id,
              name: entity.name,
              player: !!entity.player,
              enemy: !!entity.enemy,
              health: entity.health,
              mana: entity.mana,
              stamina: entity.stamina,
              wounds: entity.wounds,
              fullness: entity.fullness,
              ammunitionItemId: entity.ammunitionItemId,
              defending: battle.combat.defending.includes(entity.id),
              dead: !!entity.dead,
              statuses: entity.statuses ?? [],
              cooldowns: entity.cooldowns ?? {},
              inventory: entity.inventory ?? {},
              stats: effectiveEntity(entity, content).combatant,
              statSource: entity.statSource,
              weapon: entity.weapon,
              learnedSkills: entity.learnedSkills,
              itemHotbar: entity.itemHotbar ?? [],
              position: entity.position,
            })),
            actions: battleAvailability(session),
            rewards: get('encounter_rewards').length
              ? {
                  gold: Number(one('encounter_rewards').gold),
                  experience: Number(one('encounter_rewards').experience),
                  items: get('encounter_reward_items')
                    .sort((a, b) => Number(a.position) - Number(b.position))
                    .map((row) => ({
                      itemId: String(row.item_id),
                      quantity: Number(row.quantity),
                      collectable: Number(row.collectable),
                    })),
                }
              : undefined,
          };
        } finally {
          session.dispose();
        }
      }
    }
  }
  return FeatureSchemas[feature].parse(value) as FeatureData[K];
}
