// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryPanel } from '../../src/ui/InventoryPanel';
import { blankSave, reduceCommand } from '../../src/domain/commands';
import { stubWindowEnvironment } from './helpers/windowHarness';
import { blockingOverlay } from '../../src/game/inputState';

vi.hoisted(() => {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
});

beforeAll(() => {
    stubWindowEnvironment();
    Element.prototype.getAnimations = () => [];
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);
function fixture() {
    return reduceCommand(
        reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'nav'),
        {
            type: 'CREATE',
            id: 'hero',
            now: 0,
            input: { name: 'Inventory', race: 'Human', talent: 'Close Combat', age: 17 },
        },
        'create',
    );
}
it('exposes all nine slots and sends explicit moves using the non-drag controls', async () => {
    const user = userEvent.setup(),
        save = fixture(),
        send = vi.fn();
    render(
        <InventoryPanel
            character={save.data.characters[0]}
            save={save}
            disabled={false}
            error=""
            send={send}
        />,
    );
    expect(screen.getAllByRole('button', { name: /^Choose / })).toHaveLength(9);
    expect(screen.getAllByRole('button', { name: /^Column / })).toHaveLength(60);
    await user.click(screen.getByRole('button', { name: 'Health potion ×3' }));
    await user.click(screen.getByRole('button', { name: 'Move', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Column 6, row 10', exact: true }));
    expect(send).toHaveBeenCalledWith({
        type: 'MOVE_ITEM',
        id: 'hero-hp',
        anchor: { column: 5, row: 9 },
    });
    await user.click(screen.getByRole('button', { name: 'Ashwood sword ×1' }));
    expect(
        (screen.getByRole('button', { name: 'Drop', exact: true }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.queryByRole('button', { name: 'Use', exact: true })).toBeNull();
});
it('requires confirmation, preserves the dialog after failed writes and closes after a committed discard', async () => {
    const user = userEvent.setup(),
        save = fixture(),
        send = vi.fn();
    const props = { character: save.data.characters[0], save, disabled: false, error: '', send };
    const view = render(<InventoryPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Health potion ×3' }));
    await user.click(screen.getByRole('button', { name: 'Drop', exact: true }));
    expect(send).not.toHaveBeenCalled();
    expect(blockingOverlay()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
    expect(blockingOverlay()).toBe(false);
    expect(send).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Drop', exact: true }));
    const dialog = screen.getByRole('alertdialog');
    await user.clear(within(dialog).getByRole('spinbutton'));
    await user.type(within(dialog).getByRole('spinbutton'), '2');
    await user.click(within(dialog).getByRole('button', { name: 'Discard', exact: true }));
    expect(send).toHaveBeenCalledWith({ type: 'DROP_ITEM', id: 'hero-hp', quantity: 2 });
    view.rerender(<InventoryPanel {...props} error="Storage unavailable" />);
    expect(screen.getByRole('alertdialog')).toBeDefined();
    expect(within(dialog).getByRole('alert').textContent).toBe('Storage unavailable');
    const next = reduceCommand(save, { type: 'DROP_ITEM', id: 'hero-hp', quantity: 2 }, 'drop');
    view.rerender(<InventoryPanel {...props} save={next} character={next.data.characters[0]} />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(blockingOverlay()).toBe(false);
});