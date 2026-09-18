/** Transient presentation state: it never enters an Immer save snapshot. */
export let modalOpen = false;
export function blockWorld(value: boolean) {
    modalOpen = value;
}
