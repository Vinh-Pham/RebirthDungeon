import type { Immutable } from 'immer';
import type { Character } from './model';
import type { BattleCommand } from './battle/engine';
import { enemySkills, type EnemySkillId } from './battle/profiles';
import { consumableReason } from './battle/items';
/** AI selects ordinary commands. Spending and effects belong to the shared engine. */
export function chooseEnemyCommand(c: Immutable<Character>): BattleCommand {
    const b = c.battle!;
    const e = b.enemies.find((enemy) => enemy.id === b.order[b.cursor])!;
    const identity = { actorId: e.id, turnId: b.turnId };
    const potion =
        !b.itemUsed && e.allowsItems && e.hp <= e.maxHp * 0.35
            ? e.consumables.find((item) => !consumableReason(e, item.id))
            : undefined;
    if (potion) return { ...identity, type: 'BATTLE_ITEM', id: potion.id };
    const action = (kind: 'attack' | 'defend' | 'wait'): BattleCommand => ({
        ...identity,
        type: 'BATTLE_ACTION',
        action: kind,
    });
    if (e.hp <= e.maxHp * 0.25 && !e.defendedLastTurn && e.stamina >= 1) return action('defend');
    const skill = e.skills.find(
        (id) =>
            enemySkills[id as EnemySkillId] &&
            !(e.cooldowns[id] > 0) &&
            e.stamina >= enemySkills[id as EnemySkillId].cost,
    );
    if (skill) return { ...identity, type: 'BATTLE_ACTION', action: 'skill', skill };
    return action(e.stamina >= 2 ? 'attack' : e.stamina >= 1 ? 'defend' : 'wait');
}