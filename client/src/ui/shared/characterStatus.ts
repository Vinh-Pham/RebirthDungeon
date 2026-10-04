import {
  MAX_LEVEL,
  experienceToNextLevel,
  heroStats,
  heroStatSource,
  type HeroFacts,
} from '../../engine/rpg/Character';
import type { ContentRegistry } from '../../engine/data/ContentRegistry';
import type { CharacterReview } from '../../game/BattleSession';

/** Prefer the isolated encounter's live resources without publishing them to the campaign. */
export function characterReview(
  hero: Pick<
    HeroFacts,
    | 'classId'
    | 'level'
    | 'growthTalent'
    | 'inventory'
    | 'equipment'
    | 'weapons'
    | 'armors'
    | 'learnedSkills'
    | 'earnedTitles'
    | 'titleCollection'
    | 'health'
    | 'mana'
    | 'stamina'
    | 'wounds'
    | 'fullness'
  >,
  content: ContentRegistry,
  effects: readonly { statusId: string; stacks: number }[] = [],
  battle?: CharacterReview,
): CharacterReview {
  if (battle) return battle;
  const weapon = hero.equipment.weapon ? hero.weapons[hero.equipment.weapon] : undefined;
  return {
    source: heroStatSource(hero, effects, content),
    stats: heroStats(hero, content, effects),
    health: hero.health,
    mana: hero.mana,
    stamina: hero.stamina,
    wounds: hero.wounds,
    fullness: hero.fullness,
    statuses: [],
    weapon: weapon
      ? {
          name: content.item(weapon.itemId).name,
          durability: weapon.durability,
          maxDurability: content.item(weapon.itemId).maxDurability!,
        }
      : undefined,
  };
}

/** Current-level XP uses the engine chart; the cap is a filled presentation-only track. */
export function characterExperience(hero: Pick<HeroFacts, 'level' | 'experience'>) {
  const capped = hero.level === MAX_LEVEL;
  const max = capped ? 1 : experienceToNextLevel(hero.level);
  const value = capped ? 1 : hero.experience;
  return {
    value,
    max,
    text: capped ? 'Maximum level' : `${((value / max) * 100).toFixed(1)}%`,
    accessibleText: capped ? 'Maximum level' : `${value} of ${max} XP`,
  };
}
