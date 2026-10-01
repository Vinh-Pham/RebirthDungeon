import type { Entity } from '../ecs/Entity';
import type { GameRandom } from '../Random';
import type { Skill } from '../../data/schemas/content';
import { effectiveCriticalChance, previewAttack, prepareAttack, sampleDamage, validateCombatEntity } from './AttackResolver';
import { healableHealth, staminaCost } from '../rpg/Resources';
export function prepareSkill({ source, targets, skill, random, selectedTargetId }: {
  source: Entity; targets: readonly Entity[]; skill: Skill; random: GameRandom; selectedTargetId?: string;
}) {
  validateCombatEntity(source);
  if (skill.battleUsable === false || skill.kind === 'passive') throw new Error('Skill is unavailable in battle');
  if (!source.skills?.includes(skill.id)) throw new Error('Source does not know this skill');
  const mana = source.mana;
  if (!mana || !Number.isSafeInteger(mana.max) || mana.max < 0 || !Number.isSafeInteger(mana.current) || mana.current < 0 || mana.current > mana.max || mana.current < skill.manaCost) throw new Error('Invalid or insufficient mana');
  if (!targets.length) throw new Error('Skill requires a living target');
  for (const target of targets) {
    validateCombatEntity(target); const allied = !!target.player === !!source.player;
    if ((skill.target === 'self' && target.id !== source.id) || (skill.target === 'ally' && !allied) || (['enemy', 'allEnemies'].includes(skill.target) && allied)) throw new Error('Invalid skill target');
  }
  const cost = staminaCost(source, skill.effect === 'heal' && targets.every((t) => t.id !== source.id) ? 0 : skill.staminaCost);
  if (cost && source.stamina && source.stamina.current < cost) throw new Error('Insufficient stamina');
  const modern = source.combatant.minDamage !== undefined;
  const magical = skill.element !== 'physical' || skill.effect === 'heal'; const attack = source.combatant;
  const min = magical ? (skill.minPower ?? skill.power) + Math.floor((attack.magicAttack ?? 0) * skill.minMagicModifier) : (attack.minDamage ?? attack.attack) + (skill.minPower ?? skill.power);
  const max = magical ? (skill.maxPower ?? skill.power) + Math.floor((attack.magicAttack ?? 0) * skill.maxMagicModifier) : (attack.maxDamage ?? attack.attack) + (skill.maxPower ?? skill.power);
  const caster = { ...source, combatant: { ...attack, attack: attack.attack + skill.power, hitChance: skill.hitChance,
    ...(modern ? { minDamage: min, maxDamage: max } : { criticalChance: skill.criticalChance }) } };
  const resolvers = skill.effect === 'damage' ? targets.map((target) => prepareAttack({ attacker: caster, target, random, magical })) : [];
  const selected = Math.max(0, targets.findIndex((t) => t.id === selectedTargetId));
  return { preview: targets.map((target) => skill.effect === 'damage' ? { targetId: target.id, ...previewAttack(caster, target, magical) } : {
      targetId: target.id, hitChance: 1, criticalChance: 0, min: skill.effect === 'heal' ? Math.max(0, Math.min(modern ? min : skill.power, healableHealth(target) - target.health!.current)) : 0,
      max: skill.effect === 'heal' ? Math.max(0, Math.min(modern ? max : skill.power, healableHealth(target) - target.health!.current)) : 0, criticalMin: 0, criticalMax: 0 }),
    staminaCost: cost, manaCost: skill.manaCost, manaAfter: mana.current - skill.manaCost, staminaAfter: source.stamina ? source.stamina.current - cost : undefined,
    resolve: () => {
      // Resolve selected target first; one critical roll applies to all successful targets.
      const first = skill.effect === 'damage' ? resolvers[selected]() : undefined;
      // A selected-target miss still needs one shared critical roll for other targets.
      const shared = modern && targets.length > 1 ? first?.hit ? first.critical : random.chance(effectiveCriticalChance(caster.combatant, targets[selected].combatant!, magical)) : undefined;
      return targets.map((target, index) => ({ target, result: skill.effect === 'damage' ? index === selected ? first! : resolvers[index](shared) : { hit: true, critical: false, damage: 0, injury: 0 },
        healing: skill.effect === 'heal' ? Math.max(0, Math.min(modern ? sampleDamage(random, min, max, attack.magicBalance ?? .5) : skill.power, healableHealth(target) - target.health!.current)) : 0 }));
    } };
}
