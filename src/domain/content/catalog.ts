/**
 * Content catalog: assembles every validated content file and cross-checks
 * references between collections. All failures are collected into a single
 * ContentValidationError whose problems name the file, entry, and field —
 * so a broken reference points at exactly what to fix.
 */

import { z } from 'zod';

import { DomainError } from '@/core/errors/domain-error';
import { deepFreeze } from '@/core/utils/deep-freeze';
import {
  contentFileSchemas,
  type ContentFileName,
  type ContentFilesInput,
  type AbilityDefinition,
  type BannerDefinition,
  type DieDefinition,
  type DungeonDefinition,
  type EncounterDefinition,
  type ExperienceCurveDefinition,
  type GenerationProfileDefinition,
  type HeroDefinition,
  type ItemDefinition,
  type LootTableDefinition,
  type MonsterDefinition,
  type PityRuleDefinition,
  type RarityTableDefinition,
  type StatusEffectDefinition,
  type TileDefinition,
} from './schemas';

export class ContentValidationError extends DomainError {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      problems.length === 1
        ? `Content validation failed: ${problems[0]}`
        : `Content validation failed with ${problems.length} problems:\n- ${problems.join('\n- ')}`,
    );
    this.name = 'ContentValidationError';
    this.problems = problems;
  }
}

export interface ContentCatalog {
  readonly version: 1;
  readonly dice: Readonly<Record<string, DieDefinition>>;
  readonly abilities: Readonly<Record<string, AbilityDefinition>>;
  readonly statusEffects: Readonly<Record<string, StatusEffectDefinition>>;
  readonly heroes: Readonly<Record<string, HeroDefinition>>;
  readonly monsters: Readonly<Record<string, MonsterDefinition>>;
  readonly items: Readonly<Record<string, ItemDefinition>>;
  readonly lootTables: Readonly<Record<string, LootTableDefinition>>;
  readonly rarityTables: Readonly<Record<string, RarityTableDefinition>>;
  readonly encounters: Readonly<Record<string, EncounterDefinition>>;
  readonly dungeons: Readonly<Record<string, DungeonDefinition>>;
  readonly banners: Readonly<Record<string, BannerDefinition>>;
  readonly experienceCurves: Readonly<
    Record<string, ExperienceCurveDefinition>
  >;
  readonly tileDefinitions: Readonly<Record<number, TileDefinition>>;
  readonly generationProfiles: Readonly<
    Record<string, GenerationProfileDefinition>
  >;
  readonly pityRules: Readonly<Record<string, PityRuleDefinition>>;
}

type ParsedCollections = {
  [K in ContentFileName]: z.infer<(typeof contentFileSchemas)[K]>;
};

function parseFiles(files: ContentFilesInput): {
  collections?: ParsedCollections;
  problems: string[];
} {
  const problems: string[] = [];
  const collections = {} as ParsedCollections;
  for (const fileName of Object.keys(contentFileSchemas) as ContentFileName[]) {
    const raw = files[fileName];
    if (raw === undefined || raw === null) {
      problems.push(`${fileName}.json: file is missing from the content input`);
      continue;
    }
    const parsed = contentFileSchemas[fileName].safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = [fileName, ...issue.path.map(String)].join('.');
        problems.push(`${path}: ${issue.message}`);
      }
      continue;
    }
    Object.assign(collections, { [fileName]: parsed.data });
  }
  return problems.length > 0 ? { problems } : { collections, problems };
}

function indexById<T extends { readonly id: string | number }>(
  file: ContentFileName,
  collectionKey: string,
  entries: readonly T[],
  problems: string[],
): Readonly<Record<string | number, T>> {
  const record: Record<string | number, T> = {};
  for (const entry of entries) {
    if (record[entry.id] !== undefined) {
      problems.push(
        `${file}.json: duplicate id '${entry.id}' in ${collectionKey}`,
      );
      continue;
    }
    record[entry.id] = entry;
  }
  return record;
}

