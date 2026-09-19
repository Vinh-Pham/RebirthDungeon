import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { Bounds, DesktopBinder, WindowManager } from '@surdeddd/wmkit';

/** Stable identifiers: one per main panel, the single service window, and each journal detail. */
export type WindowId =
    | 'character'
    | 'quests'
    | 'quests-detail'
    | 'skills'
    | 'inventory'
    | 'menu'
    | 'settings'
    | 'service'
    | 'skills-detail'
    | 'trainer-detail';

export interface WindowSpec {
    id: WindowId;
    /** Visible heading; wmkit synchronizes it into `data-wm-title` and uses it as the
     *  dialog's accessible name through its `aria-labelledby` binding. */
    title: string;
    /** Optional icon rendered beside the title, outside wmkit's title element. */
    icon?: string;
    iconTestId?: string;
    hasFooter?: boolean;
}

export interface WindowEntry extends WindowSpec {
    hasFooter: boolean;
}

export interface WindowsApi {
    wm: WindowManager;
    binder: DesktopBinder;
    /** Opens the window, or brings the existing one forward without touching its content. */
    openWindow(spec: WindowSpec): void;
    focusWindow(id: WindowId): void;
    closeWindow(id: WindowId): void;
    closeAllWindows(): void;
    /** Publishes presentation metadata; content is rendered by `GameWindow` portals. */
    register(spec: WindowSpec): void;
}

export const WindowsContext = createContext<WindowsApi | null>(null);
export const SlotsContext = createContext<SlotStore | null>(null);

export function useWindows(): WindowsApi {
    const api = useContext(WindowsContext);
    if (!api) throw new Error('GameWindow requires the WindowProvider desktop.');
    return api;
}

/** Manager access for tests and advanced callers. */
export function useWindowManagerInstance() {
    return useWindows().wm;
}

/** Slot elements that frames expose so `GameWindow` can portal live content into them. */
export class SlotStore {
    private elements = new Map<string, Partial<Record<'body' | 'footer', HTMLElement>>>();
    private listeners = new Map<string, Set<() => void>>();
    set(id: string, kind: 'body' | 'footer', element: HTMLElement | null) {
        const record = this.elements.get(id) ?? {};
        if (record[kind] === (element ?? undefined)) return;
        if (element) record[kind] = element;
        else delete record[kind];
        this.elements.set(id, record);
        for (const listener of this.listeners.get(id) ?? []) listener();
    }
    get(id: string, kind: 'body' | 'footer') {
        return this.elements.get(id)?.[kind];
    }
    subscribe(id: string, listener: () => void) {
        let set = this.listeners.get(id);
        if (!set) {
            set = new Set();
            this.listeners.set(id, set);
        }
        set.add(listener);
        return () => void set.delete(listener);
    }
}

/**
 * Hand focus back after a window closes: the originating control first, then wmkit's
 * next focused window, and finally the game canvas when no window remains.
 */
export function restoreFocus(opener: HTMLElement | null | undefined) {
    if (opener?.isConnected) {
        // Press targets can be inner elements; climb to the nearest control so
        // keyboard focus lands somewhere meaningful.
        const focusable =
            opener.closest<HTMLElement>('button, [href], input, select, textarea, [tabindex]') ??
            opener;
        focusable.focus();
        return;
    }
    const active = document.activeElement;
    if (active && active !== document.body) return; // wmkit focused the next window
    if (!document.querySelector('[data-wm-window]'))
        document.getElementById('game-container')?.focus();
}

/** Stable subscription to one window's presence in the manager. */
export function useWindowExists(id: WindowId) {
    const { wm } = useWindows();
    const getSnapshot = useCallback(() => !!wm.get(id), [wm, id]);
    const subscribe = useCallback((notify: () => void) => wm.subscribe(notify), [wm]);
    return useSyncExternalStore(subscribe, getSnapshot);
}

/** Live handle of a window's body or footer element, for `GameWindow` portals. */
export function useWindowSlot(id: WindowId, kind: 'body' | 'footer') {
    const slots = useContext(SlotsContext);
    if (!slots) throw new Error('GameWindow requires the WindowProvider desktop.');
    return useSyncExternalStore(
        useCallback((notify: () => void) => slots.subscribe(id, notify), [slots, id]),
        useCallback(() => slots.get(id, kind), [slots, id, kind]),
    );
}

/** Bounds recorded when a window closes, so reopening restores it for the session. */
export type SessionGeometry = Map<WindowId, Bounds>;