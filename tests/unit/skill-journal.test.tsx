// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SkillJournal } from '../../src/ui/SkillJournal';
import { active, blankSave, reduceCommand } from '../../src/domain/commands';

afterEach(cleanup);
function character() {
    const save = reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'nav');
    return active(
        reduceCommand(
            save,
            {
                type: 'CREATE',
                id: 'journal',
                now: 0,
                input: { name: 'Journal', age: 17, race: 'Human', talent: 'Magic' },
            },
            'create',
        ),
    )!;
}
it('discovers unlearned skills, shows their supplied icons, filters, and browses wiki ranks', () => {
    render(<SkillJournal character={character()} disabled={false} send={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search skills' }), {
        target: { value: 'firebolt' },
    });
    expect(screen.getByText('1 / 42 skills')).toBeDefined();
    expect(screen.getByTestId('skill-icon').getAttribute('src')).toBe(
        '/assets/game/skills/firebolt.webp',
    );
    expect(screen.getByRole('heading', { name: 'Firebolt' })).toBeDefined();
    fireEvent.change(screen.getByRole('combobox', { name: 'Inspect wiki rank' }), {
        target: { value: '1' },
    });
    const row = screen.getByText('Required AP ( Human / Giant )').closest('tr')!;
    expect(within(row).getByText('15')).toBeDefined();
    expect(
        screen.getByRole('link', { name: 'Source: Mabinogi World Wiki' }).getAttribute('href'),
    ).toBe('https://wiki.mabinogiworld.com/view/Firebolt');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'does not exist' } });
    expect(screen.getByText('No skills match your search.')).toBeDefined();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
        target: { value: 'Life' },
    });
    expect(screen.getByText('8 / 42 skills')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^Learn / })).toBeNull();
});
it('teaches eligible combat skills from the trainer and identifies unverified data', () => {
    const send = vi.fn();
    render(<SkillJournal character={character()} disabled={false} trainer send={send} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'firebolt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Learn Firebolt' }));
    expect(send).toHaveBeenCalledWith({ type: 'LEARN', skill: 'firebolt' });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'wand mastery' } });
    expect(
        screen.getByText('The wiki article has no content. No stats have been invented.'),
    ).toBeDefined();
    expect(screen.queryByRole('combobox', { name: 'Inspect wiki rank' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Learn / })).toBeNull();
});
