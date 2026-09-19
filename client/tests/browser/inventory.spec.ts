import { expect, test, type Page, type Locator } from '@playwright/test';
import { blankSave, reduceCommand, type Command } from '../../src/domain/commands';
import type { SaveData } from '../../src/domain/model';
import { produce } from 'immer';
test.use({ actionTimeout: 10000 });
let op = 0;
function fixture() {
    const run = (s: SaveData, command: Command) =>
        reduceCommand(s, command, `browser-inventory:${++op}`) as SaveData;
    let s = run(run(blankSave(), { type: 'NAV', screen: 'NewCharacter' }), {
        type: 'CREATE',
        id: 'hero',
        now: 0,
        input: { name: 'Inventory Hero', race: 'Human', age: 17, talent: 'Close Combat' },
    });
    s = produce(s, (d) => {
        d.data.characters[0].gold = 1000;
        d.data.characters[0].hp -= 40;
    });
    for (const kind of ['clothCap', 'woodlandCharm', 'travelerRobe'])
        s = run(s, { type: 'BUY', shop: 'General', kind });
    s = run(s, { type: 'BUY', shop: 'Blacksmith', kind: 'steel' });
    return s;
}
async function hero(page: Page) {
    return page.evaluate(() => (window as any).__GAME__.save.data.characters[0]);
}
async function seed(page: Page, save = fixture()) {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__GAME__);
    await page.evaluate(async (value) => {
        await new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('rebirth-dungeon', 1);
            open.onsuccess = () => {
                const db = open.result;
                const tx = db.transaction('saves', 'readwrite');
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
    await page.waitForFunction(() => !!(window as any).__GAME__);
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
}
async function drag(
    page: Page,
    source: Locator,
    target: Locator,
    offset?: { x: number; y: number },
) {
    await source.scrollIntoViewIfNeeded();
    const from = (await source.boundingBox())!,
        to = (await target.boundingBox())!;
    await page.mouse.move(
        from.x + (offset?.x ?? from.width / 2),
        from.y + (offset?.y ?? from.height / 2),
    );
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + 10, { steps: 4 });
    await page.waitForTimeout(250);
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.waitForTimeout(100);
    await page.mouse.up();
}
test('inventory drag, slot and race checks, potion use and confirmed quantity discard persist', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await seed(page);
    const steel = (await hero(page)).inventory.find((i: any) => i.kind === 'steel').id;
    const steelTile = page.locator(`[data-item-id="${steel}"]`);
    await drag(page, steelTile, page.locator('[data-slot="main"]'));
    await expect.poll(async () => (await hero(page)).equipment.main).toBe(steel);
    await expect.poll(async () => (await hero(page)).placements['hero-weapon']).toBeTruthy();
    const robeId = (await hero(page)).inventory.find((i: any) => i.kind === 'travelerRobe').id;
    const robe = page.locator(`[data-item-id="${robeId}"]`);
    const robeBounds = (await robe.boundingBox())!;
    await drag(page, robe, page.getByRole('button', { name: 'Column 6, row 6', exact: true }), {
        x: robeBounds.width * 0.75,
        y: (robeBounds.height * 5) / 6,
    });
    await expect
        .poll(async () => (await hero(page)).placements[robeId])
        .toEqual({ column: 4, row: 3 });
    const potion = page.locator('[data-item-id="hero-hp"]');
    await drag(page, potion, page.getByRole('button', { name: 'Column 6, row 10', exact: true }));
    await expect
        .poll(async () => (await hero(page)).placements['hero-hp'])
        .toEqual({ column: 5, row: 9 });
    const cap = (await hero(page)).inventory.find((i: any) => i.kind === 'clothCap').id;
    const capTile = page.locator(`[data-item-id="${cap}"]`);
    const old = (await hero(page)).placements[cap];
    await drag(page, capTile, page.locator('[data-slot="boots"]'));
    expect((await hero(page)).placements[cap]).toEqual(old);
    await expect(page.getByRole('status', { name: 'Inventory feedback' })).toContainText(
        'does not fit',
    );
    const charm = (await hero(page)).inventory.find((i: any) => i.kind === 'woodlandCharm').id;
    await drag(
        page,
        page.locator(`[data-item-id="${charm}"]`),
        page.locator('[data-slot="accessory1"]'),
    );
    await expect(page.getByRole('status', { name: 'Inventory feedback' })).toContainText(
        'Requires Elf',
    );
    const hp = (await hero(page)).hp;
    await potion.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Use', exact: true }).click();
    await expect.poll(async () => (await hero(page)).hp).toBe(hp + 30);
    await potion.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Drop', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await hero(page)).inventory.find((i: any) => i.id === 'hero-hp').count).toBe(2);
    await potion.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Drop', exact: true }).click();
    await page.getByRole('spinbutton').fill('2');
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(potion).toHaveCount(0);
    await page.screenshot({ path: 'test-results/inventory-desktop.png', animations: 'disabled' });
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__GAME__);
    expect((await hero(page)).equipment.main).toBe(steel);
    expect((await hero(page)).inventory.some((i: any) => i.id === 'hero-hp')).toBe(false);
    expect(errors).toEqual([]);
});
test('inventory keyboard actions and narrow window keep destinations reachable', async ({
    page,
}) => {
    await seed(page);
    const tile = page.getByRole('button', { name: 'Cloth cap ×1', exact: true });
    await tile.focus();
    await page.keyboard.press('Control+Enter');
    await expect(page.getByRole('menu', { name: 'Cloth cap ×1' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Your belongings' })).toBeVisible();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await tile.click();
    await page.getByRole('button', { name: 'Equip', exact: true }).click();
    await page.getByRole('button', { name: 'Choose Headgear', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await hero(page)).equipment.head).toBeTruthy();
    await page.getByRole('button', { name: 'Unequip', exact: true }).click();
    await page.getByRole('button', { name: 'Column 3, row 7', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await hero(page)).equipment.head).toBeNull();
    await page.setViewportSize({ width: 320, height: 900 });
    await page
        .getByRole('button', { name: 'Column 6, row 10', exact: true })
        .scrollIntoViewIfNeeded();
    const grid = await page.locator('.inventory-grid').boundingBox();
    expect(grid!.width).toBeLessThanOrEqual(320);
    await page.screenshot({ path: 'test-results/inventory-mobile.png', animations: 'disabled' });
});

test.describe('touch inventory', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 1000 } });
    test('tap selection works at enlarged HUD scale', async ({ page }) => {
        const save = produce(fixture(), (d) => {
            d.data.settings.hudScale = 1.3;
        });
        await seed(page, save);
        await page.getByRole('button', { name: 'Cloth cap ×1', exact: true }).tap();
        await page.getByRole('button', { name: 'Equip', exact: true }).tap();
        await page.getByRole('button', { name: 'Choose Headgear', exact: true }).tap();
        await expect.poll(async () => (await hero(page)).equipment.head).toBeTruthy();
        await page.getByRole('button', { name: 'Health potion ×3', exact: true }).tap();
        await page.getByRole('button', { name: 'Use', exact: true }).tap();
        await expect
            .poll(
                async () => (await hero(page)).inventory.find((i: any) => i.id === 'hero-hp').count,
            )
            .toBe(2);
        await page.screenshot({ path: `test-results/inventory-touch.png`, animations: 'disabled' });
    });
});

