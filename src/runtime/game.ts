import { createActor } from 'xstate';
import { makeActor, dialogueMachine, questMachine } from './machines';
import { IndexedDBPersistence } from './persistence';
import { active, type Command } from '../domain/commands';
export const actor = makeActor(new IndexedDBPersistence());
export const dialogue = createActor(dialogueMachine).start();
export let quest = createActor(questMachine).start();
export let readOnly = false;
let started = false;
let unlock: (() => void) | undefined;
export const startRuntime = () => {
    if (started) return;
    started = true;
    const start = () => actor.start();
    if (navigator.locks)
        void navigator.locks.request(
            'rebirth-dungeon-writer',
            { ifAvailable: true },
            async (lock) => {
                readOnly = !lock;
                start();
                if (lock)
                    await new Promise<void>((r) => {
                        unlock = r;
                    });
            },
        );
    else start();
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) window.location.reload();
    });
    window.addEventListener('pagehide', () => unlock?.(), { once: true });
};
export const getSave = () => actor.getSnapshot().context.save;
export const getCharacter = () => active(getSave());
export const busy = () =>
    ['committing', 'loading', 'rolling', 'resolvingPlayer', 'resolvingEnemies', 'failure'].some(
        (state) => actor.getSnapshot().matches(state as 'committing'),
    );
export const workflowPhase = () => actor.getSnapshot().value;
export function send(command: Command) {
    if (readOnly || busy()) return;
    if (dialogue.getSnapshot().matches('choosing')) dialogue.send({ type: 'TRANSACT' });
    actor.send({ type: 'COMMAND', command, operationId: crypto.randomUUID() });
}
export const subscribe = (notify: () => void) => {
    const s = actor.subscribe(notify);
    return () => s.unsubscribe();
};
let previous = getSave();
actor.subscribe((s) => {
    if (!s.matches('committing')) dialogue.send({ type: 'DONE' });
    const save = s.context.save;
    if (save === previous) return;
    const c = active(save),
        old = active(previous);
    if (c?.id !== old?.id) {
        quest.stop();
        quest = createActor(questMachine).start();
    }
    for (const [n, type] of [
        [1, 'ENTER'],
        [2, 'WIN'],
        [3, 'BOSS'],
        [4, 'TREASURE'],
    ] as const)
        if ((c?.tutorial || 0) >= n && quest.getSnapshot().status === 'active')
            quest.send({ type });

    previous = save;
});
export function openService(service: string) {
    if (!busy()) dialogue.send({ type: 'OPEN', service });
}
