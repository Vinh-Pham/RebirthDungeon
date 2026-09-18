import { test, expect, type Page } from '@playwright/test';
import { findPath } from '../../src/domain/dungeon';
async function state(page: Page) {
    // React can render the restored HUD before Phaser finishes preloading after a reload.
    const snapshot = await page.waitForFunction(() => (window as any).__GAME__, undefined, {
        timeout: 10000,
    });
    try {
        return await snapshot.jsonValue();
    } finally {
        await snapshot.dispose();
    }
}
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
            await control(
                page,
                c.skills.smash && c.stamina >= 4 && !c.cooldowns.smash ? 'smash' : 'normal',
            );
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
    const serviceTitles: Record<string, string> = {
        Healer: 'Healer House',
        Grocery: 'Grocery Store',
        General: 'General Shop',
        Blacksmith: 'Blacksmith',
        Bank: 'Bank',
        Trainer: 'Combat instructor',
    };
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
        await expect(page.getByRole('dialog', { name: serviceTitles[id] })).toBeVisible();
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
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Reduced motion: Off' }).click();
    await expect(page.getByRole('button', { name: 'Reduced motion: On' })).toBeVisible();
    // Escape closes only the active (Settings) window; the menu window stays open.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Adventure menu' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Town1', exact: true })).toBeVisible();
    expect((await state(page)).save.data.settings.reducedMotion).toBe(true);
});

