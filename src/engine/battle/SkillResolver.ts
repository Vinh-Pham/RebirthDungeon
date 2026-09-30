import type { Entity } from '../ecs/Entity';
import type { GameRandom } from '../Random';
import type { Skill } from '../../data/schemas/content';
import { prepareAttack, validateCombatEntity } from './AttackResolver';

export function prepareSkill({ source, targets, skill, random }: {
  source: Entity; targets: readonly Entity[]; skill: Skill; random: GameRandom;
}) {
  validateCombatEntity(source);
  if (skill.battleUsable === false) throw new Error('Skill is unavailable in battle');
  if (!source.skills?.includes(skill.id)) throw new Error('Source does not know this skill');
  const mana = source.mana;
  if (!mana || !Number.isSafeInteger(mana.max) || mana.max < 0 || !Number.isSafeInteger(mana.current) ||
      mana.current < 0 || mana.current > mana.max || mana.current < skill.manaCost) {
    throw new Error('Invalid or insufficient mana');
  }
  if (!targets.length) throw new Error('Skill requires a living target');
  for (const target of targets) {
    validateCombatEntity(target);
    const allied = !!target.player === !!source.player;
    if ((skill.target === 'self' && target.id !== source.id) ||
        (skill.target === 'ally' && !allied) ||
        (['enemy', 'allEnemies'].includes(skill.target) && allied)) throw new Error('Invalid skill target');
  }
  const caster = { ...source, combatant: { ...source.combatant,
    attack: source.combatant.attack + skill.power, hitChance: skill.hitChance, criticalChance: skill.criticalChance } };
  // Prepare every target before rolling, so a malformed second target cannot spend RNG.
  const resolvers = skill.effect === 'damage'
    ? targets.map((target) => prepareAttack({ attacker: caster, target, random })) : [];
  return {
    manaAfter: mana.current - skill.manaCost,
    resolve: () => targets.map((target, index) => ({ target,
      result: skill.effect === 'damage' ? resolvers[index]() : { hit: true, critical: false, damage: 0 },
      healing: skill.effect === 'heal' ? Math.min(skill.power, target.health!.max - target.health!.current) : 0,
    })),
  };
}
