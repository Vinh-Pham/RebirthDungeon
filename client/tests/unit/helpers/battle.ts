import { produce } from 'immer';
import type { Character, SaveData, Talent } from '../../../src/domain/model';
import { active, blankSave, reduceCommand, type Command } from '../../../src/domain/commands';
import { controlledCharacter } from '../../../src/domain/quests/roleplay';
import { turnIdentity, playerTurn } from '../../../src/domain/battle/engine';
export const character = (s: SaveData) => controlledCharacter(s)!;
export function command(
    s: SaveData,
    cmd: Command,
    operationId = `test:${s.data.revision + 1}`,
): SaveData {
    return reduceCommand(s, cmd, operationId) as SaveData;
}
export function settle(s: SaveData): SaveData {
    for (
        let i = 0;
        i < 100 &&
        s.checkpoint.screen === 'Battle' &&
        s.checkpoint.phase !== 'reward' &&
        !playerTurn(character(s));
        i++
    ) {
        const c = character(s);
        s = command(s, {
            type: c.battle!.started ? 'ENEMY_TURN' : 'BEGIN_TURN',
            ...turnIdentity(c),
        });
    }
    return s;
}
export function act(s: SaveData, skill = 'normal', target = 'enemy-0'): SaveData {
    s = settle(s);
    return command(s, {
        type: 'BATTLE_ACTION',
        action: skill === 'normal' ? 'attack' : skill === 'defense' ? 'defend' : 'skill',
        skill: skill === 'normal' || skill === 'defense' ? undefined : skill,
        target,
        ...turnIdentity(character(s)),
    });
}
export function fixture(talent: Talent = 'Close Combat'): SaveData {
    let s = command(blankSave(), { type: 'NAV', screen: 'NewCharacter' });
    s = command(s, {
        type: 'CREATE',
        id: 'hero',
        now: 0,
        input: { name: 'Hero', race: 'Human', age: 17, talent },
    });
    return s;
}
export function edit(s: SaveData, fn: (c: Character, s: SaveData) => void): SaveData {
    return produce(s, (d) => fn(d.data.characters[0].rp?.actor ?? d.data.characters[0], d));
}
export function battle(ids: string[] = [], talent: Talent = 'Close Combat', room = 1): SaveData {
    let s = fixture(talent);
    for (const id of ids)
        if (!active(s)!.skills[id])
            s = edit(s, (c) => {
                c.skills[id] = { rank: 'F', counts: {} };
            });
    s = command(s, { type: 'ENTER', seed: 42 });
    s = command(s, { type: 'ENCOUNTER', room });
    s = edit(s, (c) => {
        for (const enemy of c.battle!.enemies) enemy.hp = enemy.maxHp = 10000;
    });
    return settle(s);
}