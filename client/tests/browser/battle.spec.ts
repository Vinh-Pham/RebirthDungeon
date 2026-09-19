import { expect, test, type Page } from '@playwright/test';
import { battle, edit } from '../unit/helpers/battle';
import { battlePanel, readyTurn, attack } from './helpers/battle';
async function snapshot(page: Page) {
    await page.waitForFunction(() => !!(window as any).__GAME__);
    return page.evaluate(() => (window as any).__GAME__.save);
}
test('battle menus share item allowance, preserve turns on reload, support keyboard and narrow screens', async ({
    page,
}) => {
    const save = edit(battle(['smash']), (c) => {
        c.hp = 20;
    });
    await page.goto('/');
    await snapshot(page);
    await page.evaluate(async (value) => {
        await new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('rebirth-dungeon', 1);
            open.onsuccess = () => {
                const db = open.result,
                    tx = db.transaction('saves', 'readwrite');
                tx.objectStore('saves').put(value, 'current');
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            };
        });
    }, save);
    await page.reload();
    await readyTurn(page);
    const panel = battlePanel(page);
    await expect(panel.getByRole('list', { name: 'Turn order' }).getByRole('listitem')).toHaveCount(
        2,
    );
    await panel.getByRole('button', { name: 'items', exact: true }).click();
    await panel.getByRole('button', { name: 'Health potion ×3', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(panel).toContainText('Item used');
    const used = (await snapshot(page)).data.characters[0];
    expect(used.hp).toBe(50);
    expect(used.battle.turnId).toBe(save.data.characters[0].battle!.turnId);
    await page.reload();
    await readyTurn(page);
    await expect(panel).toContainText('Item used');
    await page
        .getByRole('navigation', { name: 'Game navigation' })
        .getByRole('button', { name: 'Inventory', exact: true })
        .click();
    const inventory = page.getByRole('dialog', { name: 'Your belongings' });
    await inventory
        .getByRole('button', { name: 'Health potion ×2', exact: true })
        .click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: /Use/ })).toBeDisabled();
    await page.keyboard.press('Escape');
    await inventory.getByRole('button', { name: 'Close', exact: true }).click();
    await panel.getByRole('button', { name: 'defend', exact: true }).click();
    await panel.getByRole('button', { name: 'Confirm Defend', exact: true }).click();
    await expect
        .poll(async () => (await snapshot(page)).data.characters[0].battle.turnId)
        .not.toBe(used.battle.turnId);
    await readyTurn(page);
    await expect(panel).toContainText('Item available');
    await panel.getByRole('button', { name: 'skills', exact: true }).click();
    await panel.getByRole('button', { name: /Smash · F/ }).click();
    const before = (await snapshot(page)).data.revision;
    for (const height of [800, 568]) {
        await page.setViewportSize({ width: 320, height });
        await panel
            .getByRole('button', { name: 'Use Skill', exact: true })
            .scrollIntoViewIfNeeded();
        const bounds = (await panel.boundingBox())!;
        const hud = (await page.getByRole('contentinfo').boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(hud.y);
        await page.screenshot({ path: `test-results/battle-320-${height}.png` });
    }
    await panel.getByRole('button', { name: 'Use Skill', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).data.revision).toBeGreaterThan(before);
    await readyTurn(page);
    await attack(page);
    const observer = await page.context().newPage();
    await observer.goto('/');
    await snapshot(observer);
    await expect(
        battlePanel(observer).getByRole('button', { name: 'Confirm Attack', exact: true }),
    ).toBeDisabled();
    await observer.close();
});