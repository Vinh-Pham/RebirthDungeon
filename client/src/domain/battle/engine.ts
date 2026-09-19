import { type Immutable } from 'immer';
import type { Battle, Character, Enemy } from '../model';
import { createRng, seedRng, type RngState } from '../rng';
import {
    speed,
    turnRecovery,
    learned,
    usableReason,
    snapshotAction,
    refreshStats,
} from '../skillSystem';
import { skills } from '../Skills';
import { commitAbility, endPlayerActivation, enemyHit } from '../combat';
import { completeStatusActivation } from '../stats/statuses';
import { enemyProfile, enemySkills, type EnemySkillId } from './profiles';
import { emit } from './events';
import { consumeItem, consumableReason } from './items';
import { chooseEnemyCommand } from '../behavior';

export type TurnIdentity = { actorId: string; turnId: string };
export type BattleCommand = TurnIdentity &
    (
        | {
              type: 'BATTLE_ACTION';
              action: 'attack' | 'skill' | 'defend' | 'wait';
              skill?: string;
              target?: string;
          }
        | { type: 'BATTLE_ITEM'; id: string }
        | { type: 'BEGIN_TURN' }
        | { type: 'ENEMY_TURN' }
    );
export function createBattle(
    c: Immutable<Character>,
    room: number,
    enemies: Enemy[],
    source: Immutable<RngState>,
): Battle {
    const id = `${c.run!.id}:${room}`;
    const rng = createRng(source);
    const actors = [
        { id: c.id, speed: speed(c) },
        ...enemies.map((e) => ({ id: e.id, speed: e.speed })),
    ];
    actors.sort((a, b) => b.speed - a.speed || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (let start = 0; start < actors.length;) {
        let end = start + 1;
        while (end < actors.length && actors[end].speed === actors[start].speed) end++;
        for (let i = end - 1; i > start; i--) {
            const j = rng.int(start, i);
            [actors[i], actors[j]] = [actors[j], actors[i]];
        }
        start = end;
    }
    return {
        id,
        room,
        enemies,
        rulesVersion: 1,
        contentVersion: 1,
        order: actors.map((a) => a.id),
        speeds: Object.fromEntries(actors.map((a) => [a.id, a.speed])),
        cursor: 0,
        round: 1,
        turn: 1,
        turnId: `${id}:1`,
        started: false,
        itemUsed: false,
        rng: rng.snapshot(),
        winner: null,
        events: [],
        eventSequence: 0,
        log: [],
    };
}
export function encounterBattle(c: Character, room: number, enemies: Enemy[], world: RngState) {
    const rng = createRng(world);
    c.battle = createBattle(
        c,
        room,
        enemies.map((e) => ({ ...e, ...enemyProfile(e) })),
        seedRng(rng.int(-2147483648, 2147483647)),
    );
    return rng.snapshot();
}
export function currentActor(c: Immutable<Character>) {
    const id = c.battle?.order[c.battle.cursor];
    return id === c.id ? c : c.battle?.enemies.find((e) => e.id === id);
}
export const turnIdentity = (c: Immutable<Character>): TurnIdentity => ({
    actorId: currentActor(c)!.id,
    turnId: c.battle!.turnId,
});
export function playerTurn(c: Immutable<Character>) {
    return (
        !!c.battle &&
        !c.battle.winner &&
        c.battle.started &&
        currentActor(c)?.id === c.id &&
        c.hp > 0
    );
}
export function canWait(c: Immutable<Character>) {
    return !Object.keys(learned(c)).some(
        (id) => skills[id]?.type === 'active' && !usableReason(c, id),
    );
}
function checkEnd(c: Character) {
    const b = c.battle!;
    if (b.winner) return true;
    if (c.hp > 0 && b.enemies.some((e) => e.hp > 0)) return false;
    b.winner = c.hp > 0 ? 'player' : 'enemy';
    return true;
}
function startTurn(c: Character, operationId: string) {
    const b = c.battle!,
        actor = currentActor(c)!;
    if (b.started) throw new Error('This turn has already started.');
    if (actor.hp <= 0) throw new Error('A defeated actor cannot start a turn.');
    b.started = true;
    if (actor.id === c.id) {
        delete c.effects.defense;
        delete c.effects.counter;
        c.statuses = c.statuses.filter((s) => s.definition.group !== 'guard');
        if (c.effects.manaShield) {
            c.mana = Math.max(0, c.mana - c.effects.manaShield.upkeep);
            if (--c.effects.manaShield.remaining <= 0 || !c.mana) delete c.effects.manaShield;
        }
        refreshStats(c);
        c.stamina = Math.min(c.stats.stamina, c.stamina + turnRecovery(c));
    } else {
        const enemy = actor as Enemy;
        enemy.guarding = false;
        enemy.stamina = Math.min(enemy.maxStamina, enemy.stamina + 0.5);
    }
    emit(b, operationId, { type: 'turnStart', actorId: actor.id, text: `${actor.name}'s turn.` });
    checkEnd(c);
}
function finishTurn(c: Character, cast: string | undefined, operationId: string) {
    const b = c.battle!,
        actor = currentActor(c)!;
    if (checkEnd(c)) return;
    if (actor.id === c.id) endPlayerActivation(c, cast);
    else {
        const enemy = actor as Enemy;
        for (const id of Object.keys(enemy.cooldowns))
            if (id !== cast) enemy.cooldowns[id] = Math.max(0, enemy.cooldowns[id] - 1);
        Object.assign(enemy, completeStatusActivation(enemy).actor);
    }
    emit(b, operationId, {
        type: 'turnEnd',
        actorId: actor.id,
        text: `${actor.name} ends their turn.`,
    });
    if (checkEnd(c)) return;
    do {
        b.cursor = (b.cursor + 1) % b.order.length;
        if (b.cursor === 0) b.round++;
    } while (currentActor(c)!.hp <= 0);
    b.turn++;
    b.turnId = `${b.id}:${b.turn}`;
    b.started = false;
    b.itemUsed = false;
}
function enemyAction(
    c: Character,
    e: Enemy,
    action: Extract<BattleCommand, { type: 'BATTLE_ACTION' }>,
    operationId: string,
) {
    let cost = 0;
    const skill = action.action === 'skill' ? enemySkills[action.skill as EnemySkillId] : undefined;
    if (action.action === 'skill') {
        if (!skill || !e.skills.includes(action.skill!) || e.cooldowns[action.skill!] > 0)
            throw new Error('Enemy skill unavailable.');
        cost = skill.cost;
    } else if (action.action === 'attack') cost = 2;
    else if (action.action === 'defend') cost = 1;
    else if (e.stamina >= 1) throw new Error('A legal action is affordable.');
    if (e.stamina < cost) throw new Error('Not enough stamina.');
    e.stamina -= cost;
    e.guarding = action.action === 'defend';
    e.defendedLastTurn = e.guarding;
    if (action.action === 'attack' || skill)
        enemyHit(c, e, skill?.power ?? 1, skill?.status, operationId);
    if (skill) e.cooldowns[action.skill!] = skill.cooldown;
}
/** Applies only inside the enclosing save producer. The wrapper below supports headless use. */
function resolveBattleCommand(c: Character, command: BattleCommand, operationId: string) {
    const b = c.battle;
    if (!b || b.winner || b.turnId !== command.turnId || currentActor(c)?.id !== command.actorId)
        throw new Error('This turn has already ended.');
    let cmd = command;
    if (cmd.type === 'BEGIN_TURN') {
        startTurn(c, operationId);
        return;
    }
    if (!b.started || currentActor(c)!.hp <= 0) throw new Error('This turn is not ready.');
    if (cmd.type === 'ENEMY_TURN') {
        if (cmd.actorId === c.id) throw new Error('Waiting for your action.');
        cmd = chooseEnemyCommand(c);
    }
    const actor = currentActor(c)! as Character | Enemy;
    if (cmd.type === 'BATTLE_ITEM') {
        if (b.itemUsed) throw new Error('An item has already been used this turn.');
        const reason = consumableReason(actor, cmd.id);
        if (reason) throw new Error(reason);
        consumeItem(actor, cmd.id);
        b.itemUsed = true;
        emit(b, operationId, {
            type: 'item',
            actorId: actor.id,
            text: `${actor.name} uses an item.`,
        });
        return;
    }
    if (cmd.type !== 'BATTLE_ACTION') throw new Error('Unknown battle action.');
    if (actor.id === c.id) {
        if (cmd.action === 'wait') {
            if (!canWait(c)) throw new Error('A legal main action is affordable.');
        } else {
            const id =
                cmd.action === 'attack'
                    ? 'normal'
                    : cmd.action === 'defend'
                      ? 'defense'
                      : cmd.skill;
            if (!id || (cmd.action === 'skill' && ['normal', 'defense'].includes(id)))
                throw new Error('Choose a skill.');
            const snapshot = snapshotAction(c, id, cmd.target ?? '');
            emit(b, operationId, {
                type: 'action',
                actorId: c.id,
                text: `${c.name} uses ${skills[id].name}.`,
            });
            commitAbility(c, snapshot, operationId);
            finishTurn(c, id, operationId);
            return;
        }
    } else {
        emit(b, operationId, {
            type: 'action',
            actorId: actor.id,
            text: `${actor.name} uses ${cmd.skill ? enemySkills[cmd.skill as EnemySkillId]?.name : cmd.action}.`,
        });
        enemyAction(c, actor as Enemy, cmd, operationId);
    }
    finishTurn(c, cmd.skill, operationId);
}
export function applyBattleCommand(c: Character, command: BattleCommand, operationId: string) {
    const actors = [c, ...(c.battle?.enemies ?? [])];
    const before = actors.map((a) => ({
        id: a.id,
        hp: a.hp,
        mana: a.mana,
        stamina: a.stamina,
        statuses: (a.statuses ?? []).map((s) => s.definition.id),
    }));
    resolveBattleCommand(c, command, operationId);
    const b = c.battle!;
    for (const [i, a] of actors.entries()) {
        const old = before[i];
        for (const pool of ['hp', 'mana', 'stamina'] as const) {
            const change = Math.round((a[pool] - old[pool]) * 1e10) / 1e10;
            if (change)
                emit(
                    b,
                    operationId,
                    {
                        type: pool === 'hp' && change > 0 ? 'healed' : 'resource',
                        actorId: a.id,
                        amount: change,
                        text: `${a.name}: ${change > 0 ? '+' : ''}${change} ${pool === 'hp' ? 'HP' : pool === 'mana' ? 'MP' : 'SP'}.`,
                    },
                    command.turnId,
                );
        }
        const statuses = (a.statuses ?? []).map((s) => s.definition.id);
        for (const id of statuses.filter((id) => !old.statuses.includes(id)))
            emit(
                b,
                operationId,
                { type: 'statusApplied', actorId: a.id, text: `${a.name}: ${id} applied.` },
                command.turnId,
            );
        for (const id of old.statuses.filter((id) => !statuses.includes(id)))
            emit(
                b,
                operationId,
                { type: 'statusExpired', actorId: a.id, text: `${a.name}: ${id} expired.` },
                command.turnId,
            );
        if (old.hp > 0 && a.hp === 0)
            emit(
                b,
                operationId,
                { type: 'defeated', actorId: a.id, text: `${a.name} is defeated.` },
                command.turnId,
            );
    }
    if (b.winner && !b.events.some((e) => e.type === 'battleEnd'))
        emit(
            b,
            operationId,
            {
                type: 'battleEnd',
                actorId: command.actorId,
                text: b.winner === 'player' ? 'Victory.' : 'Defeated. Returning to town.',
            },
            command.turnId,
        );
}