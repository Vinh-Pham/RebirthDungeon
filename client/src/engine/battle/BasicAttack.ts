import type { ContentRegistry } from '../data/ContentRegistry';
import type { Entity } from '../ecs/Entity';
import { gameRank } from '../rpg/Skills';
import { staminaCost } from '../rpg/Resources';
import { calculateCharacterStats, rangedAttackSkillId, unarmedStatSource } from '../rpg/Stats';
import { effectiveEntity } from '../rpg/StatusEffects';

/** One read-only preparation path for previews, costs, ammunition and fist fallback. */
export function prepareBasicAttack(source: Entity, content?: ContentRegistry) {
  const weapon = source.weapon && content ? content.item(source.weapon.itemId) : undefined;
  const bow = !!weapon?.weaponTags.includes('bow');
  const ammunitionItemId = source.ammunitionItemId;
  const loaded =
    bow &&
    (source.weapon?.durability ?? 0) > 0 &&
    !!ammunitionItemId &&
    !!source.inventory?.[ammunitionItemId] &&
    content?.item(ammunitionItemId).kind === 'ammunition';
  const skillId = loaded ? rangedAttackSkillId(source.learnedSkills ?? {}) : undefined;
  const rank = skillId ? (source.learnedSkills?.[skillId]?.rank ?? 'F') : undefined;
  const cost = source.stamina
    ? staminaCost(source, skillId ? gameRank(content!.skill(skillId), rank!).staminaCost : 2)
    : 0;
  const exhausted = !!source.stamina && source.stamina.current < cost;
  const fallback = exhausted || (bow && !loaded);
  const statSource =
    fallback && source.statSource ? unarmedStatSource(source.statSource) : undefined;
  const attacker = effectiveEntity(
    fallback && statSource && content
      ? { ...source, combatant: calculateCharacterStats(statSource, content).combatant }
      : source,
    content,
  );
  return {
    attacker,
    cost,
    bow,
    usesWeapon: !fallback && (source.weapon?.durability ?? 0) > 0,
    ammunitionItemId: loaded && !exhausted ? ammunitionItemId : undefined,
    skillId: !fallback ? skillId : undefined,
    rank: !fallback ? rank : undefined,
    fallbackReason: fallback
      ? exhausted
        ? 'Insufficient stamina: Attack uses bare hands.'
        : source.weapon?.durability === 0
          ? 'Broken bow: Attack uses bare hands.'
          : 'No equipped arrows: Attack uses bare hands.'
      : undefined,
  };
}
