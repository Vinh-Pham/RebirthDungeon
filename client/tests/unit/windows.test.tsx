// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { useRef, useState, type ReactNode } from 'react';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameWindow } from '../../src/ui/windows/GameWindow';
import { setBlockingOverlay } from '../../src/game/inputState';
import {
    renderStrictWithWindows,
    renderWithWindows,
    stubWindowEnvironment,
} from './helpers/windowHarness';
import type { WindowId } from '../../src/ui/windows/context';

const originalGetAnimations = Element.prototype.getAnimations;
beforeAll(() => {
    Element.prototype.getAnimations = () => [];
    stubWindowEnvironment();
});
afterAll(() => {
    Element.prototype.getAnimations = originalGetAnimations;
    vi.unstubAllGlobals();
});
afterEach(() => {
    setBlockingOverlay(false);
    cleanup();
});

/** Accessible window names come from wmkit's title element, so they equal the title. */
function windows(...specs: { id: WindowId; title: string; children?: ReactNode }[]) {
    return specs.map(({ id, title, children }) => (
        <GameWindow key={id} id={id} title={title} open>
            {children ?? <p>{id} body</p>}
        </GameWindow>
    ));
}

it('keeps browsing windows independent', () => {
    renderWithWindows(
        windows(
            { id: 'character', title: 'Character Info' },
            { id: 'menu', title: 'Adventure menu' },
        ),
    );
    expect(screen.getByRole('dialog', { name: 'Character Info' })).toBeDefined();
    expect(screen.getByRole('dialog', { name: 'Adventure menu' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Character Info' })).toBeDefined();
});

it('brings an open window forward instead of resetting or duplicating it', async () => {
    const user = userEvent.setup();
    function Dup() {
        const [open, setOpen] = useState(false);
        return (
            <>
                <button onClick={() => setOpen(true)}>open character</button>
                <GameWindow
                    id="character"
                    title="Character Info"
                    open={open}
                    onClose={() => setOpen(false)}
                >
                    <p>Body content</p>
                </GameWindow>
            </>
        );
    }
    const view = renderWithWindows(<Dup />);
    await user.click(screen.getByRole('button', { name: 'open character' }));
    await user.click(screen.getByRole('button', { name: 'open character' }));
    expect(screen.getAllByRole('dialog', { name: 'Character Info' })).toHaveLength(1);
    expect(view.wm().get('character')).toBeDefined();
});

it('restores session geometry after closing and reopening', () => {
    function Toggle() {
        const [open, setOpen] = useState(false);
        return (
            <>
                <button onClick={() => setOpen((value) => !value)}>toggle character</button>
                <GameWindow
                    id="character"
                    title="Character Info"
                    open={open}
                    onClose={() => setOpen(false)}
                >
                    <p>Body content</p>
                </GameWindow>
            </>
        );
    }
    const view = renderWithWindows(<Toggle />);
    const wm = () => view.wm();
    wm().setViewport({ width: 1200, height: 800 });
    fireEvent.click(screen.getByRole('button', { name: 'toggle character' }));
    wm().move('character', 200, 100);
    const moved = wm().get('character')!.bounds;
    expect(moved.x).toBeGreaterThan(0);
    // Closing through wmkit's own close control records the bounds for the session.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(wm().get('character')).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'toggle character' }));
    expect(wm().get('character')!.bounds).toEqual(moved);
});

it('closes a detail window with its parent without touching siblings', () => {
    const view = renderWithWindows(
        windows(
            {
                id: 'skills',
                title: 'Skill catalog',
                children: windows({ id: 'skills-detail', title: 'Smash · Rank F' }),
            },
            { id: 'menu', title: 'Adventure menu' },
        ),
    );
    expect(screen.getByRole('dialog', { name: 'Smash · Rank F' })).toBeDefined();
    fireEvent.click(
        within(screen.getByRole('dialog', { name: 'Skill catalog' })).getByRole('button', {
            name: 'Close',
        }),
    );
    expect(screen.queryByRole('dialog', { name: 'Smash · Rank F' })).toBeNull();
    expect(view.wm().get('skills-detail')).toBeUndefined();
    expect(screen.getByRole('dialog', { name: 'Adventure menu' })).toBeDefined();
});

it('replaces the active service in place while other windows stay open', async () => {
    const user = userEvent.setup();
    function Service() {
        const [service, setService] = useState('Bank');
        return (
            <>
                <button onClick={() => setService('General Shop')}>walk to another sign</button>
                {windows(
                    { id: 'service', title: service },
                    { id: 'character', title: 'Character Info' },
                )}
            </>
        );
    }
    const view = renderWithWindows(<Service />);
    expect(screen.getByRole('dialog', { name: 'Bank' }).textContent).toContain('service body');
    await user.click(screen.getByRole('button', { name: 'walk to another sign' }));
    expect(view.wm().get('service')).toBeDefined();
    expect(screen.getByRole('dialog', { name: 'General Shop' }).textContent).toContain(
        'service body',
    );
    expect(screen.getByRole('dialog', { name: 'Character Info' })).toBeDefined();
});

it('updates window content live without reopening it', () => {
    const view = renderWithWindows(
        windows({ id: 'character', title: 'Character Info', children: <p>HP 118</p> }),
    );
    const bounds = view.wm().get('character')!.bounds;
    view.rerenderWith(
        windows({ id: 'character', title: 'Character Info', children: <p>HP 90</p> }),
    );
    expect(screen.getByRole('dialog', { name: 'Character Info' }).textContent).toContain('HP 90');
    expect(view.wm().get('character')!.bounds).toEqual(bounds);
});

it('restores focus to the originating control when the window closes', async () => {
    const user = userEvent.setup();
    function Opener() {
        const opener = useRef<HTMLElement | null>(null);
        const [open, setOpen] = useState(false);
        return (
            <>
                <button
                    onClick={(event) => {
                        opener.current = event.currentTarget;
                        setOpen(true);
                    }}
                >
                    open inventory
                </button>
                <GameWindow
                    id="inventory"
                    title="Your belongings"
                    open={open}
                    onClose={() => setOpen(false)}
                    getOpener={() => opener.current}
                >
                    <p>items</p>
                </GameWindow>
            </>
        );
    }
    const view = renderWithWindows(<Opener />);
    await user.click(screen.getByRole('button', { name: 'open inventory' }));
    expect(screen.getByRole('dialog', { name: 'Your belongings' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(view.wm().get('inventory')).toBeUndefined();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'open inventory' }));
});

it('escape closes only the active window, behind confirmations and owned popups', async () => {
    const user = userEvent.setup();
    function Popups() {
        const [popup, setPopup] = useState(false);
        return (
            <>
                <button onClick={() => setPopup((value) => !value)}>toggle owned popup</button>
                {popup && (
                    <ul role="listbox" aria-label="Owned popup">
                        <li>Rank F</li>
                    </ul>
                )}
                {windows(
                    { id: 'skills', title: 'Skill catalog' },
                    { id: 'menu', title: 'Adventure menu' },
                )}
            </>
        );
    }
    const view = renderWithWindows(<Popups />);
    // The last window opened holds focus; Escape closes exactly that one.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Adventure menu' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Skill catalog' })).toBeDefined();
    // A retained confirmation blocks window dismissal entirely.
    setBlockingOverlay(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Skill catalog' })).toBeDefined();
    setBlockingOverlay(false);
    // An owned popup dismisses itself first; the window stays.
    await user.click(screen.getByRole('button', { name: 'toggle owned popup' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Skill catalog' })).toBeDefined();
    expect(screen.getByRole('listbox', { name: 'Owned popup' })).toBeDefined();
    // Once the popup is dismissed, Escape reaches the window again.
    await user.click(screen.getByRole('button', { name: 'toggle owned popup' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    // Then the final window closes.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(view.wm().getState().windows).toEqual({});
});

it('moves the focused frame with the keyboard', () => {
    const view = renderWithWindows(windows({ id: 'menu', title: 'Adventure menu' }));
    view.wm().setViewport({ width: 1200, height: 800 });
    view.wm().move('menu', 100, 100);
    const before = view.wm().get('menu')!.bounds;
    const frame = screen.getByRole('dialog', { name: 'Adventure menu' });
    frame.focus();
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    expect(view.wm().get('menu')!.bounds.x).toBe(before.x - 1);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(view.wm().get('menu')!.bounds.x).toBe(before.x + 15);
    const heightBefore = view.wm().get('menu')!.bounds.height;
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    expect(view.wm().get('menu')!.bounds.height).toBe(heightBefore + 16);
});

it('cleans up windows exactly once under Strict Mode', () => {
    const view = renderStrictWithWindows(windows({ id: 'menu', title: 'Adventure menu' }));
    expect(screen.getAllByRole('dialog', { name: 'Adventure menu' })).toHaveLength(1);
    expect(Object.keys(view.wm().getState().windows)).toEqual(['menu']);
    view.unmount();
    expect(view.wm().getState().windows).toEqual({});
});

it('clamps a quest detail reopened after the viewport becomes narrow', () => {
    function Toggle() {
        const [open, setOpen] = useState(false);
        return (
            <>
                <button onClick={() => setOpen(true)}>open detail</button>
                <GameWindow
                    id="quests-detail"
                    title="Quest detail"
                    open={open}
                    onClose={() => setOpen(false)}
                >
                    <p>Notes and rewards</p>
                </GameWindow>
            </>
        );
    }
    const view = renderWithWindows(<Toggle />);
    view.wm().setViewport({ width: 1200, height: 800 });
    fireEvent.click(screen.getByRole('button', { name: 'open detail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    view.wm().setViewport({ width: 320, height: 600 });
    fireEvent.click(screen.getByRole('button', { name: 'open detail' }));
    const bounds = view.wm().get('quests-detail')!.bounds;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(600);
});