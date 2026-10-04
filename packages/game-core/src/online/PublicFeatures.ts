import { FeatureSchemas, type FeatureData } from './Features';
import type { PublicView } from './Contracts';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { heroStatSource } from '../engine/rpg/Character';
/** Project a resolved engine observation into independent public feature contracts. */
export function publicFeatures(
  view: PublicView,
  content: ContentRegistry,
  enchanting: FeatureData['enchanting'],
): FeatureData {
  const hero = view.hero;
  const pick = <
    K extends 'progression' | 'resources' | 'inventory' | 'skills' | 'quests' | 'titles',
  >(
    key: K,
  ) => FeatureSchemas[key].strip().parse(hero) as FeatureData[K];
  const weapon = hero.equipment.weapon ? hero.weapons[hero.equipment.weapon] : undefined;
  return {
    character: view.character,
    progression: pick('progression'),
    resources: pick('resources'),
    inventory: pick('inventory'),
    equipment: hero.equipment,
    skills: pick('skills'),
    quests: pick('quests'),
    titles: pick('titles'),
    enchanting,
    stats: {
      stats: view.stats,
      source: FeatureSchemas.stats.shape.source.parse(
        heroStatSource(hero, view.dungeon?.effects, content),
      ),
      weapon: weapon
        ? {
            name: content.item(weapon.itemId).name,
            durability: weapon.durability,
            maxDurability: content.item(weapon.itemId).maxDurability!,
          }
        : undefined,
    },
    journey: FeatureSchemas.journey.strip().parse(view),
    rest: { resting: view.resting },
    dungeon: view.dungeon ?? null,
    encounter: view.encounter ?? null,
  };
}