export function buildContentCatalog(files: ContentFilesInput): ContentCatalog {
  const { collections, problems } = parseFiles(files);
  if (!collections) throw new ContentValidationError(problems);

  const dice = indexById('dice', 'dice', collections.dice.dice, problems);
  const statusEffects = indexById(
    'status-effects',
    'statusEffects',
    collections['status-effects'].statusEffects,
    problems,
  );
  const abilities = indexById(
    'abilities',
    'abilities',
    collections.abilities.abilities,
    problems,
  );
  const heroes = indexById(
    'heroes',
    'heroes',
    collections.heroes.heroes,
    problems,
  );
  const monsters = indexById(
    'monsters',
    'monsters',
    collections.monsters.monsters,
    problems,
  );
  const items = indexById('items', 'items', collections.items.items, problems);
  const lootTables = indexById(
    'loot-tables',
    'lootTables',
    collections['loot-tables'].lootTables,
    problems,
  );
  const rarityTables = indexById(
    'rarity-tables',
    'rarityTables',
    collections['rarity-tables'].rarityTables,
    problems,
  );
  const encounters = indexById(
    'encounters',
    'encounters',
    collections.encounters.encounters,
    problems,
  );
  const dungeons = indexById(
    'dungeons',
    'dungeons',
    collections.dungeons.dungeons,
    problems,
  );
  const banners = indexById(
    'banners',
    'banners',
    collections.banners.banners,
    problems,
  );
  const experienceCurves = indexById(
    'experience-curves',
    'experienceCurves',
    collections['experience-curves'].experienceCurves,
    problems,
  );
  const tileDefinitions = indexById(
    'tile-definitions',
    'tileDefinitions',
    collections['tile-definitions'].tileDefinitions,
    problems,
  );
  const generationProfiles = indexById(
    'generation-profiles',
    'generationProfiles',
    collections['generation-profiles'].generationProfiles,
    problems,
  );
  const pityRules = indexById(
    'pity-rules',
    'pityRules',
    collections['pity-rules'].pityRules,
    problems,
  );

  // --- cross references ------------------------------------------------------

  const requireRef = (
    file: ContentFileName,
    entryId: string,
    field: string,
    ref: string,
    table: Readonly<Record<string, unknown>>,
  ): void => {
    if (table[ref] === undefined) {
      problems.push(
        `${file}.json: '${entryId}' references unknown ${field} '${ref}'`,
      );
    }
  };

  for (const hero of Object.values(heroes)) {
    hero.dice.forEach((dieId, index) =>
      requireRef('heroes', hero.id, `dice[${index}]`, dieId, dice),
    );
    hero.abilities.forEach((abilityId, index) =>
      requireRef(
        'heroes',
        hero.id,
        `abilities[${index}]`,
        abilityId,
        abilities,
      ),
    );
  }

  for (const monster of Object.values(monsters)) {
    monster.dice.forEach((dieId, index) =>
      requireRef('monsters', monster.id, `dice[${index}]`, dieId, dice),
    );
    monster.abilities.forEach((abilityId, index) =>
      requireRef(
        'monsters',
        monster.id,
        `abilities[${index}]`,
        abilityId,
        abilities,
      ),
    );
    if (monster.lootTableId) {
      requireRef(
        'monsters',
        monster.id,
        'lootTableId',
        monster.lootTableId,
        lootTables,
      );
    }
    for (const statusId of Object.keys(monster.resistances ?? {})) {
      requireRef(
        'monsters',
        monster.id,
        `resistances`,
        statusId,
        statusEffects,
      );
    }
  }

  for (const ability of Object.values(abilities)) {
    if (ability.appliesStatus) {
      requireRef(
        'abilities',
        ability.id,
        'appliesStatus.statusId',
        ability.appliesStatus.statusId,
        statusEffects,
      );
    }
  }

  for (const item of Object.values(items)) {
    if (item.kind === 'consumable' && item.consumable.statusId) {
      requireRef(
        'items',
        item.id,
        'consumable.statusId',
        item.consumable.statusId,
        statusEffects,
      );
    }
  }

  for (const table of Object.values(lootTables)) {
    table.entries.forEach((entry, index) =>
      requireRef(
        'loot-tables',
        table.id,
        `entries[${index}].itemId`,
        entry.itemId,
        items,
      ),
    );
  }

  for (const encounter of Object.values(encounters)) {
    encounter.monsterIds.forEach((monsterId, index) =>
      requireRef(
        'encounters',
        encounter.id,
        `monsterIds[${index}]`,
        monsterId,
        monsters,
      ),
    );
    if (encounter.lootTableId) {
      requireRef(
        'encounters',
        encounter.id,
        'lootTableId',
        encounter.lootTableId,
        lootTables,
      );
    }
  }

  for (const dungeon of Object.values(dungeons)) {
    dungeon.encounterIds.forEach((encounterId, index) =>
      requireRef(
        'dungeons',
        dungeon.id,
        `encounterIds[${index}]`,
        encounterId,
        encounters,
      ),
    );
    requireRef(
      'dungeons',
      dungeon.id,
      'bossEncounterId',
      dungeon.bossEncounterId,
      encounters,
    );
  }

  for (const banner of Object.values(banners)) {
    requireRef(
      'banners',
      banner.id,
      'rarityTableId',
      banner.rarityTableId,
      rarityTables,
    );
    if (banner.pityRuleId) {
      requireRef(
        'banners',
        banner.id,
        'pityRuleId',
        banner.pityRuleId,
        pityRules,
      );
    }
    if (banner.featuredHeroId) {
      requireRef(
        'banners',
        banner.id,
        'featuredHeroId',
        banner.featuredHeroId,
        heroes,
      );
    }
  }

  // Tile definitions must tile the id space densely starting at 0 so arrays
  // can index by tile id (renderer atlases, grid rules).
  const tileIds = Object.keys(tileDefinitions)
    .map(Number)
    .sort((a, b) => a - b);
  tileIds.forEach((id, index) => {
    if (id !== index) {
      problems.push(
        `tile-definitions.json: tile ids must be contiguous from 0 (found ${id} at position ${index})`,
      );
    }
  });

  if (problems.length > 0) throw new ContentValidationError(problems);

  return deepFreeze({
    version: 1 as const,
    dice,
    abilities,
    statusEffects,
    heroes,
    monsters,
    items,
    lootTables,
    rarityTables,
    encounters,
    dungeons,
    banners,
    experienceCurves,
    tileDefinitions,
    generationProfiles,
    pityRules,
  });
}
