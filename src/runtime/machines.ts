import { setup, assign, createActor, fromPromise } from 'xstate';
import type { Immutable } from 'immer';
import { freeze, produce } from 'immer';
import { reconcileQuests } from '../domain/quests/system';
import { allowed, blankSave, reduceCommand, type Command } from '../domain/commands';
import type { SaveData } from '../domain/model';
import type { Persistence } from './persistence';
export { enemyMachine } from '../domain/behavior';
export const dialogueMachine = setup({
    types: {
        context: {} as { service: string },
        events: {} as
            | { type: 'OPEN'; service: string }
            | { type: 'CLOSE' }
            | { type: 'TRANSACT' }
            | { type: 'DONE' },
    },
}).createMachine({
    id: 'dialogue',
    context: { service: '' },
    initial: 'closed',
    states: {
        closed: {
            on: {
                OPEN: {
                    target: 'choosing',
                    actions: assign({ service: ({ event }) => event.service }),
                },
            },
        },
        choosing: {
            on: {
                CLOSE: 'closed',
                TRANSACT: 'transacting',
                // Interacting with another sign replaces the service through the
                // close/open flow; windows follow the actor without dropping state.
                OPEN: { actions: assign({ service: ({ event }) => event.service }) },
            },
        },
        transacting: { on: { DONE: 'choosing', CLOSE: 'closed' } },
    },
});
export const questMachine = setup({
    types: {
        events: {} as { type: 'ENTER' } | { type: 'WIN' } | { type: 'BOSS' } | { type: 'TREASURE' },
    },
}).createMachine({
    id: 'tutorial',
    initial: 'begin',
    states: {
        begin: { on: { ENTER: 'entered' } },
        entered: { on: { WIN: 'battleWon' } },
        battleWon: { on: { BOSS: 'bossWon' } },
        bossWon: { on: { TREASURE: 'complete' } },
        complete: { type: 'final' },
    },
});
interface Context {
    save: Immutable<SaveData>;
    pending: Command | null;
    operationId: string;
    error: string;
}
type Event =
    | { type: 'COMMAND'; command: Command; operationId: string }
    | { type: 'DISMISS' }
    | { type: 'RETRY' };
export function sessionMachine(persistence: Persistence, canWrite: () => boolean = () => true) {
    return setup({
        types: { context: {} as Context, events: {} as Event },
        actors: {
            load: fromPromise(async () => {
                const loaded = (await persistence.load()) || blankSave();
                if (!canWrite() || loaded.checkpoint.screen !== 'Town1')
                    return freeze(loaded, true);
                const reconciled = produce(loaded, (draft) => {
                    const hero = draft.data.characters.find((c) => c.id === draft.data.activeId);
                    if (hero) reconcileQuests(hero);
                });
                if (reconciled !== loaded) await persistence.save(reconciled);
                return freeze(reconciled, true);
            }),
            commit: fromPromise(async ({ input }: { input: Context }) => {
                const next = reduceCommand(input.save, input.pending!, input.operationId);
                await persistence.save(next);
                return next;
            }),
        },
        delays: {
            diceDelay: ({ context }) => (context.save.data.settings.reducedMotion ? 0 : 240),
            impactDelay: ({ context }) => (context.save.data.settings.reducedMotion ? 0 : 160),
        },
        guards: {
            allowed: ({ context, event }) =>
                event.type === 'COMMAND' && allowed(context.save, event.command),
        },
        actions: {
            stage: assign(({ event }) =>
                event.type === 'COMMAND'
                    ? { pending: event.command, operationId: event.operationId, error: '' }
                    : {},
            ),
            clearError: assign({ error: '' }),
        },
    }).createMachine({
        id: 'session',
        context: { save: blankSave(), pending: null, operationId: '', error: '' },
        initial: 'loading',
        states: {
            loading: {
                invoke: {
                    src: 'load',
                    onDone: {
                        target: 'routing',
                        actions: assign({ save: ({ event }) => event.output }),
                    },
                    onError: {
                        target: 'failure',
                        actions: assign({ error: ({ event }) => String(event.error) }),
                    },
                },
            },
            routing: {
                always: (
                    [
                        'Title',
                        'CharacterSelect',
                        'NewCharacter',
                        'Town1',
                        'Alby',
                        'Battle',
                        'TreasureRoom',
                    ] as const
                ).map((screen) => ({
                    guard: ({ context }: { context: Context }) =>
                        context.save.checkpoint.screen === screen,
                    target: screen,
                })),
            },
            Title: {},
            CharacterSelect: {},
            NewCharacter: {},
            Town1: {},
            Alby: {},
            Battle: {
                initial: 'route',
                states: {
                    route: {
                        always: [
                            {
                                guard: ({ context }) =>
                                    context.save.checkpoint.phase === 'choosingDice',
                                target: 'choosingDice',
                            },
                            {
                                guard: ({ context }) => context.save.checkpoint.phase === 'reward',
                                target: 'reward',
                            },
                            { target: 'selecting' },
                        ],
                    },
                    selecting: {},
                    choosingDice: {},
                    reward: {},
                },
            },
            TreasureRoom: {
                initial: 'route',
                states: {
                    route: {
                        always: [
                            {
                                guard: ({ context }) => context.save.checkpoint.phase === 'reward',
                                target: 'collecting',
                            },
                            { target: 'choosing' },
                        ],
                    },
                    choosing: {},
                    collecting: {},
                },
            },
            rolling: { after: { diceDelay: 'committing' }, on: { COMMAND: {} } },
            resolvingPlayer: { after: { impactDelay: 'resolvingEnemies' }, on: { COMMAND: {} } },
            resolvingEnemies: { after: { impactDelay: 'committing' }, on: { COMMAND: {} } },
            committing: {
                invoke: {
                    src: 'commit',
                    input: ({ context }) => context,
                    onDone: {
                        target: 'routing',
                        actions: assign({ save: ({ event }) => event.output, pending: null }),
                    },
                    onError: {
                        target: 'routing',
                        actions: assign({
                            error: ({ event }) =>
                                event.error instanceof Error
                                    ? event.error.message
                                    : String(event.error),
                            pending: null,
                        }),
                    },
                },
                on: { COMMAND: {} },
            },
            failure: {
                on: {
                    COMMAND: {},
                    DISMISS: {},
                    RETRY: { target: 'loading', actions: 'clearError' },
                },
            },
        },
        on: {
            COMMAND: [
                {
                    guard: ({ context, event }) =>
                        event.type === 'COMMAND' &&
                        ['ROLL', 'REROLL'].includes(event.command.type) &&
                        allowed(context.save, event.command),
                    target: '.rolling',
                    actions: 'stage',
                },
                {
                    guard: ({ context, event }) =>
                        event.type === 'COMMAND' &&
                        event.command.type === 'ATTACK' &&
                        allowed(context.save, event.command),
                    target: '.resolvingPlayer',
                    actions: 'stage',
                },
                { guard: 'allowed', target: '.committing', actions: 'stage' },
            ],
            DISMISS: { actions: 'clearError' },
        },
    });
}
export const makeActor = (persistence: Persistence, canWrite?: () => boolean) =>
    createActor(sessionMachine(persistence, canWrite));
