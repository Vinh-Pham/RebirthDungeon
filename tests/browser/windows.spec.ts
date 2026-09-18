import { test, expect, type Page } from '@playwright/test';
async function state(page: Page) {
    const snapshot = await page.waitForFunction(() => (window as any).__GAME__, undefined, {
        timeout: 10000,
    });
    try {
        return await snapshot.jsonValue();
    } finally {
        await snapshot.dispose();
    }
}
async function createCharacter(page: Page, name: string) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin your journey' }).click();
    await page.getByRole('button', { name: 'Create a character' }).click();
    await page.getByRole('textbox', { name: 'Character name' }).fill(name);
    await page.getByRole('button', { name: 'Start a new life' }).click();
    await expect(page.getByRole('heading', { name: 'Town1', exact: true })).toBeVisible();
    await expect.poll(async () => (await state(page))?.position?.y).toBeGreaterThan(500);
    await page.waitForTimeout(250);
}

async function position(page: Page) {
    return (await state(page)).position as { x: number; y: number };
}

test('windows drag, resize, stack, and remember session geometry', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Window gestures run in Chromium');
    await createCharacter(page, 'Windower');

    // Opening an open window again must not duplicate it.
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    const character = page.getByRole('dialog', { name: 'Character Info' });
    await expect(character).toHaveCount(1);

    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const menu = page.getByRole('dialog', { name: 'Adventure menu' });
    await expect(menu).toBeVisible();
    // The most recently opened window sits on top and holds focus.
    await expect(menu).toHaveAttribute('data-wm-focused', '');

    // Drag the character window by its titlebar; release happens over the canvas,
    // which must never reach the world underneath.
    const before = await character.boundingBox();
    const world = await position(page);
    await page.mouse.move(before!.x + 140, before!.y + 20);
    await page.mouse.down();
    await page.mouse.move(before!.x - 80, before!.y + 140, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const dragged = await character.boundingBox();
    expect(dragged!.x).toBeLessThan(before!.x);
    expect(dragged!.y).toBeGreaterThan(before!.y);
    expect(await position(page)).toEqual(world);

    // Clicking a window raises it above the others.
    await page.mouse.click(dragged!.x + 140, dragged!.y + 20);
    await page.waitForTimeout(150);
    await expect(character).toHaveAttribute('data-wm-focused', '');

    // Resize from the south-east corner grip.
    const grip = character.locator('[data-wm-resize="se"]');
    const gripBox = await grip.boundingBox();
    await page.mouse.move(gripBox!.x + gripBox!.width / 2, gripBox!.y + gripBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(gripBox!.x + 90, gripBox!.y + 70, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const resized = await character.boundingBox();
    expect(resized!.width).toBeGreaterThan(dragged!.width);
    expect(resized!.height).toBeGreaterThan(dragged!.height);

    // Geometry survives close and reopen for the page session.
    await character.getByRole('button', { name: 'Close' }).click();
    await expect(character).toHaveCount(0);
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    const reopened = await character.boundingBox();
    expect(reopened!.x).toBeCloseTo(resized!.x, 0);
    expect(reopened!.y).toBeCloseTo(resized!.y, 0);
    expect(reopened!.width).toBeCloseTo(resized!.width, 0);
});

test('uncovered canvas stays playable while windows absorb clicks and keys', async ({
    page,
}, info) => {
    test.skip(info.project.name !== 'chromium', 'World input checks run in Chromium');
    await createCharacter(page, 'Guarded');
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    const inventory = page.getByRole('dialog', { name: 'Your belongings' });
    await expect(inventory).toBeVisible();
    const box = await inventory.boundingBox();

    // Clicks and scrolling inside the window never reach the world.
    const world = await position(page);
    await page.mouse.click(box!.x + box!.width / 2, box!.y + 300);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(400);
    expect(await position(page)).toEqual(world);

    // With focus inside the window, movement keys belong to the interface.
    await page.keyboard.down('w');
    await page.waitForTimeout(700);
    await page.keyboard.up('w');
    expect(await position(page)).toEqual(world);

    // Clicking the uncovered canvas hands keyboard control back to the game.
    // (1300, 300) sits right of the window and inside open town ground.
    await page.mouse.click(1300, 300);
    await expect
        .poll(
            async () => {
                const now = await position(page);
                return Math.hypot(now.x - world.x, now.y - world.y);
            },
            { timeout: 15000, intervals: [50] },
        )
        .toBeGreaterThan(20);
    await page.keyboard.down('w');
    await expect
        .poll(async () => (await position(page)).y, { timeout: 15000, intervals: [50] })
        .toBeLessThan(world.y - 40);
    await page.keyboard.up('w');
});

test('scene transitions close windows and confirmations keep priority', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Journey input runs in Chromium');
    await createCharacter(page, 'Traveller');
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Character Info' })).toBeVisible();
    // The character window steps out of the way; the inventory one stays open.
    // Raise the background window first, as a real pointer user would.
    const characterWindow = page.getByRole('dialog', { name: 'Character Info' });
    const characterBox = await characterWindow.boundingBox();
    await page.mouse.click(characterBox!.x + 120, characterBox!.y + 14);
    await expect(characterWindow).toHaveAttribute('data-wm-focused', '');
    await characterWindow.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog', { name: 'Character Info' })).toHaveCount(0);

    // Move the inventory window aside so the northern gate stays reachable,
    // then hand input back to the world by clicking uncovered canvas.
    const inventory = page.getByRole('dialog', { name: 'Your belongings' });
    const inventoryBox = await inventory.boundingBox();
    await page.mouse.move(inventoryBox!.x + 140, inventoryBox!.y + 20);
    await page.mouse.down();
    await page.mouse.move(inventoryBox!.x - 320, inventoryBox!.y - 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await page.locator('canvas').click({ position: { x: 760, y: 300 } });
    await page.keyboard.down('w');
    await expect
        .poll(async () => (await position(page)).y, { timeout: 20000, intervals: [50] })
        .toBeLessThan(330);
    await page.keyboard.up('w');
    await page.keyboard.press('e', { delay: 40 });
    await expect(page.getByRole('heading', { name: 'Alby', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The abandon confirmation stays a blocking modal above everything.
    await page.getByRole('button', { name: 'Return to town' }).click();
    const confirm = page.getByRole('dialog', { name: 'Leave this chapter?' });
    await expect(confirm).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(confirm).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Windows keep working after the confirmation round-trip.
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Your belongings' })).toBeVisible();
});
