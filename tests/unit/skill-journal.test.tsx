// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { produce } from 'immer';
import { SkillJournal } from '../../src/ui/SkillJournal';
import { renderWithWindows, stubWindowEnvironment } from './helpers/windowHarness';
import { active, blankSave, reduceCommand } from '../../src/domain/commands';
import type { SaveData } from '../../src/domain/model';

const originalGetAnimations = Element.prototype.getAnimations;
beforeAll(() => {
    Element.prototype.getAnimations = () => [];
    stubWindowEnvironment();
});
afterAll(() => {
    Element.prototype.getAnimations = originalGetAnimations;
    vi.unstubAllGlobals();
});
afterEach(cleanup);
function saveWith(talent: 'Magic' | 'Close Combat') {
    const save = reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'nav');
    return reduceCommand(
        save,
        {
            type: 'CREATE',
            id: 'journal',
            now: 0,
            input: { name: 'Journal', age: 17, race: 'Human', talent },
        },
        'create',
    );
}
const hero = (save: SaveData) => active(save)!;
it('lists only learned skills in the skill window', () => {
    renderWithWindows(
        <SkillJournal character={hero(saveWith('Magic'))} disabled={false} send={() => {}} />,
    );
    expect(screen.getByRole('tab', { name: 'All' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('skill-row-normal')).toBeDefined();
    expect(screen.queryByTestId('skill-row-firebolt')).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByText(/\d+ \/ 42 skills/)).toBeNull();
    expect(screen.queryByTestId('skill-detail')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Life' }));
    expect(screen.getByText('No learned skills in this category.')).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(screen.getByTestId('skill-row-normal')).toBeDefined();
});
it('opens details only on request and browses wiki ranks in a modal', async () => {
    const user = userEvent.setup();
    const learned = reduceCommand(saveWith('Magic'), { type: 'LEARN', skill: 'firebolt' }, 'learn');
    renderWithWindows(<SkillJournal character={hero(learned)} disabled={false} send={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Firebolt', exact: true }));
    expect(screen.getByRole('dialog', { name: 'Firebolt · Rank F' })).toBeDefined();
    expect(screen.getByTestId('skill-icon').getAttribute('src')).toBe(
        '/assets/game/skills/firebolt.webp',
    );
    expect(screen.getByRole('heading', { name: /^Firebolt/ })).toBeDefined();
    await user.click(screen.getByRole('button', { name: /Inspect wiki rank/ }));
    await user.click(screen.getByRole('option', { name: 'Rank 1', exact: true }));
    const row = screen.getByText('Required AP ( Human / Giant )').closest('tr')!;
    expect(within(row).getByText('15')).toBeDefined();
    expect(
        screen.getByRole('link', { name: 'Source: Mabinogi World Wiki' }).getAttribute('href'),
    ).toBe('https://wiki.mabinogiworld.com/view/Firebolt');
    await user.click(screen.getByRole('button', { name: 'Close', exact: true }));
    expect(screen.queryByTestId('skill-detail')).toBeNull();
    expect(screen.getByTestId('skill-row-firebolt')).toBeDefined();
});
it('marks passive and battle-only rows, teaches from the trainer, and shows unverified data', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    renderWithWindows(
        <SkillJournal
            character={hero(saveWith('Close Combat'))}
            disabled={false}
            trainer
            send={send}
        />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(42);
    const smash = screen.getByTestId('skill-row-smash');
    const use = within(smash).getByRole('button', { name: 'Use' });
    expect(use.hasAttribute('disabled')).toBe(true);
    expect(
        within(screen.getByTestId('skill-row-combatMastery'))
            .getByRole('button', { name: 'Passive' })
            .hasAttribute('disabled'),
    ).toBe(true);
    await user.click(within(smash).getByRole('button', { name: 'Smash', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Learn Smash' }));
    expect(send).toHaveBeenCalledWith({ type: 'LEARN', skill: 'smash' });
    await user.click(screen.getByRole('button', { name: 'Close', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Wand Mastery', exact: true }));
    expect(
        screen.getByText('The wiki article has no content. No stats have been invented.'),
    ).toBeDefined();
    expect(screen.queryByRole('combobox', { name: 'Inspect wiki rank' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Learn / })).toBeNull();
});
it('offers Advance once a rank reaches 100 training and dispatches the rank up', () => {
    const send = vi.fn();
    const trained = produce(saveWith('Close Combat'), (d) => {
        d.data.characters[0].skills.smash = { rank: 'F', counts: { hit: 40, kill: 10 } };
    });
    renderWithWindows(<SkillJournal character={hero(trained)} disabled={false} send={send} />);
    const advance = within(screen.getByTestId('skill-row-smash')).getByRole('button', {
        name: 'Advance',
    });
    expect(advance.hasAttribute('disabled')).toBe(false);
    fireEvent.click(advance);
    expect(send).toHaveBeenCalledWith({ type: 'RANK_UP', skill: 'smash' });
});
it('keeps Advance hidden while training is incomplete and disabled reasons stay accurate', () => {
    const send = vi.fn();
    const partial = produce(saveWith('Close Combat'), (d) => {
        d.data.characters[0].skills.smash = { rank: 'F', counts: { hit: 20, kill: 2 } };
        d.data.characters[0].ap = 0;
    });
    renderWithWindows(<SkillJournal character={hero(partial)} disabled={false} send={send} />);
    expect(
        screen.getByRole('progressbar', { name: 'Smash training' }).getAttribute('aria-valuenow'),
    ).toBe('50');
    expect(
        within(screen.getByTestId('skill-row-smash')).queryByRole('button', { name: 'Advance' }),
    ).toBeNull();
});
it('uses recovery skills outside battle from their row', () => {
    const send = vi.fn();
    const learned = reduceCommand(saveWith('Magic'), { type: 'LEARN', skill: 'healing' }, 'learn');
    renderWithWindows(<SkillJournal character={hero(learned)} disabled={false} send={send} />);
    const use = within(screen.getByTestId('skill-row-healing')).getByRole('button', {
        name: 'Use',
    });
    expect(use.hasAttribute('disabled')).toBe(false);
    fireEvent.click(use);
    expect(send).toHaveBeenCalledWith({ type: 'USE_SKILL', skill: 'healing' });
});