test('inventory hover cards show weapon and consumable details without blocking item actions', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await seed(page);
    const sword = page.getByRole('button', { name: 'Steel sword ×1', exact: true });
    await sword.hover();
    const details = page.getByRole('dialog', { name: 'Steel sword details', exact: true });
    await expect(details).toBeVisible();
    await expect(details.getByRole('heading', { name: 'Steel sword', exact: true })).toBeVisible();
    await expect(details).toContainText('Base weapon power15');
    await expect(details).toContainText('Critical rate (character)0%');
    await expect(details).toContainText('Durability20 / 20');
    await expect(details).toContainText('Sell value40 gold each');
    await page.screenshot({ path: `test-results/inventory-hover-${test.info().project.name}.png` });
    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Your belongings' })).toBeVisible();
    await sword.click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(details).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 320, height: 900 });
    const potion = page.getByRole('button', { name: 'Health potion ×3', exact: true });
    await potion.scrollIntoViewIfNeeded();
    await potion.focus();
    const potionDetails = page.getByRole('dialog', { name: 'Health potion details', exact: true });
    await expect(potionDetails).toBeVisible();
    await expect(potionDetails).toContainText('Restores30 HP');
    const box = await potionDetails.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await page.screenshot({
        path: `test-results/inventory-hover-mobile-${test.info().project.name}.png`,
    });
});

test('dragging removes an open inventory hover card until the drag ends', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await seed(page);
    const sword = page.getByRole('button', { name: 'Steel sword ×1', exact: true });
    await sword.hover();
    await expect(
        page.getByRole('dialog', { name: 'Steel sword details', exact: true }),
    ).toBeVisible();
    const from = (await sword.boundingBox())!;
    await page.mouse.down();
    expect(await page.locator('[data-slot="hover-card-content"]').count()).toBe(0);
    await page.mouse.move(from.x + from.width + 20, from.y + 20, { steps: 8 });
    await expect(page.locator('[data-item-id][data-dragging]')).toHaveCount(1);
    await expect(page.locator('[data-slot="hover-card-content"]')).toHaveCount(0);
    // Stay over the grid beyond the hover delay to catch focus/timer-driven reopening.
    await page.waitForTimeout(700);
    await expect(page.locator('[data-slot="hover-card-content"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.locator('[data-item-id][data-dragging]')).toHaveCount(0);
    await page.mouse.move(0, 0);
    await sword.hover();
    await expect(
        page.getByRole('dialog', { name: 'Steel sword details', exact: true }),
    ).toBeVisible();
});