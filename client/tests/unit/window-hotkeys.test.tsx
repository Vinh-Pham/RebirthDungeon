// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useWindowHotkeys } from '../../src/ui/useWindowHotkeys';
import { setBlockingOverlay, setGesture } from '../../src/game/inputState';

afterEach(() => {
    cleanup();
    setBlockingOverlay(false);
    setGesture(false);
});
function Harness({
    toggle,
    enabled = true,
}: {
    toggle: (panel: string) => void;
    enabled?: boolean;
}) {
    useWindowHotkeys(enabled, toggle);
    return (
        <>
            <input aria-label="Search" />
            <div contentEditable suppressContentEditableWarning data-testid="editable" />
        </>
    );
}
function key(key: string, target: Document | HTMLElement = document, extra = {}) {
    fireEvent.keyDown(target, { key, code: `Key${key.toUpperCase()}`, ...extra });
    fireEvent.keyUp(target, { key, code: `Key${key.toUpperCase()}`, ...extra });
}
it('routes all four shortcuts, ignores repeats and modifiers, and uses the latest callback', () => {
    const toggle = vi.fn(),
        next = vi.fn();
    const view = render(<Harness toggle={toggle} />);
    for (const letter of ['c', 'z', 'q', 'i']) key(letter);
    expect(toggle.mock.calls.map(([panel]) => panel)).toEqual([
        'character',
        'skills',
        'quests',
        'inventory',
    ]);
    key('c', document, { repeat: true });
    key('z', document, { ctrlKey: true });
    key('s');
    expect(toggle).toHaveBeenCalledTimes(4);
    view.rerender(<Harness toggle={next} />);
    key('i');
    expect(next).toHaveBeenCalledWith('inventory');
});
it('leaves typing, composition, menus, confirmations and gestures alone', () => {
    const toggle = vi.fn();
    render(<Harness toggle={toggle} />);
    key('z', screen.getByRole('textbox'));
    key('i', document, { isComposing: true });
    setBlockingOverlay(true);
    key('c');
    setBlockingOverlay(false);
    setGesture(true);
    key('q');
    setGesture(false);
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.append(menu);
    key('i');
    menu.remove();
    expect(toggle).not.toHaveBeenCalled();
});
it('does not register shortcuts outside gameplay and removes listeners on unmount', () => {
    const toggle = vi.fn();
    const view = render(<Harness enabled={false} toggle={toggle} />);
    key('c');
    view.rerender(<Harness toggle={toggle} />);
    view.unmount();
    key('z');
    expect(toggle).not.toHaveBeenCalled();
});