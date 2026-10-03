import type { EnchantDefinition, EnchantStat } from '../../data/schemas/enchants';
import { SKILL_RANKS } from '../../data/schemas/skillRank';
import type { ContentRegistry } from '../data/ContentRegistry';
import type { EnchantedEquipment } from './EnchantState';
import type { LearnedSkills } from './Skills';
export type EnchantFacts = { level: number; growthTalent: string; learnedSkills: LearnedSkills };
export type EnchantContribution = {
  sourceId: string;
  name: string;
  stat: EnchantStat;
  value: number;
  active: boolean;
  condition: string;
};
export function conditionText(
  conditions: EnchantDefinition['clauses'][number]['conditions'],
  content: ContentRegistry,
) {
  return conditions
    .map((c) =>
      c.kind === 'skill'
        ? `${content.skill(c.skillId).name} ${c.rank} or better`
        : c.kind === 'level'
          ? `Level ${c.minimum}+`
          : `${c.talent} talent`,
    )
    .join(' and ');
}
export function clauseActive(
  conditions: EnchantDefinition['clauses'][number]['conditions'],
  facts: EnchantFacts,
) {
  return conditions.every((c) =>
    c.kind === 'level'
      ? facts.level >= c.minimum
      : c.kind === 'talent'
        ? facts.growthTalent === c.talent
        : !!facts.learnedSkills[c.skillId] &&
          SKILL_RANKS.indexOf(facts.learnedSkills[c.skillId].rank) >= SKILL_RANKS.indexOf(c.rank),
  );
}
export function equipmentEnchantEffects(
  instanceId: string,
  equipment: EnchantedEquipment,
  facts: EnchantFacts,
  content: ContentRegistry,
): EnchantContribution[] {
  return (['prefix', 'suffix'] as const).flatMap((slot) => {
    const installed = equipment[slot];
    if (!installed) return [];
    const definition = content.data.enchants.find((e) => e.id === installed.enchantId);
    if (!definition) throw new Error('Unknown installed enchant');
    return definition.clauses.map((c) => ({
      sourceId: `${instanceId}/${slot}/${c.id}`,
      name: definition.name,
      stat: c.stat,
      value: installed.values[c.id],
      active: clauseActive(c.conditions, facts),
      condition: conditionText(c.conditions, content),
    }));
  });
}
