import type { CampaignState } from '../../persistence/SaveSchema';

/** Build the actual pre-v4 wire shape, including stacked weapons. */
export function legacyCampaign(campaign: CampaignState) {
  const { weapons, nextWeaponId, growthTalent, stamina, wounds, fullness, ...hero } = structuredClone(campaign.hero);
  void nextWeaponId; void growthTalent; void stamina; void wounds; void fullness;
  hero.health = Math.min(hero.health, 42 + (hero.level - 1) * 5); hero.mana = Math.min(hero.mana, 14 + (hero.level - 1) * 2);
  for (const weapon of Object.values(weapons)) hero.inventory[weapon.itemId] = (hero.inventory[weapon.itemId] ?? 0) + 1;
  if (hero.equipment.weapon) hero.equipment.weapon = weapons[hero.equipment.weapon].itemId;
  return { ...structuredClone(campaign), hero };
}
