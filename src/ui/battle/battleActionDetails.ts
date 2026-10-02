import type { BattleAction } from '../../engine/battle/BattleMachine';
import type { Skill } from '../../data/schemas/content';
import type { GrowthTalent } from '../../engine/rpg/Stats';
import { skillEquipmentReason, skillForEntity } from '../../engine/rpg/Skills';
import type { BattleSession } from '../../game/BattleSession';
import { prepareBattleItem } from '../../engine/rpg/Consumables';
import { prepareBasicAttack } from '../../engine/battle/BasicAttack';

export const BATTLE_CATEGORIES = { combat: 'Combat', magic: 'Magic', items: 'Items' } as const;
export type BattleSkillCategory = keyof typeof BATTLE_CATEGORIES;
const attackSkills: Record<GrowthTalent, string> = {
  warrior: 'combat-mastery',
  archery: 'human-ranged-attack',
  mage: 'magic-mastery',
};
export interface BattleHotbarAction {
  id: string;
  label: string;
  skill: Skill;
  rank?: Skill['rank'];
  action: BattleAction;
}

export function battleHotbarItems(session: BattleSession) {
  const source = session.engine.world.entities.find((entity) => entity.player);
  return (source?.itemHotbar ?? []).map((itemId) => {
    const item = session.content.item(itemId);
    try {
      return {
        ...prepareBattleItem(source!, itemId, session.content),
        unavailableReason: undefined,
      };
    } catch (error) {
      return {
        item,
        quantity: source?.inventory?.[itemId] ?? 0,
        recovery: undefined,
        unavailableReason: error instanceof Error ? error.message : 'Item unavailable',
      };
    }
  });
}

/** Basic actions use catalog identities without granting or executing mastery skills. */
export function battleHotbarActions(
  session: BattleSession,
  category: BattleSkillCategory,
): BattleHotbarAction[] {
  if (category === 'items') return [];
  const source = session.engine.getEntity(session.getSnapshot().turnId ?? '');
  if (!source) return [];
  const basic =
    category === 'combat'
      ? (['attack', 'defend'] as const).map((action) => {
          const basicAttack = prepareBasicAttack(source, session.content);
          const skill = session.content.skill(
            action === 'attack'
              ? (basicAttack.skillId ??
                  (basicAttack.bow
                    ? 'combat-mastery'
                    : attackSkills[source.statSource?.growthTalent ?? 'warrior']))
              : 'defense',
          );
          return {
            id: action,
            label: action === 'attack' ? 'Attack' : 'Defend',
            skill,
            rank: source.learnedSkills?.[skill.id]?.rank,
            action: { action },
          };
        })
      : [];
  return [
    ...basic,
    ...battleSkills(session)
      .filter((skill) => skill.category === category)
      .map((skill) => ({
        id: skill.id,
        label: skill.name,
        skill,
        rank: skill.rank,
        action: { action: 'skill' as const, skillId: skill.id },
      })),
  ];
}

export function battleSkills(session: BattleSession) {
  const source = session.engine.getEntity(session.getSnapshot().turnId ?? '');
  if (!source) return [];
  return (source.skills ?? [])
    .filter((id) => session.content.skill(id).battleUsable !== false)
    .map((id) => skillForEntity(session.content, source, id));
}

/** Read the engine's target-aware previews without selecting or resolving an action. */
export function battleActionDetails(session: BattleSession, action: BattleAction) {
  const sourceId = session.getSnapshot().turnId;
  const source = sourceId ? session.engine.getEntity(sourceId) : undefined;
  type Preview = ReturnType<BattleSession['combat']['previewSkill']>;
  const previews: Preview[] = [];
  const failures: { targetId: string; reason: string }[] = [];
  if (!source || !sourceId) return { previews, failures, unavailableReason: 'Wait for your turn.' };
  if (action.action === 'skill') {
    const skill = skillForEntity(session.content, source, action.skillId!);
    const equipmentReason = skillEquipmentReason(source, skill, session.content);
    const cooldown = source.cooldowns?.[skill.id] ?? 0;
    if (equipmentReason || cooldown > 0)
      return {
        previews,
        failures,
        unavailableReason:
          equipmentReason ?? `Cooldown: ${cooldown} ${cooldown === 1 ? 'turn' : 'turns'}`,
      };
  }
  const targets = session.battle.validTargetIds(action);
  for (const targetId of targets) {
    try {
      const preview =
        action.action === 'skill'
          ? session.combat.previewSkill(sourceId, targetId, action.skillId!)
          : session.combat.previewBasic(sourceId, targetId);
      previews.push(preview);
      if (preview.area) break;
    } catch (error) {
      failures.push({
        targetId,
        reason: error instanceof Error ? error.message : 'Preview unavailable',
      });
    }
  }
  return {
    previews,
    failures,
    unavailableReason: previews.length ? undefined : (failures[0]?.reason ?? 'No valid targets.'),
  };
}
