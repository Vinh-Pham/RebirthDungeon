import { useHotkeys } from 'react-hotkeys-hook';
import { canvasBlocked } from '../game/inputState';

export const windowShortcuts = {
    c: 'character',
    z: 'skills',
    q: 'quests',
    i: 'inventory',
} as const;
export type ShortcutWindow = (typeof windowShortcuts)[keyof typeof windowShortcuts];

export function useWindowHotkeys(enabled: boolean, toggle: (panel: ShortcutWindow) => void) {
    useHotkeys(
        Object.keys(windowShortcuts),
        (event) => {
            event.stopPropagation();
            if (event.repeat) return;
            const key = event.key.toLowerCase() as keyof typeof windowShortcuts;
            if (windowShortcuts[key]) toggle(windowShortcuts[key]);
        },
        {
            enabled,
            useKey: true,
            preventDefault: true,
            enableOnFormTags: false,
            enableOnContentEditable: false,
            ignoreEventWhen: (event) =>
                event.isComposing ||
                canvasBlocked() ||
                !!document.querySelector('[role="menu"], [role="listbox"]') ||
                (event.target instanceof Element &&
                    !!event.target.closest(
                        '[role="textbox"], [role="combobox"], [role="spinbutton"], [role="slider"]',
                    )),
        },
        [toggle],
    );
}
