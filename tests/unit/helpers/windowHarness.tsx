import { StrictMode, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { WindowProvider } from '../../../src/ui/windows/WindowProvider';
import { ManagerProbe } from './ManagerProbe';
import { windowManagerRef } from './windowManagerRef';

/**
 * jsdom has no layout observer or media queries. Browser journeys cover the real
 * geometry; these stubs only let the wmkit desktop bind without throwing.
 */
export function stubWindowEnvironment() {
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
    }));
}

function withProvider(ui: ReactElement, strict: boolean) {
    const tree = (
        <WindowProvider>
            <ManagerProbe />
            {ui}
        </WindowProvider>
    );
    return strict ? <StrictMode>{tree}</StrictMode> : tree;
}

export function renderWithWindows(ui: ReactElement) {
    const view = render(withProvider(ui, false));
    return {
        ...view,
        wm: () => windowManagerRef.current!,
        rerenderWith(next: ReactElement) {
            view.rerender(withProvider(next, false));
        },
    };
}

export function renderStrictWithWindows(ui: ReactElement) {
    const view = render(withProvider(ui, true));
    return {
        ...view,
        wm: () => windowManagerRef.current!,
        rerenderWith(next: ReactElement) {
            view.rerender(withProvider(next, true));
        },
    };
}
