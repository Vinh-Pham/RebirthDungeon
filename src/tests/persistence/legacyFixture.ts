import type { Hero } from '../../engine/rpg/Character';
import type { CampaignState } from '../../persistence/SaveSchema';

/** The v7 ownership wire shape has stacked armor and plain weapon durability. */
export function versionSevenHero(current: Hero) {
  const { armors, nextArmorId, enchanting, titleCollection, cumulativeLevel, itemHotbar, ...hero } =
    structuredClone(current);
  void titleCollection;
  void cumulativeLevel;
  void itemHotbar;
  void nextArmorId;
  void enchanting;
  for (const armor of Object.values(armors))
    hero.inventory[armor.itemId] = (hero.inventory[armor.itemId] ?? 0) + 1;
  if (hero.equipment.armor) hero.equipment.armor = armors[hero.equipment.armor].itemId;
  hero.weapons = Object.fromEntries(
    Object.entries(hero.weapons).map(([id, w]) => [
      id,
      { itemId: w.itemId, durability: w.durability },
    ]),
  );
  return hero;
}
/** Build the actual pre-v4 wire shape, including stacked weapons. */
export function legacyCampaign(campaign: CampaignState) {
  const {
    weapons,
    nextWeaponId,
    growthTalent,
    stamina,
    wounds,
    fullness,
    ap,
    learnedSkills,
    discoveredSkills,
    bookCollections,
    claimedMilestones,
    quests,
    earnedTitles,
    questFlags,
    trackedObjectives,
    ...hero
  } = versionSevenHero(campaign.hero);
  void ap;
  void learnedSkills;
  void discoveredSkills;
  void bookCollections;
  void claimedMilestones;
  void quests;
  void earnedTitles;
  void questFlags;
  void trackedObjectives;
  void nextWeaponId;
  void growthTalent;
  void stamina;
  void wounds;
  void fullness;
  hero.health = Math.min(hero.health, 42 + (hero.level - 1) * 5);
  hero.mana = Math.min(hero.mana, 14 + (hero.level - 1) * 2);
  for (const weapon of Object.values(weapons))
    hero.inventory[weapon.itemId] = (hero.inventory[weapon.itemId] ?? 0) + 1;
  if (hero.equipment.weapon) hero.equipment.weapon = weapons[hero.equipment.weapon].itemId;
  return { ...structuredClone(campaign), hero };
}
