import type { CharacterForm } from "../../app/contracts";
import { rankData, type RankedSkill } from "../content/skills";
import type { Combatant } from "../systems/combat";

import { startingAttributes, talentAgeGrowth, talentBaseBonuses, talentLevelGrowth } from "../content/character-growth";
import { effectiveProtection } from "../content/protection";

export const resourceRegen = { health: 0.12, mana: 0.05, stamina: 0.4 } as const;
export const movementSpeed = (race: number) => (race === 1 ? 1.14 : 1);

export interface Attributes {
  life: number;
  mana: number;
  stamina: number;
  strength: number;
  intelligence: number;
  dexterity: number;
  will: number;
  luck: number;
}
export interface GearStats {
  armor?: "light" | "heavy";
  shield?: boolean;
  dualWield?: boolean;
  protection?: number;
  magicDefense?: number;
  magicProtection?: number;
  bonusDamage?: number;
  attributes?: Partial<Attributes>;
  age?: number;
}
interface Weapon {
  damage_min?: number;
  damage_max?: number;
  weapon_type?: string;
  hands?: number;
  balance?: number;
  critical?: number;
}

export function deriveStats(
  form: CharacterForm,
  level: number,
  skills: Record<string, RankedSkill> = {},
  weapon?: Weapon,
  equipmentDefense = 0,
  gear: GearStats = {},
) {
  const stats: Attributes = { ...startingAttributes };
  function add(bonuses: Partial<Attributes> | undefined, multiplier = 1) {
    for (const key of Object.keys(bonuses ?? {}) as Array<keyof Attributes>)
      stats[key] += (bonuses?.[key] ?? 0) * multiplier;
  }
  add(talentLevelGrowth[form.talent], level - 1);
  add(talentBaseBonuses[form.talent]);
  add(talentAgeGrowth[form.talent], Math.max(0, Math.min(20, gear.age ?? form.age) - form.age));
  const effects = Object.fromEntries(
    Object.entries(skills).map(([id, progress]) => {
      const rank = rankData(id, progress.rank);
      return [id, rank?.game_effects ?? rank?.effects ?? {}];
    }),
  ) as NonNullable<Combatant["skill_effects"]>;
  const effect = (id: string, key: string, fallback = 0) => Number(effects[id]?.[key] ?? fallback);
  const race = ["human", "elf", "giant"][form.race];
  const mastery = (key: string) => effect("combat_mastery", key.replace("_human_", `_${race}_`));
  add({
    life: mastery("additional_hp_total") + effect("defense", "additional_hp_total"),
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
  add(gear.attributes);
  const armorSkill = gear.armor ? `${gear.armor}_armor_mastery` : "";
  if (gear.armor === "heavy") stats.dexterity *= 1 - effect(armorSkill, `dex_reduction_${race}`) / 100;
  for (const key of Object.keys(stats) as (keyof Attributes)[])
    stats[key] = Math.max(0, Math.round(stats[key] * 10) / 10);
  for (const key of ["strength", "intelligence", "dexterity", "will", "luck"] as const)
    stats[key] = Math.min(1500, stats[key]);
  const str = Math.max(0, stats.strength - 10);
  const dex = Math.max(0, stats.dexterity - 10);
  const int = Math.max(0, stats.intelligence - 10);
  const will = Math.max(0, stats.will - 10);
  const luck = Math.max(0, stats.luck - 10);
  const kind = weapon?.weapon_type ?? "sword";
  const sword = Boolean(weapon) && kind === "sword";
  const ratios: Record<string, [number, number]> = {
    control_bar: [str / 5 + dex / 5, str / 3.5 + dex / 3.5],
    atlatl: [str / 5, str / 3],
    dual_gun: [(str + int) / 5, (str + int) / 4],
    shuriken: [(str + will) / 5, (str + will) / 4],
    bow: [dex / 3.5, dex / 2.5],
    crossbow: [dex / 3.5, dex / 2.5],
    chain_blade: [dex / 3.5 + luck / 5, dex / 2.5 + luck / 4],
    knuckle: [will / 3.5, will / 3],
  };
  const [low, high] = ratios[kind] ?? [str / 3, str / 2.5];
  const damageMax = Math.floor(
    (weapon?.damage_max ?? 8) +
      high +
      mastery("additional_max_damage_human_total") +
      (sword ? effect("sword_mastery", "additional_max_damage") : 0),
  );
  const damageMin = Math.floor(
    (weapon?.damage_min ?? 0) +
      low +
      mastery("additional_min_damage_human_total") +
      (sword ? effect("sword_mastery", "additional_min_damage") : 0),
  );
  const protection = Math.max(
    0,
    (gear.protection ?? 0) +
      effect(armorSkill, "additional_protection") +
      (gear.shield ? effect("shield_mastery", "small_shield_protection_bonus") : 0),
  );
  const magicProtection = Math.max(
    0,
    int / 20 +
      (gear.magicProtection ?? 0) +
      effect(armorSkill, "additional_magic_protection") +
      (gear.shield ? effect("shield_mastery", "small_shield_magic_protection_bonus") : 0),
  );
  return {
    ...stats,
    name: form.name,
    race: form.race,
    health: Math.max(1, Math.min(2500, stats.life)),
    mana: Math.max(0, Math.min(2500, stats.mana)),
    stamina: Math.max(0, Math.min(2500, stats.stamina)),
    damage_min: Math.max(0, Math.min(damageMin, damageMax)),
    damage_max: Math.max(0, damageMax),
    bonus_damage: gear.bonusDamage ?? 0,
    defense: Math.max(
      0,
      str / 10 +
        effect("defense", `additional_base_defense_${race}_total`) +
        equipmentDefense +
        effect(armorSkill, "additional_defense") +
        (gear.shield ? effect("shield_mastery", "small_shield_defense_bonus") : 0),
    ),
    protection,
    effective_protection: effectiveProtection(protection),
    magic_defense: Math.max(
      0,
      will / 10 +
        (gear.magicDefense ?? 0) +
        effect(armorSkill, "additional_magic_defense") +
        (gear.shield ? effect("shield_mastery", "small_shield_magic_defense_bonus") : 0),
    ),
    magic_protection: magicProtection,
    effective_magic_protection: effectiveProtection(magicProtection, true),
    magic_attack: int / 5,
    magic_balance: Math.min(100, 30 + int / 4),
    magic_cast_reduction: int / 5000,
    magic_mana_reduction: int / 5000,
    balance: Math.max(
      0,
      Math.min(
        80,
        Math.min(50, 8.728944 * Math.log2((stats.dexterity + 9.814582) / 20.34565)) +
          (weapon?.balance ?? (weapon ? 0 : 30)) +
          mastery("additional_melee_balance_total") +
          (sword ? effect("sword_mastery", "additional_sword_balance") * (gear.dualWield ? 2 : 1) : 0),
      ),
    ),
    critical: Math.min(
      999.9,
      Math.max(0, (stats.will - 10) / 10 + (stats.luck - 10) / 5 + (weapon?.critical ?? (weapon ? 0 : 10))),
    ),
    critical_cap: 30,
    critical_enabled: true,
    deadly_enabled: true,
    unarmed_min: Math.floor(str / 3 + mastery("additional_min_damage_human_total")),
    unarmed_max: Math.floor(8 + str / 2.5 + mastery("additional_max_damage_human_total")),
    critical_multiplier: 1 + effect("critical_hit", "additional_damage", 50) / 100,
    armor_pierce: dex / 15,
    injury_min: (dex + will) / 20,
    injury_max: dex / 10 + will / 5,
    movement_speed: movementSpeed(form.race),
    alchemic_damage: (Math.min(2500, stats.life) + Math.min(2500, stats.mana) + Math.min(2500, stats.stamina)) / 15,
    life_skill_success_bonus: Math.min(18, stats.dexterity / 10),
    lucky_gather: stats.luck / 2000,
    huge_lucky_gather: stats.luck / 50000,
    lucky_finish_multiplier: 1 + Math.min(180, stats.luck) * 0.005,
    weapon_type: weapon ? kind : undefined,
    weapon_hands: weapon?.hands,
    light_armor_equipped: gear.armor === "light",
    heavy_armor_equipped: gear.armor === "heavy",
    shield_equipped: Boolean(gear.shield),
    dual_wielding: Boolean(gear.dualWield),
    learned_skills: Object.keys(skills),
    skill_effects: effects,
  };
}
