/**
 * Transient presentation state: it never enters an Immer save snapshot.
 *
 * The old single `modalOpen` flag could not express layered window browsing, so
 * input ownership now has three independent parts:
 *
 * - `blockingOverlay` — retained confirmation dialogs and reward collection
 *   block the game *and* every window.
 * - `uiFocus` — keyboard focus sits in a game window, a HUD control, or an
 *   owned popup; movement and interaction keys belong to the interface.
 * - `gesture` — a window drag or resize owns the pointer; movement pauses.
 *
 * Uncovered canvas stays playable while windows are merely open.
 */
const ownership = { blockingOverlay: false, uiFocus: false, gesture: false };
let epoch = 0;
const listeners = new Set<() => void>();
function set(flag: keyof typeof ownership, value: boolean) {
    if (ownership[flag] === value) return;
    ownership[flag] = value;
    epoch += 1;
    for (const listener of listeners) listener();
}
export function setBlockingOverlay(value: boolean) {
    set('blockingOverlay', value);
}
export function setUiFocus(value: boolean) {
    set('uiFocus', value);
}
export function setGesture(value: boolean) {
    set('gesture', value);
}
export const blockingOverlay = () => ownership.blockingOverlay;
/** Movement and interaction keys are suppressed whenever the interface owns input. */
export const worldKeysBlocked = () =>
    ownership.blockingOverlay || ownership.uiFocus || ownership.gesture;
/** Canvas pointers stay playable under plain window browsing; confirmations and gestures do not. */
export const canvasBlocked = () => ownership.blockingOverlay || ownership.gesture;
/** Changes on every ownership transition, so scenes can drop stale held-key state. */
export const ownershipEpoch = () => epoch;
export function onOwnershipChange(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
