import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import {
    useDesktop,
    useWindowManager,
    useWmState,
    useWmWindow,
    useWmWindowRef,
} from '@surdeddd/wmkit/react';
import type { Bounds, Size, WindowManager } from '@surdeddd/wmkit';
import { blockingOverlay, onOwnershipChange, setGesture, setUiFocus } from '../../game/inputState';
import {
    SlotsContext,
    SlotStore,
    WindowsContext,
    useWindows,
    type WindowEntry,
    type WindowId,
    type WindowSpec,
    type WindowsApi,
} from './context';

/** Default sizes from the wmkit integration plan. */
const WINDOW_SIZES: Record<WindowId, Size> = {
    quests: { width: 640, height: 560 },
    'quests-detail': { width: 440, height: 520 },
    character: { width: 680, height: 620 },
    skills: { width: 680, height: 640 },
    'skills-detail': { width: 680, height: 640 },
    'trainer-detail': { width: 680, height: 640 },
    inventory: { width: 680, height: 660 },
    service: { width: 680, height: 560 },
    menu: { width: 360, height: 280 },
    settings: { width: 480, height: 440 },
};
const MIN_SIZE = { width: 320, height: 240 };

/** Bounds survive close/reopen for the page session only and never enter character saves. */
const sessionGeometry = new Map() as Map<WindowId, Bounds>;
const sessionViewports = new Map<WindowId, Size>();
let sessionOpens = 0;

