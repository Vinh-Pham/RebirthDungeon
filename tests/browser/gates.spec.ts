import { expect, test, type Page } from '@playwright/test';
import { produce, type Immutable } from 'immer';
import { blankSave, reduceCommand } from '../../src/domain/commands';
import { dungeonGates } from '../../src/domain/dungeon';
import type { SaveData } from '../../src/domain/model';

function fixture(roomId: number, unlocked = false) {
    let save = reduceCommand(blankSave(), { type: 'NAV', screen: 'NewCharacter' }, 'nav');
    save = reduceCommand(
        save,
        {
            type: 'CREATE',
            id: 'gate-test',
            now: 0,
            input: { name: 'Gate Tester', age: 17, race: 'Human', talent: 'Close Combat' },
        },
        'create',
    );
    save = reduceCommand(save, { type: 'ENTER', seed: 42 }, 'enter');
    const gate = dungeonGates(save.data.characters[0]).find((g) => g.room === roomId)!;
    const room = save.data.characters[0].run!.rooms[roomId];
    const dx = gate.vertical ? Math.sign(gate.x - room.x) : 0;
    const dy = gate.vertical ? 0 : Math.sign(gate.y - room.y);
    save = produce(save, (draft) => {
        const run = draft.data.characters[0].run!;
        run.x = (gate.x + dx) * 32 + 16;
        run.y = (gate.y + dy) * 32 + 16;
        if (unlocked) run.cleared = [1, 2, 3, 4];
    });
    return { save, key: dx > 0 ? 'a' : dx < 0 ? 'd' : dy > 0 ? 'w' : 's' };
}
async function state(page: Page) {
    return page.evaluate(() => (window as any).__GAME__);
}
async function seed(page: Page, save: Immutable<SaveData>) {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__GAME__);
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
    await expect(page.getByRole('heading', { name: 'Alby', exact: true })).toBeVisible();
    await page.waitForFunction(() => !!(window as any).__GAME__?.position.x);
    await page.locator('#game-container').focus();
}
async function walk(page: Page, key: string) {
    await page.keyboard.down(key);
    await page.waitForTimeout(600);
    await page.keyboard.up(key);
}
test('room gates close on entry, survive reload, and open after victory', async ({
    page,
}, info) => {
    const { save, key } = fixture(1);
    await seed(page, save);
    expect((await state(page)).gates.some((g: any) => g.room === 0 || g.room === 5)).toBe(false);
    await walk(page, key);
    await expect(page.getByRole('heading', { name: 'A tangled encounter' })).toBeVisible();
    expect(
        (await state(page)).gates.filter((g: any) => g.room === 1).every((g: any) => g.closed),
    ).toBe(true);
    await page.reload();
    await page.waitForFunction(() =>
        (window as any).__GAME__?.controls.some((c: any) => c.name === 'normal'),
    );
    expect(
        (await state(page)).gates.filter((g: any) => g.room === 1).every((g: any) => g.closed),
    ).toBe(true);
    await page.screenshot({ path: `test-results/gates-closed-${info.project.name}.png` });
    for (
        let turn = 0;
        turn < 12 && (await state(page)).save.checkpoint.phase !== 'reward';
        turn++
    ) {
        for (const name of ['normal', 'attack']) {
            await expect
                .poll(async () => (await state(page)).controls.some((c: any) => c.name === name))
                .toBe(true);
            const before = await state(page);
            const control = before.controls.find((c: any) => c.name === name);
            await page.mouse.move(control.x, control.y);
            await page.waitForTimeout(50);
            await page.mouse.click(control.x, control.y, { delay: 60 });
            await expect
                .poll(async () => (await state(page)).save.data.revision)
                .toBeGreaterThan(before.save.data.revision);
        }
    }
    await expect(page.getByRole('button', { name: 'Take all', exact: true })).toBeVisible();
    expect(
        (await state(page)).gates.filter((g: any) => g.room === 1).every((g: any) => !g.closed),
    ).toBe(true);
    await page.getByRole('button', { name: 'Take all', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Alby', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/gates-open-${info.project.name}.png` });
});
test('boss gate blocks movement until every non-boss enemy room is cleared', async ({
    page,
}, info) => {
    const locked = fixture(6);
    await seed(page, locked.save);
    await expect(page.getByText('0 / 4 enemy rooms cleared · E to investigate')).toBeVisible();
    await walk(page, locked.key);
    expect((await state(page)).save.checkpoint.screen).toBe('Alby');
    expect(
        (await state(page)).gates.filter((g: any) => g.room === 6).every((g: any) => g.closed),
    ).toBe(true);
    await page.screenshot({ path: `test-results/gates-boss-${info.project.name}.png` });
    const unlocked = fixture(6, true);
    await seed(page, unlocked.save);
    expect(
        (await state(page)).gates.filter((g: any) => g.room === 6).every((g: any) => !g.closed),
    ).toBe(true);
    await walk(page, unlocked.key);
    await expect(page.getByRole('heading', { name: 'A tangled encounter' })).toBeVisible();
    expect((await state(page)).save.data.characters[0].battle.room).toBe(6);
});
