let selected = '';
const listeners = new Set<() => void>();
export const getBattleTarget = () => selected;
export function setBattleTarget(id: string) {
    if (selected === id) return;
    selected = id;
    for (const notify of listeners) notify();
}
export function onBattleTarget(notify: () => void) {
    listeners.add(notify);
    return () => {
        listeners.delete(notify);
    };
}