export function WindowProvider({ children }: { children: ReactNode }) {
    // Snapping, grouping, minimize/maximize, and window-history shortcuts stay disabled;
    // wmkit's own keyboard handling is replaced by the scoped handling below.
    const wm = useWindowManager({
        keepInViewport: true,
        minVisible: 80,
        cascadeOffset: 32,
        historyLimit: 0,
    });
    const { ref: desktopRef, binder } = useDesktop(wm, {
        snap: false,
        grouping: false,
        magnetism: false,
        keyboard: false,
        announce: true,
        autoViewport: true,
        interactiveSelector: 'button, input, select, textarea, a[href]',
    });
    const state = useWmState(wm);
    const [slots] = useState(() => new SlotStore());
    const [desktopEl, setDesktopEl] = useState<HTMLElement | null>(null);
    const [entries, setEntries] = useState<ReadonlyMap<WindowId, WindowEntry>>(new Map());
    const blocked = useSyncExternalStore(
        useCallback((notify: () => void) => {
            let previous = blockingOverlay();
            return onOwnershipChange(() => {
                if (blockingOverlay() !== previous) {
                    previous = blockingOverlay();
                    notify();
                }
            });
        }, []),
        blockingOverlay,
    );
    const desktopCallback = useCallback(
        (element: HTMLElement | null) => {
            desktopRef(element);
            setDesktopEl(element);
        },
        [desktopRef],
    );

    // Remember geometry when a window closes so reopening restores it (session only).
    // Removing the focused element never fires focusout, so blur it explicitly to
    // hand input ownership back to the game (or the next window wmkit focuses).
    useLayoutEffect(
        () =>
            wm.on('close', ({ window }) => {
                void sessionGeometry.set(window.id as WindowId, window.bounds);
                sessionViewports.set(window.id as WindowId, wm.getState().viewport);
                const active = document.activeElement;
                if (active instanceof HTMLElement && active.closest(`[data-wm-id="${window.id}"]`))
                    active.blur();
            }),
        [wm],
    );

    const openWindow = useCallback(
        (spec: WindowSpec) => {
            const { id, title, icon, iconTestId, hasFooter } = spec;
            if (wm.get(id)) {
                wm.focus(id);
                return;
            }
            const size = WINDOW_SIZES[id];
            const meta = { icon, iconTestId, hasFooter: !!hasFooter };
            const companion =
                id === 'service'
                    ? wm.get('inventory')
                    : id === 'inventory'
                      ? wm.get('service')
                      : undefined;

            const saved = sessionGeometry.get(id);
            // Clamp both restored and newly opened windows before wmkit positions them.
            // A window reopened after a viewport change otherwise retains desktop dimensions.
            const offset = saved ? 0 : (sessionOpens++ % 6) * 32;
            const viewport = wm.getState().viewport;
            const oldViewport = sessionViewports.get(id);
            const sameViewport =
                saved &&
                oldViewport?.width === viewport.width &&
                oldViewport?.height === viewport.height;
            const width = Math.min(saved?.width ?? size.width, viewport.width || size.width);
            const height = Math.min(saved?.height ?? size.height, viewport.height || size.height);
            const paired = companion && viewport.width >= 1200;
            const pairWidth = Math.min(680, (viewport.width - 48) / 2);
            if (paired) {
                wm.resize(companion.id, { width: pairWidth, height: companion.bounds.height });
                wm.move(
                    companion.id,
                    companion.id === 'service' ? 16 : viewport.width - pairWidth - 16,
                    24,
                );
            }
            wm.open({
                id,
                title,
                meta,
                width: paired ? pairWidth : width,
                height,
                minWidth: Math.min(MIN_SIZE.width, width),
                minHeight: Math.min(MIN_SIZE.height, height),
                x: paired
                    ? id === 'service'
                        ? 16
                        : viewport.width - pairWidth - 16
                    : sameViewport
                      ? saved.x
                      : Math.min(
                            Math.max(0, saved?.x ?? (viewport.width - width) / 2 + offset),
                            Math.max(0, viewport.width - width),
                        ),
                y: paired
                    ? 24
                    : sameViewport
                      ? saved.y
                      : Math.min(
                            Math.max(0, saved?.y ?? (viewport.height - height) / 2 + offset),
                            Math.max(0, viewport.height - height),
                        ),
            });
        },
        [wm],
    );

    const register = useCallback(
        (spec: WindowSpec) => {
            const entry: WindowEntry = { ...spec, hasFooter: !!spec.hasFooter };
            setEntries((previous) => {
                const old = previous.get(spec.id);
                if (
                    old &&
                    old.title === entry.title &&
                    old.icon === entry.icon &&
                    old.iconTestId === entry.iconTestId &&
                    old.hasFooter === entry.hasFooter
                )
                    return previous;
                const next = new Map(previous);
                next.set(spec.id, entry);
                return next;
            });
            const win = wm.get(spec.id);
            if (win && win.title !== spec.title)
                wm.update(spec.id, {
                    title: spec.title,
                    meta: {
                        icon: spec.icon,
                        iconTestId: spec.iconTestId,
                        hasFooter: entry.hasFooter,
                    },
                });
        },
        [wm],
    );

    const api = useMemo<WindowsApi>(
        () => ({
            wm,
            binder,
            openWindow,
            focusWindow: (id) => void wm.focus(id),
            closeWindow: (id) => void wm.close(id),
            closeAllWindows: () => wm.closeAll(),
            register,
        }),
        [wm, binder, openWindow, register],
    );

    // Viewport (or HUD-scale) changes reflow windows: sizes shrink to fit the desktop
    // when it is smaller than the window, positions stay fully inside it, and the
    // 320x240 minimum is reduced when the desktop itself is smaller.
    useEffect(() => {
        const { width: vw, height: vh } = state.viewport;
        if (!vw || !vh) return;
        const windows = Object.values(wm.getState().windows);
        if (!windows.length) return;
        wm.batch(() => {
            for (const win of windows) {
                if (win.stage !== 'normal') continue;
                const bounds = win.bounds;
                const minWidth = Math.min(MIN_SIZE.width, vw);
                const minHeight = Math.min(MIN_SIZE.height, vh);
                const width = Math.min(bounds.width, vw);
                const height = Math.min(bounds.height, vh);
                const x = Math.min(Math.max(bounds.x, 0), Math.max(0, vw - width));
                const y = Math.min(Math.max(bounds.y, 0), Math.max(0, vh - height));
                if (width !== bounds.width || height !== bounds.height) {
                    wm.update(win.id, { minSize: { width: minWidth, height: minHeight } });
                    wm.resize(win.id, { width, height });
                }
                if (x !== bounds.x || y !== bounds.y) wm.move(win.id, x, y);
            }
        });
    }, [wm, state.viewport]);

    // A blocking confirmation takes input priority; windows step back without closing.
    useEffect(() => {
        if (blocked) wm.blur();
    }, [blocked, wm]);

    // Track UI focus: keyboard input belongs to the interface while it sits in a window,
    // the HUD, or an owned popup. Clicking the canvas hands control back to the game —
    // DOM focus alone cannot express that (clicking non-focusable space never blurs the
    // window), so pointer presses transfer ownership by where they land.
    useEffect(() => {
        const ownsTarget = (target: EventTarget | null) =>
            !!(target instanceof Element) &&
            !!target.closest(
                '[data-wm-window], .game-hud, .game-modal, [role="listbox"], [role="menu"], [role="tooltip"]',
            );
        const pointerDown = (event: PointerEvent) => setUiFocus(ownsTarget(event.target));
        const focusIn = (event: FocusEvent) => setUiFocus(ownsTarget(event.target));
        const focusOut = (event: FocusEvent) => {
            if (!event.relatedTarget) setUiFocus(false);
        };
        document.addEventListener('pointerdown', pointerDown, true);
        document.addEventListener('focusin', focusIn);
        document.addEventListener('focusout', focusOut);
        return () => {
            document.removeEventListener('pointerdown', pointerDown, true);
            document.removeEventListener('focusin', focusIn);
            document.removeEventListener('focusout', focusOut);
            setUiFocus(false);
        };
    }, []);

    // Window drags and resizes pause world movement until the pointer is released.
    useEffect(() => {
        if (!desktopEl) return;
        const start = (event: PointerEvent) => {
            if (
                event.target instanceof Element &&
                event.target.closest('[data-wm-drag], [data-wm-resize]')
            )
                setGesture(true);
        };
        const end = () => setGesture(false);
        desktopEl.addEventListener('pointerdown', start, true);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        return () => {
            desktopEl.removeEventListener('pointerdown', start, true);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            end();
        };
    }, [desktopEl]);

    // Scoped keyboard handling: Escape closes only the active window behind owned popups
    // and confirmations, F6/Shift+F6 cycle windows and the game, and arrows nudge the
    // focused frame or titlebar (Shift resizes, Alt uses fine increments).
    useEffect(() => {
        const keyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;
            const focusedId = wm.getState().focusedId;
            if (event.key === 'F6') {
                if (blockingOverlay()) return;
                event.preventDefault();
                cycleFromGame(wm, event.shiftKey ? -1 : 1);
                return;
            }
            if (event.key !== 'Escape') {
                moveFocusedFrame(wm, event);
                return;
            }
            if (blockingOverlay()) return; // retained confirmations own Escape
            // An owned popup (listbox/menu) dismisses itself first.
            if (document.querySelector('[role="listbox"], [role="menu"]')) return;
            if (!focusedId || !wm.get(focusedId)) return;
            // A gesture owns the pointer; never close its window underneath it.
            if (document.querySelector('[data-wm-dragging], [data-wm-resizing]')) {
                event.preventDefault();
                return;
            }
            event.preventDefault();
            wm.close(focusedId);
        };
        window.addEventListener('keydown', keyDown);
        return () => window.removeEventListener('keydown', keyDown);
    }, [wm]);

    return (
        <WindowsContext.Provider value={api}>
            <SlotsContext.Provider value={slots}>
                {children}
                <div
                    ref={desktopCallback}
                    className="wm-desktop"
                    data-blocked={blocked || undefined}
                >
                    {state.order.map((id) => (
                        <WindowFrame
                            key={id}
                            id={id as WindowId}
                            entry={entries.get(id as WindowId)}
                            slots={slots}
                        />
                    ))}
                </div>
            </SlotsContext.Provider>
        </WindowsContext.Provider>
    );
}

