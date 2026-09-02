/**
 * Content repository backed by the JSON files bundled at build time
 * (`assets/data/*.json`, inlined by Metro). Validation happens once, through
 * the domain catalog builder; failures surface as ContentValidationError with
 * actionable paths.
 */

import {
  buildContentCatalog,
  type ContentCatalog,
} from '@/domain/content/catalog';
import type { ContentRepository } from '@/application/ports/content-repository';

import abilitiesJson from '@/assets/data/abilities.json';
import bannersJson from '@/assets/data/banners.json';
import diceJson from '@/assets/data/dice.json';
import dungeonsJson from '@/assets/data/dungeons.json';
import encountersJson from '@/assets/data/encounters.json';
import experienceCurvesJson from '@/assets/data/experience-curves.json';
import generationProfilesJson from '@/assets/data/generation-profiles.json';
import heroesJson from '@/assets/data/heroes.json';
import itemsJson from '@/assets/data/items.json';
import lootTablesJson from '@/assets/data/loot-tables.json';
import monstersJson from '@/assets/data/monsters.json';
import pityRulesJson from '@/assets/data/pity-rules.json';
import rarityTablesJson from '@/assets/data/rarity-tables.json';
import statusEffectsJson from '@/assets/data/status-effects.json';
import tileDefinitionsJson from '@/assets/data/tile-definitions.json';

export class BundledContentRepository implements ContentRepository {
  private catalogPromise: Promise<ContentCatalog> | null = null;

  loadCatalog(): Promise<ContentCatalog> {
    this.catalogPromise ??= Promise.resolve().then(() =>
      buildContentCatalog({
        heroes: heroesJson,
        monsters: monstersJson,
        dice: diceJson,
        abilities: abilitiesJson,
        'status-effects': statusEffectsJson,
        items: itemsJson,
        'loot-tables': lootTablesJson,
        'rarity-tables': rarityTablesJson,
        encounters: encountersJson,
        dungeons: dungeonsJson,
        banners: bannersJson,
        'experience-curves': experienceCurvesJson,
        'tile-definitions': tileDefinitionsJson,
        'generation-profiles': generationProfilesJson,
        'pity-rules': pityRulesJson,
      }),
    );
    return this.catalogPromise;
  }
}
