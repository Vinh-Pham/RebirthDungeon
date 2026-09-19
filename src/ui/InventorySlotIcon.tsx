import type { EquipmentSlot } from '../domain/model';

const outlines: Record<EquipmentSlot, string> = {
    accessory1: 'M10 10a7 7 0 1 0 12 0 M11 8l5-5 5 5-5 5z',
    accessory2: 'M10 10a7 7 0 1 0 12 0 M11 8l5-5 5 5-5 5z',
    head: 'M5 27V15a11 11 0 0 1 22 0v12h-6V17l-5 4-5-4v10z M16 4v10',
    main: 'M7 25L25 7l1-4-4 1L4 22 M4 17l11 11 M4 28l5-5',
    offhand: 'M16 3l11 5v9c0 6-7 11-11 13C12 28 5 23 5 17V8z M16 8v16',
    body: 'M11 4L3 9l4 8 4-2v14h10V15l4 2 4-8-8-5c0 5-10 5-10 0z',
    gloves: 'M10 28L4 17q-2-5 2-4l4 4V7q0-4 3-2v10-11q2-3 4 0v11-9q3-3 3 1v9-7q3-2 3 2v11l-3 6z',
    boots: 'M11 3h13v17l4 4v5H5v-5l8-5z M11 8h13 M6 25h20',
    robe: 'M10 11Q8 3 16 2q8 1 6 9l7 18H3z M10 11l6 5 6-5 M16 16v13',
};
export function InventorySlotIcon({ slot }: { slot: EquipmentSlot }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            style={{ width: 32, height: 32 }}
            width="32"
            height="32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d={outlines[slot]} />
        </svg>
    );
}
