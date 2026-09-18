import type { Immutable } from 'immer';
import type { ActionSnapshot, Character, Enemy, SaveData } from './model';
import { skills } from './skillCatalog';
import { combination, nextRandom } from './dice';
import { defenses, snapshotAction, train, requirementReason } from './skillSystem';
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
        a.rank.base + a.attack / skills[a.skill].hits + a.rank.pip * dice.reduce((x, y) => x + y, 0)
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
    for (const pool of ['hp', 'mana', 'stamina'] as const) {
        if (c[pool] - a.costs[pool] < (pool === 'hp' ? 1 : 0))
            throw new Error(`Not enough ${pool}.`);
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
        for (const id of [c.weapon, ...(a.dual ? [c.offhand] : [])]) {
            const item = c.inventory.find((i) => i.id === id);
            if (item) item.durability = Math.max(0, (item.durability ?? 20) - 1);
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
                damageAmount(stance.power, stance.multiplier, e.defense, e.protection ?? 0),
            );
            train(c, 'counter', 'counter');
            trainOffense(c, stance.source, damage > 0, e.hp === 0 ? 1 : 0);
            b.log.push(`Counterattack negates ${e.name}'s hit and deals ${damage}.`);
        } else {
            const d = defenses(c, e.attackType === 'magic');
            const raw = Math.floor(enemyDamage(e.attack, d.defense, e.hp) * (1 - d.protection));
            const absorbed = Math.min(c.effects.shield ?? 0, raw);
            c.effects.shield = (c.effects.shield ?? 0) - absorbed;
            const damage = raw - absorbed;
            c.hp = Math.max(0, c.hp - damage);
            for (const id of ['shieldMastery', 'lightMastery', 'heavyMastery'])
                if (!requirementReason(c, id)) train(c, id, 'incoming');
            b.log.push(`${e.name} deals ${damage} damage.`);
        }
        if (!c.hp) break;
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
