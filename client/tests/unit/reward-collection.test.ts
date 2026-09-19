import { expect, it } from 'vitest';
import { produce } from 'immer';
import { waitFor } from 'xstate';
import { blankSave, reduceCommand, type Command } from '../../src/domain/commands';
import { initializeInventory } from '../../src/domain/inventory';
import { MemoryPersistence } from '../../src/runtime/persistence';
import { makeActor } from '../../src/runtime/machines';

function fixture(boss = false) {
    let save = reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'nav');
    save = reduceCommand(
        save,
        {
            type: 'CREATE',
            id: 'hero',
            now: 0,
            input: { name: 'Hero', race: 'Human', age: 17, talent: 'Close Combat' },
        },
        'create',
    );
    save = reduceCommand(save, { type: 'ENTER', seed: 42 }, 'enter');
    return produce(save, (draft) => {
        draft.checkpoint.phase = 'reward';
        draft.data.characters[0].reward = {
            id: 'loot',
            gold: 20,
            boss,
            claimed: [],
            items: [
                { id: 'silk', kind: 'silk', count: 1 },
                { id: 'gem', kind: 'gem', count: 1 },
            ],
        };
    });
}
const claim: Command = { type: 'CLAIM', ids: ['silk'], gold: true, advance: true };
it('collects only the selection, leaves the rest, and advances exactly once', () => {
    const save = fixture(),
        next = reduceCommand(save, claim, 'claim');
    const c = next.data.characters[0];
    expect(c.reward).toBeNull();
    expect(c.inventory.some((i) => i.id === 'silk')).toBe(true);
    expect(c.inventory.some((i) => i.id === 'gem')).toBe(false);
    expect(c.gold).toBe(save.data.characters[0].gold + 20);
    expect(next.checkpoint).toMatchObject({ screen: 'Alby', phase: 'exploring' });
    expect(reduceCommand(next, claim, 'claim')).toBe(next);
});
it('advances boss loot to chest choices and chest loot to town', () => {
    const treasure = reduceCommand(fixture(true), claim, 'boss-claim');
    expect(treasure.checkpoint).toMatchObject({ screen: 'TreasureRoom', phase: 'treasure' });
    expect(treasure.data.characters[0].run!.chests).toHaveLength(5);
    const chest = reduceCommand(treasure, { type: 'CHEST', index: 2 }, 'chest');
    const town = reduceCommand(
        chest,
        { ...claim, ids: chest.data.characters[0].reward!.items.map((i) => i.id) },
        'chest-claim',
    );
    expect(town.checkpoint.screen).toBe('Town1');
    expect(town.data.characters[0].run).toBeNull();
    expect(town.data.characters[0].reward).toBeNull();
});
it('keeps loot and phase intact when the inventory cannot fit the collection', () => {
    const save = produce(fixture(), (draft) => {
        const c = draft.data.characters[0];
        const equipped = c.inventory.filter((i) => Object.values(c.equipment).includes(i.id));
        c.inventory = [
            ...equipped,
            ...Array.from({ length: 60 }, (_, n) => ({ id: `full-${n}`, kind: 'hp', count: 99 })),
        ];
        initializeInventory(c);
    });
    expect(() => reduceCommand(save, claim, 'full')).toThrow('Not enough inventory space');
    expect(save.data.characters[0].reward!.claimed).toEqual([]);
    expect(save.checkpoint.phase).toBe('reward');
});
it('does not publish collection or continuation until persistence succeeds', async () => {
    const persistence = new MemoryPersistence();
    persistence.value = fixture();
    const actor = makeActor(persistence);
    actor.start();
    await waitFor(actor, (s) => s.matches('Alby'));
    const before = actor.getSnapshot().context.save;
    persistence.fail = true;
    actor.send({ type: 'COMMAND', command: claim, operationId: 'collect' });
    await waitFor(actor, (s) => !!s.context.error);
    expect(actor.getSnapshot().context.save).toBe(before);
    expect(persistence.value!.checkpoint.phase).toBe('reward');
    persistence.fail = false;
    actor.send({ type: 'COMMAND', command: claim, operationId: 'collect' });
    await waitFor(actor, (s) => s.context.save !== before);
    expect(persistence.value!.checkpoint.phase).toBe('exploring');
    actor.stop();
});