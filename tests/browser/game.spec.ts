import { test, expect, type Page } from '@playwright/test';
import { findPath } from '../../src/domain/dungeon';
const state = (page: Page) => page.evaluate(() => (window as any).__GAME__);
async function control(page: Page, name: string) {
    await expect
        .poll(async () => (await state(page)).controls.some((c: any) => c.name === name), {
            message: `Control ${name} is available`,
        })
        .toBeTruthy();
    const snapshot = await state(page),
        b = snapshot.controls.find((c: any) => c.name === name);
    await page.mouse.move(b.x, b.y);
    await page.waitForTimeout(50);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    await expect
        .poll(async () => (await state(page)).save.data.revision, {
            message: `Control ${name} commits its action`,
        })
        .toBeGreaterThan(snapshot.save.data.revision);
}

async function moveToRoom(page: Page, id: number) {
    const s = await state(page),
        run = s.save.data.characters[0].run,
        r = run.rooms[id];
    const route = findPath(
        run.tiles,
        { x: Math.floor(s.position.x / 32), y: Math.floor(s.position.y / 32) },
        r,
    );
    const corners = route.filter(
        (p, i) =>
            i === route.length - 1 ||
            (i > 0 &&
                (p.x - route[i - 1].x !== route[i + 1].x - p.x ||
                    p.y - route[i - 1].y !== route[i + 1].y - p.y)),
    );
    for (const p of corners) {
        for (let tries = 0; tries < 100; tries++) {
            const current = await state(page);
            const dx = p.x * 32 + 16 - current.position.x,
                dy = p.y * 32 + 16 - current.position.y;
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) break;
            const horizontal = Math.abs(dx) >= Math.abs(dy),
                key = horizontal ? (dx > 0 ? 'd' : 'a') : dy > 0 ? 's' : 'w';
            await page.keyboard.down(key);
            await page.waitForTimeout(Math.min(150, (Math.abs(horizontal ? dx : dy) / 180) * 1000));
            await page.keyboard.up(key);
            if (tries === 99) throw new Error('Could not reach dungeon waypoint');
        }
    }
    await page.keyboard.press('e', { delay: 40 });
}
test('create, explore, fight, resume, defeat the boss and return with treasure', async ({
    page,
}, info) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin your journey' }).click();
    await page.getByRole('button', { name: 'Create a character' }).click();
    await page.getByRole('textbox', { name: 'Character name' }).fill('Rowan');
    await page.getByRole('button', { name: 'Start a new life' }).click();
    await expect(page.getByRole('heading', { name: 'Town1', exact: true })).toBeVisible();
    await expect(page.getByText('100 gold')).toBeVisible();
    await page.screenshot({ path: `test-results/town-${info.project.name}.png` });
    await expect.poll(async () => (await state(page))?.position?.y).toBeGreaterThan(500);
    await page.locator('canvas').click({ position: { x: 700, y: 400 } });
    await page.keyboard.down('w');
    await expect
        .poll(async () => (await state(page)).position.y, { timeout: 15000, intervals: [50] })
        .toBeLessThan(330);
    await page.keyboard.up('w');
    await page.keyboard.press('e', { delay: 40 });
    await expect(page.getByRole('heading', { name: 'Alby', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    if (info.project.name !== 'chromium') return;
    for (const room of [1, 2, 3, 6]) {
        await moveToRoom(page, room);
        await expect(page.getByRole('heading', { name: 'A tangled encounter' })).toBeVisible();
        let turns = 0;
        while ((await state(page)).save.checkpoint.phase !== 'reward' && turns++ < 30) {
            const c = (await state(page)).save.data.characters[0];
            if (c.hp < 50 && c.inventory.some((i: any) => i.kind === 'hp')) {
                await page.getByRole('button', { name: 'Inventory', exact: true }).click();
                const row = page.locator('.item').filter({ hasText: 'Health potion' });
                await row.getByRole('button', { name: 'Use', exact: true }).click();
                await page.getByRole('button', { name: 'Close', exact: true }).click();
            }
            await control(page, c.stamina >= 6 ? 'smash' : 'normal');
            if (room === 1 && turns === 1) {
                await control(page, 'die-0');
                await control(page, 'reroll');
                const before = (await state(page)).save.data.characters[0].battle;
                await page.reload();
                await expect
                    .poll(async () =>
                        (await state(page))?.controls.some((c: any) => c.name === 'attack'),
                    )
                    .toBeTruthy();
                const after = (await state(page)).save.data.characters[0].battle;
                expect(after.dice).toEqual(before.dice);
                expect(after.held).toEqual(before.held);
                expect(after.rerolls).toEqual(before.rerolls);
                await page.screenshot({ path: 'test-results/battle.png' });
            }
            await control(page, 'attack');
        }
        await expect(page.getByRole('button', { name: 'Take all', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Take all', exact: true }).click();
        await expect(page.getByText('· Collected').first()).toBeVisible();
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        await expect(
            page.getByRole('heading', {
                name: room === 6 ? 'The treasure chamber' : 'Alby',
                exact: true,
            }),
        ).toBeVisible();
    }
    await control(page, 'chest-2');
    await page.getByRole('button', { name: 'Take all', exact: true }).click();
    await page.reload();
    await expect(
        page.getByRole('button', { name: 'Return to town', exact: true }).last(),
    ).toBeVisible();
    expect((await state(page)).save.data.characters[0].run.chosen).toBe(2);
    await page.getByRole('button', { name: 'Return to town', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Town1', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
});

test('town shopping, inventory, bank and settings use accessible panels', async ({
    page,
}, info) => {
    test.skip(info.project.name !== 'chromium', 'Service coverage runs in Chromium');
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin your journey' }).click();
    await page.getByRole('button', { name: 'Create a character' }).click();
    await page.getByRole('textbox', { name: 'Character name' }).fill('Mira');
    await page.getByRole('button', { name: 'Start a new life' }).click();
    await expect(page.getByRole('heading', { name: 'Town1', exact: true })).toBeVisible();
    await expect.poll(async () => (await state(page))?.position?.y).toBeGreaterThan(500);
    await page.waitForTimeout(250);
    async function approach(id: string) {
        const s = await state(page),
            l = s.locations.find((l: any) => l.id === id);
        await page.mouse.click(l.x - s.camera.x, l.y - s.camera.y);
        await expect
            .poll(
                async () => {
                    const s = await state(page);
                    return Math.hypot(s.position.x - l.x, s.position.y - l.y);
                },
                { timeout: 15000, intervals: [100] },
            )
            .toBeLessThan(90);
        await page.keyboard.press('e', { delay: 40 });
        await expect(page.getByRole('dialog')).toBeVisible();
    }
    await approach('General');
    await page
        .getByTestId('shop-catalog')
        .locator('article')
        .filter({ hasText: 'Health potion' })
        .getByRole('button', { name: 'Buy · 10g' })
        .click();
    await expect(page.getByText('Health potion ×4')).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await approach('Bank');
    await page.getByRole('button', { name: 'Deposit gold', exact: true }).click();
    await expect(page.getByText(/Stored gold: 10/)).toBeVisible();
    await page.getByRole('button', { name: 'Withdraw gold', exact: true }).click();
    await expect(page.getByText(/Stored gold: 0/)).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'MENU' }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Reduced motion: Off' }).click();
    await expect(page.getByRole('button', { name: 'Reduced motion: On' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Town1', exact: true })).toBeVisible();
    expect((await state(page)).save.data.settings.reducedMotion).toBe(true);
});