test('trainer teaches a skill and the journal survives reload', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Skill interactions run in Chromium');
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin your journey' }).click();
    await page.getByRole('button', { name: 'Create a character' }).click();
    await page.getByRole('textbox', { name: 'Character name' }).fill('Learner');
    await page.getByRole('button', { name: 'Start a new life' }).click();
    await expect.poll(async () => (await state(page))?.position?.y).toBeGreaterThan(500);
    await page.waitForTimeout(300);
    const s = await state(page),
        trainer = s.locations.find((l: any) => l.id === 'Trainer');
    await page.mouse.click(trainer.x - s.camera.x, trainer.y - s.camera.y);
    await expect
        .poll(
            async () => {
                const s = await state(page);
                return Math.hypot(s.position.x - trainer.x, s.position.y - trainer.y);
            },
            { timeout: 15000 },
        )
        .toBeLessThan(60);
    await page.keyboard.press('e', { delay: 40 });
    await expect(page.getByRole('heading', { name: 'Combat instructor' })).toBeVisible();
    await page.getByRole('button', { name: 'Smash', exact: true }).click();
    await page.getByRole('button', { name: 'Learn Smash', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Smash · Rank F' })).toBeVisible();
    await expect(page.getByText('0 / 100 training points')).toBeVisible();
    await page
        .getByRole('dialog', { name: 'Smash · Rank F' })
        .getByRole('button', { name: 'Close', exact: true })
        .click();
    await page.reload();
    await page.getByRole('button', { name: 'Skills', exact: true }).click();
    await expect(page.getByTestId('skill-detail')).toHaveCount(0);
    await expect(
        page.getByRole('list', { name: 'Skills' }).getByRole('button', { name: /Smash/ }),
    ).toHaveCount(1);
    await page.screenshot({ path: 'test-results/skill-journal.png', animations: 'disabled' });
});

test('books, page assembly, equipment and AP advancement use saved UI transactions', async ({
    page,
}, info) => {
    test.skip(info.project.name !== 'chromium', 'Progression UI coverage runs in Chromium');
    const { blankSave, reduceCommand } = await import('../../src/domain/commands');
    let fixture: any = reduceCommand(
        blankSave(),
        { type: 'NAV', screen: 'NewCharacter' },
        'fixture-nav',
    );
    fixture = reduceCommand(
        fixture,
        {
            type: 'CREATE',
            input: { name: 'Scholar', race: 'Human', age: 17, talent: 'Close Combat' },
            id: 'scholar',
            now: Date.now(),
        },
        'fixture-create',
    );
    fixture = JSON.parse(JSON.stringify(fixture));
    const c = fixture.data.characters[0];
    c.skills.smash = { rank: 'F', counts: { hit: 40, kill: 4 } };
    c.inventory.push(
        ...[
            'criticalBook',
            'finalCollection',
            ...Array.from({ length: 5 }, (_, i) => `finalPage${i + 1}`),
            'shield',
        ].map((kind) => ({ id: kind, kind, count: 1 })),
    );
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Begin your journey' })).toBeEnabled();
    await page.evaluate(async (save) => {
        await new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('rebirth-dungeon', 1);
            open.onupgradeneeded = () => open.result.createObjectStore('saves');
            open.onsuccess = () => {
                const tx = open.result.transaction('saves', 'readwrite');
                tx.objectStore('saves').put(save, 'current');
                tx.oncomplete = () => {
                    open.result.close();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            };
            open.onerror = () => reject(open.error);
        });
    }, fixture);
    await page.reload();
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    await page
        .locator('.item')
        .filter({ hasText: 'Critical Hit manual' })
        .getByRole('button', { name: 'Read', exact: true })
        .click();
    await expect
        .poll(async () => (await state(page)).save.data.characters[0].skills.critical?.rank)
        .toBe('F');
    for (const number of [5, 2, 4, 1, 3])
        await page
            .locator('.item')
            .filter({ hasText: `Final Hit page ${number}` })
            .getByRole('button', { name: 'Insert page', exact: true })
            .click();
    await page
        .locator('.item')
        .filter({ hasText: 'Final Hit manual' })
        .getByRole('button', { name: 'Read', exact: true })
        .click();
    await page
        .locator('.item')
        .filter({ hasText: 'Round shield' })
        .getByRole('button', { name: 'Equip', exact: true })
        .click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Skills', exact: true }).click();
    await page.getByRole('button', { name: 'Smash', exact: true }).click();
    await expect(page.getByText('Ready to advance', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Rank up Smash', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Smash · Rank E' })).toBeVisible();
    await expect(page.getByText('0 / 100 training points')).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Skills', exact: true }).click();
    const saved = (await state(page)).save.data.characters[0];
    expect(saved.skills.final.rank).toBe('F');
    expect(saved.skills.critical.rank).toBe('F');
    expect(saved.skills.smash.rank).toBe('E');
    expect(saved.ap).toBe(1);
    expect(saved.offhand).toBe('shield');
    await page.setViewportSize({ width: 600, height: 800 });
    await page.getByRole('button', { name: 'Smash', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Smash · Rank E' })).toBeVisible();
    await page.waitForTimeout(400);
    const bounds = await page.getByRole('dialog', { name: 'Smash · Rank E' }).boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(801);
    await page.screenshot({
        path: 'test-results/skill-journal-mobile.png',
        animations: 'disabled',
    });
});

test('catalog icons, life references, and a full spellbook remain usable on a small screen', async ({
    page,
}, info) => {
    if (info.project.name !== 'chromium') return;
    const { blankSave, reduceCommand } = await import('../../src/domain/commands');
    const { skills } = await import('../../src/domain/Skills');
    let fixture = reduceCommand(
        blankSave(),
        { type: 'NAV', screen: 'NewCharacter' },
        'catalog-nav',
    );
    fixture = reduceCommand(
        fixture,
        {
            type: 'CREATE',
            input: { name: 'Catalog', race: 'Human', age: 17, talent: 'Magic' },
            id: 'catalog',
            now: 0,
        },
        'catalog-create',
    );
    for (const [id, skill] of Object.entries(skills)) {
        if (skill.category === 'Magic' && skill.route === 'lesson')
            fixture = reduceCommand(fixture, { type: 'LEARN', skill: id }, `catalog-learn-${id}`);
    }
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin your journey' }).waitFor();
    const store = async (save: unknown) => {
        await new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('rebirth-dungeon', 1);
            open.onupgradeneeded = () => open.result.createObjectStore('saves');
            open.onsuccess = () => {
                const tx = open.result.transaction('saves', 'readwrite');
                tx.objectStore('saves').put(save, 'current');
                tx.oncomplete = () => {
                    open.result.close();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            };
            open.onerror = () => reject(open.error);
        });
    };
    await page.evaluate(store, fixture);
    await page.reload();
    await page.getByRole('button', { name: 'Skills', exact: true }).click();
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await expect(page.getByTestId('skill-detail')).toHaveCount(0);
    await expect(
        page.getByRole('dialog', { name: 'Skill catalog' }).locator('.game-window-footer'),
    ).toContainText(`${fixture.data.characters[0].ap} AP`);
    await page.getByRole('tab', { name: 'Magic' }).click();
    await page.getByRole('button', { name: 'Firebolt', exact: true }).click();
    await expect(page.getByTestId('skill-icon')).toHaveAttribute(
        'src',
        '/assets/game/skills/firebolt.webp',
    );
    await expect
        .poll(() =>
            page.getByTestId('skill-icon').evaluate((img: HTMLImageElement) => img.naturalWidth),
        )
        .toBeGreaterThan(0);
    await page.getByRole('button', { name: /Inspect wiki rank/ }).click();
    await page.getByRole('option', { name: 'Rank 1', exact: true }).click();
    // Let the owned popup finish dismissing so the next Escape reaches the window.
    await expect(page.getByRole('option', { name: 'Rank 1', exact: true })).toBeHidden();
    await expect(page.getByRole('table')).toContainText('27.5%');
    await page
        .getByRole('dialog', { name: 'Firebolt · Rank F' })
        .locator('[data-wm-content]')
        .evaluate((body) => {
            body.scrollTop = 0;
        });
    await page.screenshot({
        path: 'test-results/skill-catalog-firebolt.png',
        animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Skill catalog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Firebolt', exact: true })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Magic' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Life' }).click();
    await expect(page.getByText(/\d+ \/ 42 skills/)).toHaveCount(0);
    await expect(page.getByText('No learned skills in this category.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Learn / })).toHaveCount(0);
    await page.setViewportSize({ width: 600, height: 800 });
    await page.screenshot({ path: 'test-results/skill-catalog-life-mobile.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'Magic' }).click();
    await page.getByRole('button', { name: 'Meteor Strike', exact: true }).scrollIntoViewIfNeeded();
    const catalogBounds = await page.getByRole('dialog', { name: 'Skill catalog' }).boundingBox();
    expect(catalogBounds!.x).toBeGreaterThanOrEqual(0);
    expect(catalogBounds!.x + catalogBounds!.width).toBeLessThanOrEqual(390);
    await expect
        .poll(() =>
            page
                .getByTestId('skill-row-meteorStrike')
                .locator('img')
                .evaluate((img: HTMLImageElement) => img.naturalWidth),
        )
        .toBeGreaterThan(0);
    await page.screenshot({
        path: 'test-results/skill-catalog-cards-mobile.png',
        animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.setViewportSize({ width: 600, height: 800 });
    fixture = reduceCommand(fixture, { type: 'ENTER', seed: 42 }, 'catalog-enter');
    fixture = reduceCommand(fixture, { type: 'ENCOUNTER', room: 1 }, 'catalog-battle');
    await page.evaluate(store, fixture);
    await page.reload();
    await expect
        .poll(async () => (await state(page)).controls.some((c: any) => c.name === 'next-skills'))
        .toBe(true);
    const before = (await state(page)).controls;
    const next = before.find((c: any) => c.name === 'next-skills');
    await page.mouse.move(next.x, next.y);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    await expect
        .poll(async () => (await state(page)).controls.some((c: any) => c.name === 'pass'))
        .toBe(true);
    const controls = (await state(page)).controls;
    expect(controls.some((c: any) => c.name === 'previous-skills')).toBe(true);
    expect(controls.every((c: any) => c.y + c.height / 2 <= 800)).toBe(true);
    await page.screenshot({ path: 'test-results/skill-catalog-spellbook-mobile.png' });
});

test('character stats, potion side effects and mixed reservations survive reload', async ({
    page,
}, info) => {
    if (info.project.name !== 'chromium') return;
    const { blankSave, reduceCommand } = await import('../../src/domain/commands');
    let fixture = reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'stats-nav');
    fixture = reduceCommand(
        fixture,
        {
            type: 'CREATE',
            input: { name: 'Stats', race: 'Human', age: 17, talent: 'Close Combat' },
            id: 'stats',
            now: 0,
        },
        'stats-create',
    );
    fixture = reduceCommand(fixture, { type: 'LEARN', skill: 'bloodStrike' }, 'stats-learn');
    fixture = reduceCommand(
        fixture,
        { type: 'BUY', shop: 'General', kind: 'unstableElixir' },
        'stats-buy',
    );
    fixture = reduceCommand(fixture, { type: 'ENTER', seed: 42 }, 'stats-enter');
    fixture = reduceCommand(fixture, { type: 'ENCOUNTER', room: 1 }, 'stats-encounter');
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin your journey' }).waitFor();
    await page.evaluate(async (save) => {
        await new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('rebirth-dungeon', 1);
            open.onupgradeneeded = () => open.result.createObjectStore('saves');
            open.onsuccess = () => {
                const tx = open.result.transaction('saves', 'readwrite');
                tx.objectStore('saves').put(save, 'current');
                tx.oncomplete = () => {
                    open.result.close();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            };
            open.onerror = () => reject(open.error);
        });
    }, fixture);
    await page.reload();
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    await page
        .locator('.item')
        .filter({ hasText: 'Unstable Elixir' })
        .getByRole('button', { name: 'Use', exact: true })
        .click();
    await expect
        .poll(async () => (await state(page)).save.data.characters[0].statuses.length)
        .toBe(1);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Character stats' })).toContainText(
        'Magic Defense',
    );
    await page.screenshot({
        path: 'test-results/character-stats-desktop.png',
        animations: 'disabled',
    });
    await expect(page.getByRole('tab')).toHaveCount(3);
    await page.getByRole('tab', { name: 'Part-Time Job', exact: true }).click();
    await expect(page.getByRole('tabpanel')).toContainText('Part-time jobs are not yet available.');
    await page.getByRole('tab', { name: 'Additional Info', exact: true }).click();
    await page.getByText('Stat sources', { exact: false }).click();
    await expect(page.getByRole('region', { name: 'Character stats' })).toContainText(
        'Unstable Elixir',
    );
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    expect((await state(page)).save.data.characters[0].statuses[0].remaining).toBe(3);
    await control(page, 'bloodStrike');
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Character stats' })).toContainText('4 reserved');
    await expect(
        page.getByRole('region', { name: 'Character stats' }).getByRole('progressbar'),
    ).toHaveCount(4);
    await page.setViewportSize({ width: 320, height: 800 });
    const characterDialog = page.getByRole('dialog', { name: 'Character Info' });
    await expect(characterDialog).toBeVisible();
    // The body is the scroll container; wmkit resize handles sit outside the frame.
    expect(
        await characterDialog
            .locator('[data-wm-content]')
            .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
        path: 'test-results/character-stats-mobile.png',
        animations: 'disabled',
    });
    const basicPanel = page.getByRole('tabpanel', { name: 'Basic Info' });
    expect(await basicPanel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Details', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Additional Info' })).toHaveAttribute(
        'aria-selected',
        'true',
    );
    await page.getByRole('tab', { name: 'Additional Info' }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Basic Info' })).toHaveAttribute(
        'aria-selected',
        'true',
    );
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    const before = (await state(page)).save.data.characters[0];
    await page.reload();
    expect((await state(page)).save.data.characters[0].battle.action.costs).toEqual({
        hp: 4,
        mana: 0,
        stamina: 3,
    });
    await control(page, 'pass');
    const after = (await state(page)).save.data.characters[0];
    expect(after.stamina).toBe(before.stamina - 3);
    expect(after.hp).toBeLessThanOrEqual(before.hp - 4);
    expect(after.statuses[0].remaining).toBe(2);
});

test('HeroUI HUD keeps identity, resources and navigation usable at narrow sizes and larger scale', async ({
    page,
}, info) => {
    test.skip(info.project.name !== 'chromium', 'HUD layout runs in Chromium');
    await page.goto('/');
    const hud = page.getByRole('contentinfo', { name: 'Game menu and character status' });
    await expect(hud.getByRole('progressbar')).toHaveCount(4);
    await expect(hud.getByRole('button', { name: 'Skills', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Begin your journey' }).click();
    await page.getByRole('button', { name: 'Create a character' }).click();
    await page.getByRole('textbox', { name: 'Character name' }).fill('Wayfarer');
    await page.getByRole('button', { name: 'Start a new life' }).click();
    await expect(hud.getByText('Human · Close Combat')).toBeVisible();
    await expect(hud.getByRole('progressbar', { name: 'HP', exact: true })).toHaveAttribute(
        'aria-valuenow',
        '118',
    );
    await expect(hud.getByRole('progressbar', { name: 'Experience' })).toHaveAttribute(
        'aria-valuenow',
        '0',
    );
    await expect.poll(async () => (await state(page))?.position?.y).toBeGreaterThan(500);
    await page.screenshot({ path: 'test-results/hud-desktop.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Talent', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('spinbutton', { name: /HUD scale/ }).fill('130');
    await page
        .getByRole('dialog', { name: 'Settings' })
        .getByRole('button', { name: 'Close' })
        .click();
    for (const width of [600, 390, 320]) {
        await page.setViewportSize({ width, height: 800 });
        const identity = await hud.getByTestId('hud-identity').boundingBox();
        const hp = await hud.getByRole('progressbar', { name: 'HP', exact: true }).boundingBox();
        expect(identity!.y + identity!.height).toBeLessThanOrEqual(hp!.y);
        const track = await hud
            .getByRole('progressbar', { name: 'HP', exact: true })
            .locator('.progress-bar__track')
            .boundingBox();
        expect(track!.width).toBeGreaterThan(40);
        const stamina = await hud
            .getByRole('progressbar', { name: 'SP', exact: true })
            .boundingBox();
        expect(stamina!.y + stamina!.height).toBeLessThanOrEqual(800);
        for (const name of ['Character', 'Skills', 'Inventory', 'Menu']) {
            const button = hud.getByRole('button', { name, exact: true });
            await expect(button).toBeVisible();
            const bounds = await button.boundingBox();
            expect(bounds!.x).toBeGreaterThanOrEqual(0);
            expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(800);
        }
        const footer = await hud.boundingBox();
        const game = await page.locator('#game-container').boundingBox();
        expect(game!.y + game!.height).toBeLessThanOrEqual(footer!.y + 1);
    }
    await page.screenshot({ path: 'test-results/hud-mobile-scaled.png', animations: 'disabled' });
    await hud.getByRole('button', { name: 'Skills', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Skill catalog' })).toBeVisible();
});
