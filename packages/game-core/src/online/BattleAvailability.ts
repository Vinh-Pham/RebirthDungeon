import type { BattleSession } from '../game/BattleSession';
import type { BattleAction } from '../engine/battle/BattleMachine';
import { BattleAvailabilitySchema, type BattleAvailability } from './Contracts';

/** No selection, turns, evidence, or RNG changes are allowed in this projection. */
export function battleAvailability(battle: BattleSession): BattleAvailability[] {
  const source = battle.engine.getEntity(battle.combat.currentTurn() ?? '');
  if (!source?.player || battle.combat.result) return [];
  const actions: BattleAction[] = [
    { action: 'attack' },
    { action: 'defend' },
    ...(source.learnedSkills?.rest ? [{ action: 'rest' as const }] : []),
    ...(source.skills ?? [])
      .filter((id) => battle.content.skill(id).battleUsable !== false)
      .map((skillId) => ({ action: 'skill' as const, skillId })),
    ...(source.itemHotbar ?? []).map((itemId) => ({ action: 'item' as const, itemId })),
  ];
  return actions.map((action) => {
    const targets = battle.battle.validTargetIds(action);
    const previews: BattleAvailability['previews'] = [];
    let reason: string | undefined;
    try {
      battle.battle.validatePlayerAction(action);
      if (action.action === 'attack' || action.action === 'skill') {
        for (const target of targets) {
          previews.push(
            action.action === 'skill'
              ? battle.combat.previewSkill(source.id, target, action.skillId!)
              : battle.combat.previewBasic(source.id, target),
          );
          if (previews.at(-1)?.area) break;
        }
      }
      if (!targets.length) throw new Error('No valid targets');
    } catch (error) {
      reason = error instanceof Error ? error.message : 'Action unavailable';
    }
    return BattleAvailabilitySchema.parse({ action, targets, previews, reason });
  });
}