/** F6 cycles the game and every open window; the game sits at both ends of the cycle. */
function cycleFromGame(wm: WindowManager, direction: 1 | -1) {
    const { order, focusedId } = wm.getState();
    const windows = [...order].reverse(); // front to back
    if (!windows.length) return;
    if (!focusedId || !wm.get(focusedId)) {
        wm.focus(windows[0]);
        return;
    }
    const index = windows.indexOf(focusedId);
    const next = index + direction;
    if (next < 0 || next >= windows.length) {
        wm.blur();
        document.getElementById('game-container')?.focus();
        return;
    }
    wm.focus(windows[next]);
}

/** Arrow keys nudge the focused frame or titlebar; Shift resizes; Alt uses fine steps. */
function moveFocusedFrame(wm: WindowManager, event: KeyboardEvent) {
    if (!event.key.startsWith('Arrow')) return;
    const target = document.activeElement;
    if (!(target instanceof Element)) return;
    const frame = target.closest<HTMLElement>('[data-wm-window]');
    const id = frame?.getAttribute('data-wm-id') as WindowId | null;
    if (!frame || !id || !wm.get(id)) return;
    if (target !== frame && target !== frame.querySelector('[data-wm-drag]')) return;
    const step = event.altKey ? 1 : 16;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    if (event.shiftKey) {
        const bounds = wm.get(id)!.bounds;
        wm.resize(id, { width: bounds.width + dx, height: bounds.height + dy });
    } else wm.moveBy(id, dx, dy);
}

interface FrameProps {
    id: WindowId;
    entry: WindowEntry | undefined;
    slots: SlotStore;
}

/** The wmkit-bound chrome. React owns everything inside `data-wm-content`. */
function WindowFrame({ id, entry, slots }: FrameProps) {
    const { wm, binder } = useWindows();
    const win = useWmWindow(wm, id);
    const ref = useWmWindowRef(binder, id, { removeOnClose: false });
    if (!win) return null;
    return (
        <section
            ref={ref}
            data-wm-id={id}
            role="dialog"
            aria-modal="false"
            aria-label={win.title}
            className="game-window"
        >
            <header data-wm-drag className="game-window-header">
                {entry?.icon && (
                    <img
                        src={entry.icon}
                        alt=""
                        data-testid={entry.iconTestId}
                        width={28}
                        height={28}
                        className="rounded"
                    />
                )}
                {/* Plain text only: wmkit synchronizes this element with the window title. */}
                <h2 data-wm-title className="game-window-title">
                    {win.title}
                </h2>
                <span data-wm-controls className="game-window-controls">
                    <button
                        type="button"
                        data-wm-close
                        aria-label="Close"
                        className="game-window-close"
                    >
                        <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                            <path
                                d="M2 2l10 10M12 2L2 12"
                                stroke="currentColor"
                                strokeWidth="1.6"
                            />
                        </svg>
                    </button>
                </span>
            </header>
            <div
                data-wm-content
                className="game-window-body"
                ref={(element) => slots.set(id, 'body', element)}
            />
            <footer
                className="game-window-footer"
                ref={(element) => slots.set(id, 'footer', element)}
            />
        </section>
    );
}
