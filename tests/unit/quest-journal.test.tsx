// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestJournal, NpcQuests, QuestTracker } from '../../src/ui/QuestJournal';
import { GameWindow } from '../../src/ui/windows/GameWindow';
import { active, blankSave, reduceCommand } from '../../src/domain/commands';
import { renderWithWindows, stubWindowEnvironment } from './helpers/windowHarness';

beforeAll(() => {
    stubWindowEnvironment();
    Element.prototype.getAnimations = () => [];
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);
function character() {
    const s = reduceCommand(
        reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'nav'),
        {
            type: 'CREATE',
            id: 'ui-quest',
            now: 0,
            input: { name: 'Journal', race: 'Human', talent: 'Close Combat', age: 17 },
        },
        'create',
    );
    return active(s)!;
}
it('renders all category tabs, stacked cards, authored notes, rewards, and closes child details', async () => {
    const user = userEvent.setup(),
        send = vi.fn(),
        c = character();
    function Journal() {
        const [open, setOpen] = useState(true),
            [selected, select] = useState<string | null>(null);
        return (
            <GameWindow id="quests" title="Quests" open={open} onClose={() => setOpen(false)}>
                <QuestJournal
                    character={c}
                    disabled={false}
                    send={send}
                    selected={selected}
                    onSelect={select}
                />
            </GameWindow>
        );
    }
    renderWithWindows(<Journal />);
    expect(screen.getAllByRole('tab')).toHaveLength(6);
    expect(screen.getByRole('list', { name: 'Quests' }).children).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Aren’s Warning', exact: true }));
    const detail = screen.getByRole('dialog', { name: 'Aren’s Warning' });
    expect(within(detail).getByRole('region', { name: 'Quest notes' })).toBeDefined();
    expect(within(detail).getByText('50g')).toBeDefined();
    expect(within(detail).getByText('100 EXP')).toBeDefined();
    expect(
        (within(detail).getByRole('button', { name: 'Complete', exact: true }) as HTMLButtonElement)
            .disabled,
    ).toBe(true);
    await user.click(within(detail).getByRole('button', { name: 'Track Aren’s Warning' }));
    expect(send).toHaveBeenCalledWith({
        type: 'TRACK_QUEST',
        quest: 'arens-warning',
        tracked: true,
    });
    await user.click(
        within(screen.getByRole('dialog', { name: 'Quests', exact: true })).getByRole('button', {
            name: 'Close',
        }),
    );
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
});
it('keeps unavailable categories readable and prevents mutations while read-only', async () => {
    const user = userEvent.setup(),
        send = vi.fn();
    renderWithWindows(
        <QuestJournal
            character={character()}
            disabled
            send={send}
            selected={null}
            onSelect={vi.fn()}
        />,
    );
    await user.click(screen.getByRole('tab', { name: 'Collecting Quests' }));
    expect(screen.getByText('Speak with Nell to accept.')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Completed', exact: true }));
    expect(screen.getByText('No completed quests in this category.')).toBeDefined();
    cleanup();
    renderWithWindows(<NpcQuests character={character()} disabled send={send} npc="General" />);
    expect(
        (screen.getByRole('button', { name: 'Accept Silk for Nell' }) as HTMLButtonElement)
            .disabled,
    ).toBe(true);
    expect(send).not.toHaveBeenCalled();
});
it('opens tracked quests and shows pending progress separately', async () => {
    const user = userEvent.setup(),
        onOpen = vi.fn();
    const c = structuredClone(character());
    c.quests.tracked = ['kill-spiders'];
    c.quests.records['kill-spiders'].counts.spiders = 2;
    const s = reduceCommand(
        {
            ...blankSave(),
            data: { ...blankSave().data, activeId: c.id, characters: [c] },
            checkpoint: { version: 1, screen: 'Town1', phase: 'exploring' },
        },
        { type: 'ENTER', seed: 1 },
        'enter',
    );
    const hero = structuredClone(active(s)!);
    hero.run!.quests!.counts = { 'kill-spiders': { spiders: 1 } };
    renderWithWindows(<QuestTracker character={hero} onOpen={onOpen} />);
    expect(screen.getByText('Defeat spiders: 2 / 5 (+1 this run)')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Kill 5 Spiders' }));
    expect(onOpen).toHaveBeenCalledWith('kill-spiders');
});
