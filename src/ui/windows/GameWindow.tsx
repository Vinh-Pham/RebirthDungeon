import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    restoreFocus,
    useWindowExists,
    useWindowSlot,
    useWindows,
    type WindowId,
    type WindowSpec,
} from './context';

/**
 * Declarative game window. The provider owns the wmkit chrome; this component owns
 * when the window exists and what its live body and footer contain. Closing through
 * wmkit (close button, Escape, scene cleanup) notifies the owner and restores focus
 * to the originating control when one is available.
 */
export function GameWindow({
    id,
    title,
    icon,
    iconTestId,
    footer,
    open,
    onClose,
    getOpener,
    children,
}: {
    id: WindowId;
    title: string;
    icon?: string;
    iconTestId?: string;
    footer?: ReactNode;
    open: boolean;
    onClose?: () => void;
    /** Returns the control that opened the window, for focus restoration on close. */
    getOpener?: () => HTMLElement | null;
    children: ReactNode;
}) {
    const { wm, openWindow, closeWindow, register } = useWindows();
    const exists = useWindowExists(id);
    const body = useWindowSlot(id, 'body');
    const footerEl = useWindowSlot(id, 'footer');
    const specRef = useRef<WindowSpec>({
        id,
        title,
        icon,
        iconTestId,
        hasFooter: false,
    });
    const onCloseRef = useRef(onClose);
    const getOpenerRef = useRef(getOpener);
    const seenOpenRef = useRef(false);

    // Sync the latest metadata and callbacks before the effects below read them.
    useLayoutEffect(() => {
        specRef.current = { id, title, icon, iconTestId, hasFooter: footer !== undefined };
        onCloseRef.current = onClose;
        getOpenerRef.current = getOpener;
    });

    // Publish presentation metadata on every render; the provider deduplicates.
    useLayoutEffect(() => {
        register(specRef.current);
    });

    // Open on demand. Opening an already open window only brings it forward, so tabs,
    // scroll position, and form values survive.
    useLayoutEffect(() => {
        if (open) {
            openWindow(specRef.current);
            return;
        }
        if (wm.get(id)) closeWindow(id);
        seenOpenRef.current = false;
    }, [open, openWindow, closeWindow, wm, id]);

    // The window went away through wmkit (close button, Escape, closeAll): tell the
    // owner and hand focus back to the originating control when one is available.
    // The first run sees the window before it opens, so only real closures notify.
    useEffect(() => {
        if (!exists) {
            if (seenOpenRef.current && open) {
                seenOpenRef.current = false;
                restoreFocus(getOpenerRef.current?.() ?? null);
                onCloseRef.current?.();
            }
            return;
        }
        seenOpenRef.current = true;
    }, [open, exists]);

    // Unmounting closes the window for real (scene changes, parent teardown).
    useLayoutEffect(() => {
        const manager = wm;
        return () => {
            if (manager.get(id)) manager.close(id);
        };
    }, [wm, id]);

    if (!body) return null;
    return (
        <>
            {createPortal(children, body)}
            {footer !== undefined && footerEl && createPortal(footer, footerEl)}
        </>
    );
}
