import combatMastery from "./data/combat_mastery.json";
import defense from "./data/defense.json";
import counterattack from "./data/counterattack.json";
import criticalHit from "./data/critical_hit.json";
import dualWield from "./data/dual_wield_mastery.json";
import lightArmor from "./data/light_armor_mastery.json";
import heavyArmor from "./data/heavy_armor_mastery.json";
import swordMastery from "./data/sword_mastery.json";
import windmill from "./data/windmill.json";
import shieldMastery from "./data/shield_mastery.json";
import smash from "./data/smash.json";
import type { CombatCommand } from "../../app/contracts";

export const skillCommands: Partial<Record<string, Exclude<CombatCommand, "tonic">>> = {
  combat_mastery: "attack",
  defense: "defend",
  smash: "smash",
  counterattack: "counterattack",
  windmill: "windmill",
};

export interface TrainingTask {
  id: string;
  points: number;
  limit: number;
}
export interface SkillRank {
  rank: string;
  ap_cost?: number;
  effects?: Record<string, unknown>;
  game_effects?: Record<string, unknown>;
  training?: TrainingTask[];
  game_training?: TrainingTask[];
  training_required?: number;
  game_training_required?: number;
}
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  ranks: SkillRank[];
}
export const skillCatalog = Object.fromEntries(
  [
    combatMastery,
    defense,
    counterattack,
    criticalHit,
    dualWield,
    lightArmor,
    heavyArmor,
    swordMastery,
    windmill,
    shieldMastery,
    smash,
  ].map((skill) => [skill.id, skill]),
) as unknown as Record<string, SkillDefinition>;
export interface RankedSkill {
  rank: string;
  training: Record<string, number>;
}
export function rankData(id: string, rank: string) {
  return skillCatalog[id]?.ranks.find((value) => value.rank === rank);
}
export function recordTraining(
  skills: Record<string, RankedSkill>,
  events: string[],
) {
  const next = structuredClone(skills);
  for (const [id, progress] of Object.entries(next)) {
    const rank = rankData(id, progress.rank);
    for (const task of rank?.game_training ?? rank?.training ?? [])
      for (const event of events)
        if (task.id === event)
          progress.training[task.id] = Math.min(
            task.limit,
            (progress.training[task.id] ?? 0) + 1,
          );
  }
  return next;
}
export function rankUp(id: string, progress: RankedSkill, ap: number) {
  const skill = skillCatalog[id];
  const index =
    skill?.ranks.findIndex((value) => value.rank === progress.rank) ?? -1;
  if (!skill || index < 0 || !skill.ranks[index + 1]) return null;
  const rank = skill.ranks[index];
  const required = rank.game_training_required ?? rank.training_required ?? 0;
  const points = (rank.game_training ?? rank.training ?? []).reduce(
    (sum, task) => sum + task.points * (progress.training[task.id] ?? 0),
    0,
  );
  const cost = skill.ranks[index + 1].ap_cost ?? 0;
  if (required <= 0 || points + 0.00001 < required || ap < cost) return null;
  return {
    skill: { rank: skill.ranks[index + 1].rank, training: {} },
    ap: ap - cost,
  };
}
