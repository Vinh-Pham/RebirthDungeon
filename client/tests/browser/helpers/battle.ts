import { expect, type Page } from '@playwright/test';
export const battlePanel = (page: Page) => page.getByRole('region', { name: 'Battle controls' });
export async function readyTurn(page: Page) {
    await expect(battlePanel(page).getByRole('status')).toContainText('Your turn');
}
export async function attack(page: Page) {
    await readyTurn(page);
    const panel = battlePanel(page);
    await panel.getByRole('button', { name: 'attack', exact: true }).click();
    const before = await page.evaluate(() => (window as any).__GAME__.save.data.revision);
    if (await panel.getByRole('button', { name: 'Confirm Attack', exact: true }).isEnabled())
        await panel.getByRole('button', { name: 'Confirm Attack', exact: true }).click();
    else if (await panel.getByRole('button', { name: /Wait ·/ }).count())
        await panel.getByRole('button', { name: /Wait ·/ }).click();
    else {
        await panel.getByRole('button', { name: 'defend', exact: true }).click();
        await panel.getByRole('button', { name: 'Confirm Defend', exact: true }).click();
    }
    await expect
        .poll(() => page.evaluate(() => (window as any).__GAME__.save.data.revision))
        .toBeGreaterThan(before);
    await expect
        .poll(async () =>
            page.evaluate(() => {
                const s = (window as any).__GAME__.save;
                const hero = s.data.characters[0],
                    c = hero.rp?.actor ?? hero;
                return (
                    !c.battle ||
                    !!c.battle.winner ||
                    (c.battle.started && c.battle.order[c.battle.cursor] === c.id)
                );
            }),
        )
        .toBe(true);
}