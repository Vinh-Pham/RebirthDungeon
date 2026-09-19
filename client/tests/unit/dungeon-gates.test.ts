import { expect, it } from 'vitest';
import { produce } from 'immer';
import { blankSave, reduceCommand } from '../../src/domain/commands';
import {
    bossUnlocked,
    dungeonGates,
    dungeonGrid,
    findPath,
    gateClosed,
    roomAt,
} from '../../src/domain/dungeon';
import { validateSave } from '../../src/runtime/persistence';

function fixture() {
    let save = reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'nav');
    save = reduceCommand(
        save,
        {
            type: 'CREATE',
            id: 'gates',
            now: 0,
            input: { name: 'Gate Walker', age: 17, race: 'Human', talent: 'Close Combat' },
        },
        'create',
    );
    return reduceCommand(save, { type: 'ENTER', seed: 42 }, 'enter');
}
it('boss gates require every non-boss encounter, including legacy optional rooms, but not supplies', () => {
    let save = produce(fixture(), (draft) => {
        draft.data.characters[0].run!.cleared = [1, 2, 3];
        draft.data.characters[0].run!.rooms[4].required = false;
    });
    const c = save.data.characters[0],
        run = c.run!,
        boss = run.rooms[6];
    expect(bossUnlocked(run)).toBe(false);
    expect(findPath(dungeonGrid(c), run.rooms[0], boss)).toEqual([]);
    expect(() => reduceCommand(save, { type: 'ENCOUNTER', room: 6 }, 'boss')).toThrow('non-boss');
    expect(() =>
        reduceCommand(save, { type: 'POSITION', x: boss.x * 32, y: boss.y * 32 }, 'walk-boss'),
    ).toThrow('non-boss');
    save = produce(save, (draft) => {
        draft.data.characters[0].run!.cleared.push(4);
    });
    expect(bossUnlocked(save.data.characters[0].run!)).toBe(true);
    expect(
        findPath(dungeonGrid(save.data.characters[0]), run.rooms[0], boss).length,
    ).toBeGreaterThan(0);
    expect(reduceCommand(save, { type: 'ENCOUNTER', room: 6 }, 'boss').checkpoint.screen).toBe(
        'Battle',
    );
});
it('entering an enemy room starts one persistent encounter; gates open only after the last enemy', () => {
    const before = fixture(),
        room = before.data.characters[0].run!.rooms[2];
    const save = reduceCommand(
        before,
        { type: 'POSITION', x: room.x * 32, y: room.y * 32 },
        'walk',
    );
    const c = save.data.characters[0];
    expect(save.checkpoint.screen).toBe('Battle');
    expect(c.battle!.room).toBe(2);
    expect(save.data.rng).toBe(before.data.rng);
    expect(gateClosed(c, room)).toBe(true);
    expect(reduceCommand(save, { type: 'POSITION', x: room.x * 32, y: room.y * 32 }, 'walk')).toBe(
        save,
    );
    expect(() => validateSave(JSON.parse(JSON.stringify(save)))).not.toThrow();
    const partial = produce(c, (draft) => {
        draft.battle!.enemies[0].hp = 0;
    });
    expect(gateClosed(partial, room)).toBe(true);
    const cleared = produce(partial, (draft) => {
        draft.battle!.enemies.forEach((enemy) => {
            enemy.hp = 0;
        });
        draft.run!.cleared.push(room.id);
    });
    expect(gateClosed(cleared, room)).toBe(false);
    expect(
        dungeonGates(cleared)
            .filter((gate) => gate.room === room.id)
            .every((gate) => !gate.closed),
    ).toBe(true);
    expect(() => reduceCommand(save, { type: 'POSITION', x: 0, y: 0 }, 'escape')).toThrow();
});
it('empty rooms have no gates and walking there starts no encounter', () => {
    const save = fixture(),
        c = save.data.characters[0],
        run = c.run!;
    expect(dungeonGates(c).some((gate) => [0, 5].includes(gate.room))).toBe(false);
    const supplies = run.rooms[5];
    const next = reduceCommand(
        save,
        { type: 'POSITION', x: supplies.x * 32, y: supplies.y * 32 },
        'supplies',
    );
    expect(next.checkpoint.screen).toBe('Alby');
    expect(next.data.characters[0].battle).toBeNull();
    expect(roomAt(run, -100, -100)).toBeUndefined();
    expect(dungeonGates({ ...c, run: null })).toEqual([]);
    expect(dungeonGrid({ ...c, run: null })).toEqual([]);
});