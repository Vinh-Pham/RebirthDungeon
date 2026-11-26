import type { CharacterForm } from "../../app/contracts";
import { rankData, type RankedSkill } from "../content/skills";
import type { Combatant } from "../systems/combat";

const raceBonuses = [
  { life: 5, will: 3 },
  { mana: 10, intelligence: 4, dexterity: 2 },
  { life: 10, strength: 4, stamina: 5 },
];
const talentBonuses = [
  { life: 10, strength: 4, will: 2 },
  { mana: 15, intelligence: 6 },
  { stamina: 10, dexterity: 4, luck: 4 },
];
const talentGrowth = [
  { strength: 0.5 },
  { intelligence: 0.5 },
  { life: 0.25, stamina: 0.25 },
  { dexterity: 0.5 },
  { mana: 0.5, stamina: 0.5 },
  { strength: 0.25, will: 0.25 },
  { stamina: 0.5 },
  { dexterity: 0.25, luck: 0.25 },
  { stamina: 0.25, dexterity: 0.25 },
  {},
  { strength: 0.25, intelligence: 0.25 },
  { stamina: 0.25, strength: 0.25 },
  { intelligence: 0.5 },
  { strength: 0.5 },
  { will: 0.5 },
  { stamina: 0.25, will: 0.25 },
  { luck: 0.5 },
  { life: 0.25, stamina: 0.25 },
  { strength: 0.25, will: 0.25 },
  { will: 0.25, luck: 0.25 },
  { stamina: 0.25, dexterity: 0.25 },
  { stamina: 0.25, dexterity: 0.25 },
  { stamina: 0.25, dexterity: 0.25 },
  { mana: 0.5, stamina: 0.5 },
];
const xpThresholdFactor = 50;

export function levelForXp(xp: number) {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + 4 * xp / xpThresholdFactor)) / 2));
}

export function xpForLevel(level: number) {
  return xpThresholdFactor * level * (level - 1);
}

interface Weapon {
  damage_min?: number;
  damage_max?: number;
  weapon_type?: string;
  hands?: number;
}

export function deriveStats(
  form: CharacterForm,
  level: number,
  skills: Record<string, RankedSkill> = {},
  weapon?: Weapon,
  equipmentDefense = 0,
) {
  const growth = level - 1;
  const age = form.age - 17;
  const stats = {
    life: 100 + growth * 5 + age * 2,
    mana: 35 + growth * 3,
    stamina: 40 + growth * 3 + age,
    strength: 18 + growth + age * 0.5,
    intelligence: 18 + growth,
    dexterity: 18 + growth,
    will: 18 + growth + age * 0.5,
    luck: 16 + growth * 0.5,
  };
  function add(bonuses: Partial<typeof stats> | undefined, multiplier = 1) {
    for (const key of Object.keys(bonuses ?? {}) as Array<keyof typeof stats>)
      stats[key] += (bonuses?.[key] ?? 0) * multiplier;
  }
  add(raceBonuses[form.race]);
  add(talentBonuses[form.talent]);
  add(talentGrowth[form.talent], growth + (form.talent > 2 ? 8 : 0));
  if (form.talent === 9) add({ dexterity: 4, will: 4 });
  const effects = Object.fromEntries(
    Object.entries(skills).map(([id, progress]) => {
      const rank = rankData(id, progress.rank);
      return [id, rank?.game_effects ?? rank?.effects ?? {}];
    }),
  ) as NonNullable<Combatant["skill_effects"]>;
  const effect = (id: string, key: string, fallback = 0) =>
    Number(effects[id]?.[key] ?? fallback);
  const mastery = (key: string) => effect("combat_mastery", key);
  add({
    life:
      mastery("additional_hp_total") + effect("defense", "additional_hp_total"),
    strength:
      mastery("additional_strength_human_total") +
      effect("smash", "additional_str_and_will_total") +
      effect("windmill", "additional_str_total"),
    dexterity:
      mastery("additional_dexterity_human_total") +
      effect("counterattack", "additional_dexterity_total") +
      effect("sword_mastery", "additional_dex_total"),
    will:
      effect("critical_hit", "additional_will_total") +
      effect("windmill", "additional_will_total") +
      effect("smash", "additional_str_and_will_total"),
  });
  const str = Math.max(0, stats.strength - 10);
  const sword =
    weapon && (!weapon.weapon_type || weapon.weapon_type === "sword");
  return {
    name: form.name,
    health: Math.min(2500, Math.floor(stats.life)),
    mana: Math.min(2500, Math.floor(stats.mana)),
    stamina: Math.min(2500, Math.floor(stats.stamina)),
    damage_min:
      (weapon?.damage_min ?? 4) +
      Math.floor(str / 3) +
      mastery("additional_min_damage_human_total") +
      (sword ? effect("sword_mastery", "additional_min_damage") : 0),
    damage_max:
      (weapon?.damage_max ?? 4) +
      Math.floor(str / 2.5) +
      mastery("additional_max_damage_human_total") +
      (sword ? effect("sword_mastery", "additional_max_damage") : 0),
    defense:
      Math.floor(str / 10) +
      effect("defense", "additional_base_defense_human_total") +
      equipmentDefense,
    balance: Math.min(
      80,
      30 +
        8.728944 * Math.log2((stats.dexterity + 9.814582) / 20.34565) +
        (weapon ? 5 : 0) +
        (sword ? effect("sword_mastery", "additional_sword_balance") : 0) +
        mastery("additional_melee_balance_total"),
    ),
    critical: Math.max(
      0,
      (stats.will - 10) / 10 + (stats.luck - 10) / 5 + (weapon ? 0 : 10),
    ),
    critical_multiplier:
      1 + effect("critical_hit", "additional_damage", 50) / 100,
    armor_pierce: Math.floor(Math.max(0, stats.dexterity - 10) / 15),
    weapon_type: weapon ? (weapon.weapon_type ?? "sword") : undefined,
    weapon_hands: weapon?.hands,
    learned_skills: Object.keys(skills),
    skill_effects: effects,
  };
}
