import { setup, assign, createActor } from 'xstate';
/** A short-lived actor decides a monster's action; only the resulting number is saved. */
export const enemyMachine = setup({
    types: {
        context: {} as { attack: number; defense: number; hp: number; damage: number },
        input: {} as { attack: number; defense?: number; hp?: number },
        events: {} as { type: 'TURN' } | { type: 'DEFEAT' },
    },
}).createMachine({
    id: 'enemy',
    context: ({ input }) => ({
        ...input,
        defense: input.defense ?? 0,
        hp: input.hp ?? 1,
        damage: 0,
    }),
    initial: 'waiting',
    states: {
        waiting: {
            on: {
                TURN: [
                    { guard: ({ context }) => context.hp <= 0, target: 'defeated' },
                    {
                        target: 'acting',
                        actions: assign({
                            damage: ({ context }) => Math.max(1, context.attack - context.defense),
                        }),
                    },
                ],
                DEFEAT: 'defeated',
            },
        },
        acting: { on: { TURN: 'waiting', DEFEAT: 'defeated' } },
        defeated: { type: 'final' },
    },
});
export function enemyDamage(attack: number, defense: number, hp: number) {
    const ai = createActor(enemyMachine, { input: { attack, defense, hp } }).start();
    ai.send({ type: 'TURN' });
    const damage = ai.getSnapshot().context.damage;
    ai.stop();
    return damage;
}
