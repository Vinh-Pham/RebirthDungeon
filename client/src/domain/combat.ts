import { statusDefinitions } from './stats/statusCatalog';
import { applyStatus, completeStatusActivation } from './stats/statuses';
import { enemyStats } from './stats/resolve';
import { affordability } from './stats/resources';
import type { Immutable } from 'immer';
import type { ActionSnapshot, Character, Enemy } from './model';
import { wikiValue } from './skills/wiki';
import { skills, ranks } from './Skills';
import { createRng } from './rng';
import { emit } from './battle/events';
import {
    defenses,
    snapshotAction,
    train,
    requirementReason,
    effectiveStats,
    equipment,
    refreshStats,
} from './skillSystem';

export function damageAmount(
    power: number,
    multiplier: number,
    defense: number,
    protection: number,
    criticalBonus = 0,
) {
    const mitigated = Math.floor(Math.max(0, power - defense) * multiplier);
    return Math.floor(
        Math.floor(mitigated * (1 + criticalBonus)) * (1 - Math.max(0, Math.min(1, protection))),
    );
}
export function actionPower(a: Immutable<ActionSnapshot>) {
    return (
        a.rank.base +
        (a.attack * (a.rank.attackMultiplier ?? 1)) /
            (a.skill === 'arrowRevolver' ? 1 : skills[a.skill].hits)
    );
}
export function previewDamage(
    c: Immutable<Character>,
    enemy: Immutable<Enemy>,
    id: string,
    critical = false,
): number {
    const a = snapshotAction(c, id, enemy.id, false);
    if (skills[id].effect !== 'attack') return 0;
    const t = a.targets.find((t) => t.id === enemy.id);
    if (!t) return 0;
    const damage =
        damageAmount(actionPower(a), 1, t.defense, t.protection, critical ? a.criticalBonus : 0) *
        skills[id].hits;
    return Math.min(enemy.hp, Math.max(0, damage - (enemy.shield ?? 0)));
}
export function hitEnemy(enemy: Enemy, amount: number) {
    const absorbed = Math.min(enemy.shield ?? 0, amount);
    enemy.shield = (enemy.shield ?? 0) - absorbed;
    const before = enemy.hp;
    enemy.hp = Math.max(0, enemy.hp - (amount - absorbed));
    return before - enemy.hp;
}
export function trainOffense(
    c: Character,
    a: Immutable<Pick<ActionSnapshot, 'skill' | 'melee' | 'sword' | 'dual'>>,
    hit: boolean,
    kills: number,
    criticalHit = false,
    criticalKills = 0,
) {
    for (const id of [
        a.skill,
        ...(a.melee || a.skill === 'normal' ? ['combatMastery'] : []),
        ...(a.sword ? ['swordMastery'] : []),
        ...(a.dual ? ['dualMastery'] : []),
        ...((skills[a.skill].talent ?? equipment(c).weapon?.talent) === 'Magic'
            ? ['magicMastery']
            : []),
        ...((skills[a.skill].talent ?? equipment(c).weapon?.talent) === 'Archery'
            ? ['bowMastery', 'rangeAttack'].filter((id) => id !== a.skill)
            : []),
    ]) {
        if (hit) train(c, id, 'hit');
        if (kills) train(c, id, 'kill', kills);
    }
    if (hit && a.melee && c.effects.final) train(c, 'final', 'buffHit');
    if (criticalHit) train(c, 'critical', 'critical');
    if (criticalKills) train(c, 'critical', 'criticalKill', criticalKills);
}
export function commitAbility(c: Character, a: ActionSnapshot, operationId: string) {
    const b = c.battle!;
    const skill = skills[a.skill];
    const reason = affordability(c, a.costs, false);
    if (reason) throw new Error(reason);
    for (const pool of ['hp', 'mana', 'stamina'] as const)
        c[pool] = Math.round((c[pool] - a.costs[pool]) * 1e10) / 1e10;
    if (skill.effect === 'counter') {
        c.effects.counter = {
            power: actionPower(a),
            opponentMultiplier: a.rank.counterMultiplier ?? 0,
            source: { skill: a.skill, melee: a.melee, sword: a.sword, dual: a.dual },
        };
        train(c, 'counter', 'use');
        b.log.push('Counterattack prepared.');
    } else if (skill.effect === 'buff') {
        c.effects.final = {
            magnitude: a.rank.base,
            remaining: a.rank.duration,
        };
        train(c, 'final', 'use');
        b.log.push(`Final Hit grants +${c.effects.final.magnitude} melee attack.`);
    } else if (skill.effect === 'heal') {
        const amount = Math.floor(a.rank.base * 5);
        const before = c.hp;
        c.hp = Math.min(effectiveStats(c).hp, c.hp + amount);
        train(c, a.skill, 'use');
        b.log.push(`${skill.name} restores ${c.hp - before} HP.`);
    } else if (skill.effect === 'restoreMana') {
        const before = c.mana;
        const max = effectiveStats(c).mana;
        c.mana = Math.min(max, c.mana + Math.floor((max * a.rank.base) / 100));
        train(c, a.skill, 'use');
        b.log.push(`${skill.name} restores ${c.mana - before} MP.`);
    } else if (skill.effect === 'defend') {
        c.statuses = applyStatus(c, 'guard', { id: a.skill, name: skill.name }, true, {
            ...statusDefinitions.guard,
            name: 'Defense',
            modifiers: [
                { stat: 'defense', flat: a.rank.base },
                {
                    stat: 'protection',
                    flat: wikiValue(
                        skill.wiki,
                        'Protection Bonus',
                        ranks.indexOf(a.rank.rank),
                        c.race,
                    ),
                },
            ],
        }).statuses;
        train(c, a.skill, 'use');
        b.log.push('Defense prepared until your next turn.');
    } else if (skill.effect === 'manaShield') {
        c.effects.manaShield = {
            efficiency: wikiValue(
                skill.wiki,
                'Base Mana Efficiency',
                ranks.indexOf(a.rank.rank),
                c.race,
            ),
            upkeep: Math.ceil(
                wikiValue(skill.wiki, 'Mana Use [/sec]', ranks.indexOf(a.rank.rank), c.race),
            ),
            remaining: 3,
        };
        train(c, a.skill, 'use');
        b.log.push('Mana Shield active until your third subsequent turn.');
    } else if (skill.effect === 'status') {
        train(c, a.skill, 'use');
    } else {
        let hit = false,
            kills = 0,
            criticalHit = false,
            criticalKills = 0;
        const rng = createRng(b.rng);
        for (const t of a.targets) {
            const enemy = b.enemies.find((e) => e.id === t.id && e.hp > 0);
            if (!enemy) continue;
            const critical = rng.chance(a.criticalChance / 10000);
            const amount = damageAmount(
                actionPower(a),
                1,
                t.defense,
                t.protection,
                critical ? a.criticalBonus : 0,
            );
            let damage = 0;
            for (let i = 0; i < skill.hits && enemy.hp > 0; i++) {
                const dealt = hitEnemy(enemy, amount);
                damage += dealt;
                emit(c.battle!, operationId, {
                    type: 'damage',
                    actorId: c.id,
                    targetId: enemy.id,
                    amount: dealt,
                    critical,
                    hitIndex: i,
                    text: `${skill.name}${critical ? ' critical' : ''} hits ${enemy.name} for ${dealt}.`,
                });
            }
            hit ||= damage > 0;
            criticalHit ||= critical && damage > 0;
            if (!enemy.hp) {
                kills++;
                if (critical) criticalKills++;
            }
            b.log.push(
                `${skill.name}${critical ? ' critical' : ''} hits ${enemy.name} for ${damage}.`,
            );
        }
        b.rng = rng.snapshot();
        trainOffense(c, a, hit, kills, criticalHit, criticalKills);
        for (const id of [c.equipment.main, ...(a.dual ? [c.equipment.offhand] : [])]) {
            const item = c.inventory.find((i) => i.id === id);
            if (item) item.durability = Math.max(0, (item.durability ?? 20) - 1);
        }
    }
    for (const status of skill.appliedStatuses ?? []) {
        if (status.target === 'self')
            c.statuses = applyStatus(
                c,
                status.id,
                { id: a.skill, name: skill.name },
                true,
            ).statuses;
        else
            for (const target of a.targets) {
                const enemy = b.enemies.find((e) => e.id === target.id && e.hp > 0);
                if (enemy)
                    enemy.statuses = applyStatus(
                        enemy,
                        status.id,
                        { id: a.skill, name: skill.name },
                        false,
                    ).statuses;
            }
    }
    c.cooldowns[a.skill] = a.rank.cooldown;
}
export function endPlayerActivation(c: Character, cast?: string) {
    for (const id of Object.keys(c.cooldowns))
        if (id !== cast) c.cooldowns[id] = Math.max(0, c.cooldowns[id] - 1);
    if (c.effects.final && cast !== 'final' && --c.effects.final.remaining <= 0)
        delete c.effects.final;
    const completed = completeStatusActivation(c);
    for (const pool of ['hp', 'mana', 'stamina'] as const) c[pool] = completed.actor[pool];
    c.statuses = completed.actor.statuses;
    c.stats = completed.actor.stats;
    c.effects = completed.actor.effects;
    c.battle?.log.push(...completed.log);
}
export function enemyHit(
    c: Character,
    e: Enemy,
    power: number,
    status: string | undefined,
    operationId: string,
) {
    const b = c.battle!;
    if (c.effects.counter && (!e.attackType || e.attackType === 'melee')) {
        const stance = c.effects.counter;
        delete c.effects.counter;
        const damage = hitEnemy(
            e,
            damageAmount(
                stance.power + enemyStats(e).attack * (stance.opponentMultiplier ?? 0),
                1,
                enemyStats(e).defense,
                enemyStats(e).protection,
            ),
        );
        train(c, 'counter', 'counter');
        trainOffense(c, stance.source, damage > 0, e.hp === 0 ? 1 : 0);
        emit(b, operationId, {
            type: 'counter',
            actorId: c.id,
            targetId: e.id,
            amount: damage,
            text: `Counterattack negates ${e.name}'s hit and deals ${damage}.`,
        });
        return;
    }
    const d = defenses(c, e.attackType === 'magic');
    const raw = damageAmount(enemyStats(e).attack * power, 1, d.defense, d.protection);
    const absorbed = Math.min(c.effects.shield ?? 0, raw);
    c.effects.shield = (c.effects.shield ?? 0) - absorbed;
    let damage = raw - absorbed;
    const manaShield = c.effects.manaShield;
    if (manaShield) {
        const blocked = Math.min(damage, Math.floor(Math.floor(c.mana) * manaShield.efficiency));
        c.mana -= Math.ceil(blocked / manaShield.efficiency);
        damage -= blocked;
    }
    damage = Math.min(c.hp, damage);
    c.hp -= damage;
    for (const id of ['shieldMastery', 'lightMastery', 'heavyMastery'])
        if (!requirementReason(c, id)) train(c, id, 'incoming');
    if (c.effects.defense) train(c, 'defense', 'use');
    emit(b, operationId, {
        type: 'damage',
        actorId: e.id,
        targetId: c.id,
        amount: damage,
        critical: false,
        hitIndex: 0,
        text: `${e.name} deals ${damage} damage.`,
    });
    if (c.hp > 0 && status)
        c.statuses = applyStatus(c, status, { id: e.id, name: e.name }, false).statuses;
    refreshStats(c);
}