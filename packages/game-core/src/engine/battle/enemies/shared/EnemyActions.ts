import type { GameEngine } from '../../../GameEngine';
import type { ContentRegistry } from '../../../data/ContentRegistry';
import type { Entity } from '../../../ecs/Entity';
import type { CombatSystem } from '../../../ecs/systems/CombatSystem';
import { validateCombatEntity } from '../../AttackResolver';
import { prepareBasicAttack } from '../../BasicAttack';
import { healableHealth, staminaCost } from '../../../rpg/Resources';
import { skillEquipmentReason, skillForEntity } from '../../../rpg/Skills';
import type { EnemyActorView, EnemyActionCandidate } from '../EnemyBattleBehavior';

export function enemyActorView(entity: Entity): EnemyActorView {
  validateCombatEntity(entity);
  return Object.freeze({
    id: entity.id,
    health: entity.health.current,
    maxHealth: entity.health.max,
    healableHealth: healableHealth(entity),
    stamina: entity.stamina?.current ?? 0,
    maxStamina: entity.stamina?.max ?? 0,
    mana: entity.mana?.current ?? 0,
    maxMana: entity.mana?.max ?? 0,
    statuses: Object.freeze((entity.statuses ?? []).map((s) => s.id)),
  });
}
export function prepareEnemyActions(
  engine: GameEngine,
  combat: CombatSystem,
  content: ContentRegistry,
  source: Entity,
) {
  validateCombatEntity(source);
  const participants = combat.turnOrder
    .map((id) => engine.getEntity(id)!)
    .filter((e) => e?.health?.current && !e.dead);
  const hostiles = participants.filter((e) => !!e.player !== !!source.player);
  const hostile = hostiles.reduce<Entity | undefined>(
    (best, e) => (!best || e.health!.current < best.health!.current ? e : best),
    undefined,
  );
  if (!hostile) throw new Error('No living hostile target');
  const candidates: EnemyActionCandidate[] = [
    {
      action: { action: 'attack' },
      targetId: hostile.id,
      kind: 'attack',
      staminaCost: prepareBasicAttack(source, content).cost,
    },
  ];
  for (const id of source.skills ?? []) {
    const skill = skillForEntity(content, source, id);
    if (skill.enemyUse?.type === 'defend') {
      candidates.push({
        action: { action: 'defend' },
        targetId: source.id,
        kind: 'defend',
        staminaCost: 0,
      });
      continue;
    }
    if (
      skill.kind === 'passive' ||
      skill.kind === 'life' ||
      skill.battleUsable === false ||
      (source.cooldowns?.[id] ?? 0) > 0 ||
      skillEquipmentReason(source, skill, content) ||
      !source.mana ||
      source.mana.current < skill.manaCost
    )
      continue;
    const targets =
      skill.target === 'self'
        ? [source]
        : skill.target === 'ally'
          ? participants.filter((e) => !!e.player === !!source.player)
          : [hostile];
    const useful = targets.filter((target) => {
      if (skill.effect === 'heal') return target.health!.current < healableHealth(target) * 0.5;
      if (skill.effect === 'buff')
        return skill.statuses.some((id) => !(target.statuses ?? []).some((s) => s.id === id));
      return true;
    });
    if (skill.effect === 'heal')
      useful.sort(
        (a, b) => a.health!.current / healableHealth(a) - b.health!.current / healableHealth(b),
      );
    const target = useful[0];
    if (!target) continue;
    const cost = staminaCost(
      source,
      skill.effect === 'heal' && target.id !== source.id ? 0 : skill.staminaCost,
    );
    if (cost > (source.stamina?.current ?? 0)) continue;
    // Preparation shares the resolver's validation and previews without executing its RNG closure.
    combat.previewSkill(source.id, target.id, id);
    candidates.push({
      action: { action: 'skill', skillId: id },
      targetId: target.id,
      kind: skill.effect,
      staminaCost: cost,
    });
  }
  return {
    participants: Object.freeze(participants.map(enemyActorView)),
    candidates: Object.freeze(
      candidates.map((c) => Object.freeze({ ...c, action: Object.freeze(c.action) })),
    ),
  };
}
