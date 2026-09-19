import { statusDefinitions } from './stats/statusCatalog';
import { applyStatus, completeStatusActivation } from './stats/statuses';
import { enemyStats } from './stats/resolve';
import { affordability } from './stats/resources';
import type { Immutable } from 'immer';
import type { ActionSnapshot, Character, Enemy, SaveData } from './model';
import { wikiValue } from './skills/wiki';
import { skills, ranks } from './Skills';
import { combination, nextRandom } from './dice';
import {
    defenses,
    snapshotAction,
    train,
    requirementReason,
    effectiveStats,
    equipment,
    refreshStats,
} from './skillSystem';
import { enemyDamage } from './behavior';
export function damageAmount(
    power: number,
    multiplier: number,
    defense: number,
    protection: number,
    criticalBonus = 0,
) {
    const combo = Math.floor(Math.max(0, power - defense) * multiplier);
    return Math.floor(
        Math.floor(combo * (1 + criticalBonus)) * (1 - Math.max(0, Math.min(1, protection))),
    );
}
export function handPower(a: Immutable<ActionSnapshot>, dice: readonly number[]) {
    return (
        a.rank.base +
        (a.attack * (a.rank.attackMultiplier ?? 1)) /
            (a.skill === 'arrowRevolver' ? 1 : skills[a.skill].hits) +
        a.rank.pip * dice.reduce((x, y) => x + y, 0)
    );
}
export function previewDamage(
    c: Immutable<Character>,
    enemy: Immutable<Enemy>,
    id: string,
    dice: readonly number[],
    critical = false,
): number {
    const a = c.battle?.action ?? snapshotAction(c, id, enemy.id, false);
    if (skills[id].effect !== 'attack') return 0;
    const t = a.targets.find((t) => t.id === enemy.id);
    if (!t) return 0;
    const damage =
        damageAmount(
            handPower(a, dice),
            combination(dice).multiplier,
            t.defense,
            t.protection,
            critical ? a.criticalBonus : 0,
        ) * skills[id].hits;
    return Math.max(0, damage - (enemy.shield ?? 0));
}
function hitEnemy(enemy: Enemy, amount: number) {
    const absorbed = Math.min(enemy.shield ?? 0, amount);
    enemy.shield = (enemy.shield ?? 0) - absorbed;
    const before = enemy.hp;
    enemy.hp = Math.max(0, enemy.hp - (amount - absorbed));
    return before - enemy.hp;
}
function trainOffense(
    c: Character,
    a: Immutable<Pick<ActionSnapshot, 'skill' | 'melee' | 'sword' | 'dual'>>,
    hit: boolean,
    kills: number,
    criticalHit = false,
    criticalKills = 0,
) {
    for (const id of [
        a.skill,
        ...(a.melee ? ['combatMastery'] : []),
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
export function payReservation(c: Character) {
    const a = c.battle!.action;
    if (!a) throw new Error('No reserved action.');
    const reason = affordability(c, a.costs, false);
    if (reason) throw new Error(reason);
    for (const pool of ['hp', 'mana', 'stamina'] as const) {
        c[pool] -= a.costs[pool];
    }
}
export function commitAbility(s: SaveData, c: Character) {
    const b = c.battle!,
        a = b.action;
    if (!a) throw new Error('No reserved action.');
    const skill = skills[a.skill],
        multiplier = combination(b.dice).multiplier;
    payReservation(c);
    if (skill.effect === 'counter') {
        c.effects.counter = {
            power: handPower(a, b.dice),
            multiplier,
            opponentMultiplier: a.rank.counterMultiplier ?? 0,
            source: { skill: a.skill, melee: a.melee, sword: a.sword, dual: a.dual },
        };
        train(c, 'counter', 'use');
        b.log.push('Counterattack prepared.');
    } else if (skill.effect === 'buff') {
        c.effects.final = {
            magnitude: Math.floor(
                (a.rank.base + a.rank.pip * b.dice.reduce((x, y) => x + y, 0)) * multiplier,
            ),
            remaining: a.rank.duration,
        };
        train(c, 'final', 'use');
        b.log.push(`Final Hit grants +${c.effects.final.magnitude} melee attack.`);
    } else if (skill.effect === 'heal') {
        const amount = Math.floor(a.rank.base * 5 * multiplier);
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
        b.log.push('Defense prepared for the next enemy response.');
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
        b.log.push('Mana Shield active for three enemy responses.');
    } else if (skill.effect === 'status') {
        train(c, a.skill, 'use');
    } else {
        let hit = false,
            kills = 0,
            criticalHit = false,
            criticalKills = 0;
        b.criticalResults = {};
        for (const t of a.targets) {
            const enemy = b.enemies.find((e) => e.id === t.id && e.hp > 0);
            if (!enemy) continue;
            let critical = false;
            if (a.criticalChance > 0) {
                let value;
                [s.data.rng, value] = nextRandom(s.data.rng);
                critical = Math.floor(value * 10000) < a.criticalChance;
            }
            b.criticalResults[t.id] = critical;
            const amount = damageAmount(
                handPower(a, b.dice),
                multiplier,
                t.defense,
                t.protection,
                critical ? a.criticalBonus : 0,
            );
            let damage = 0;
            for (let i = 0; i < skill.hits && enemy.hp > 0; i++) damage += hitEnemy(enemy, amount);
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
    endPlayerActivation(c, a.skill);
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
export function enemiesAct(c: Character) {
    const b = c.battle!;
    for (const e of [...b.enemies].sort((a, b) => a.id.localeCompare(b.id))) {
        if (e.hp <= 0) continue;
        if (c.effects.counter && (!e.attackType || e.attackType === 'melee')) {
            const stance = c.effects.counter;
            delete c.effects.counter;
            const damage = hitEnemy(
                e,
                damageAmount(
                    stance.power + enemyStats(e).attack * (stance.opponentMultiplier ?? 0),
                    stance.multiplier,
                    enemyStats(e).defense,
                    enemyStats(e).protection,
                ),
            );
            train(c, 'counter', 'counter');
            trainOffense(c, stance.source, damage > 0, e.hp === 0 ? 1 : 0);
            b.log.push(`Counterattack negates ${e.name}'s hit and deals ${damage}.`);
        } else {
            const d = defenses(c, e.attackType === 'magic');
            const raw = Math.floor(
                enemyDamage(enemyStats(e).attack, d.defense, e.hp) * (1 - d.protection),
            );
            const absorbed = Math.min(c.effects.shield ?? 0, raw);
            c.effects.shield = (c.effects.shield ?? 0) - absorbed;
            let damage = raw - absorbed;
            const manaShield = c.effects.manaShield;
            if (manaShield) {
                const blocked = Math.min(damage, Math.floor(c.mana * manaShield.efficiency));
                c.mana -= Math.ceil(blocked / manaShield.efficiency);
                damage -= blocked;
            }
            c.hp = Math.max(0, c.hp - damage);
            for (const id of ['shieldMastery', 'lightMastery', 'heavyMastery'])
                if (!requirementReason(c, id)) train(c, id, 'incoming');
            b.log.push(`${e.name} deals ${damage} damage.`);
            if (c.hp > 0)
                for (const id of e.inflicts ?? [])
                    c.statuses = applyStatus(c, id, { id: e.id, name: e.name }, false).statuses;
            refreshStats(c);
        }
        const completed = completeStatusActivation(e);
        Object.assign(e, completed.actor);
        b.log.push(...completed.log);
        if (!c.hp) break;
    }
    delete c.effects.defense;
    if (c.effects.manaShield) {
        c.mana = Math.max(0, c.mana - c.effects.manaShield.upkeep);
        if (--c.effects.manaShield.remaining <= 0 || !c.mana) delete c.effects.manaShield;
    }
    // The next player activation starts immediately after all surviving enemies act.
    delete c.effects.counter;
}
export function clearHand(c: Character) {
    const b = c.battle!;
    b.turn++;
    b.dice = [];
    b.held = Array(5).fill(false);
    b.rerolls = 2;
    b.skill = '';
    delete b.action;
    b.log = b.log.slice(-5);
}
