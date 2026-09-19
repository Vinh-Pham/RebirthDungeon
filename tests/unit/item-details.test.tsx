// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { produce } from 'immer';
import { ItemDetails } from '../../src/ui/ItemDetails';
import { blankSave, reduceCommand } from '../../src/domain/commands';
import { criticalStats } from '../../src/domain/skillSystem';

afterEach(cleanup);
function character() {
    return reduceCommand(
        reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'nav'),
        {
            type: 'CREATE',
            id: 'hero',
            now: 0,
            input: { name: 'Hero', race: 'Human', age: 17, talent: 'Close Combat' },
        },
        'create',
    ).data.characters[0];
}
it('labels weapon power and skill-based critical values without inventing weapon critical bonuses', () => {
    const c = character();
    render(
        <ItemDetails
            character={c}
            item={{ id: 'broken', kind: 'steel', count: 1, durability: 0 }}
        />,
    );
    expect(screen.getByText('Base weapon power').nextElementSibling?.textContent).toBe('15');
    expect(screen.getByText('Critical rate (character)').nextElementSibling?.textContent).toBe(
        '0%',
    );
    expect(screen.getByText(/Broken: weapon power halved/)).toBeTruthy();
    const learned = produce(c, (draft) => {
        draft.skills.critical = { rank: 'F', training: {} };
    });
    expect(criticalStats(learned)).toEqual({ criticalChance: 1000, criticalBonus: 0.5 });
});
it('shows race restrictions and percentage-based costs accurately', () => {
    const c = character();
    const view = render(
        <ItemDetails character={c} item={{ id: 'charm', kind: 'woodlandCharm', count: 1 }} />,
    );
    expect(screen.getByText('Cannot equip: Requires Elf.')).toBeTruthy();
    view.rerender(
        <ItemDetails character={c} item={{ id: 'focus', kind: 'focusWand', count: 1 }} />,
    );
    expect(screen.getByText('All skills: -20% MP cost')).toBeTruthy();
});
it('shows consumable penalties and timed effects', () => {
    render(
        <ItemDetails
            character={character()}
            item={{ id: 'elixir', kind: 'unstableElixir', count: 2 }}
        />,
    );
    expect(screen.getByText('Restores').nextElementSibling?.textContent).toBe('45 MP');
    expect(screen.getByText('-15 Will')).toBeTruthy();
    expect(screen.getByText('During a dungeon run')).toBeTruthy();
});
