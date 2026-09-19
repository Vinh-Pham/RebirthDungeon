import { attack, readyTurn } from './helpers/battle';
import { expect, test, type Page } from '@playwright/test';
import { blankSave, reduceCommand, type Command } from '../../src/domain/commands';
import type { SaveData } from '../../src/domain/model';
import type { Immutable } from 'immer';

let operation = 0;
const reduce = (s: Immutable<SaveData>, cmd: Command) =>
    reduceCommand(s, cmd, `browser-quest-${++operation}`);
function fixture() {
    return reduce(reduce(blankSave(), { type: 'NAV', screen: 'NewCharacter' }), {
        type: 'CREATE',
        id: 'quest-browser',
        input: { name: 'Quest Walker', race: 'Human', talent: 'Close Combat', age: 17 },
        now: 0,
    });
}
async function snapshot(page: Page) {
    await page.waitForFunction(() => !!(window as any).__GAME__);
    return page.evaluate(() => (window as any).__GAME__);
}
async function seed(page: Page, value: Immutable<SaveData>) {
    await page.goto('/');
    // Finish the initial lazy Phaser import before fixture navigation cancels requests.
    await snapshot(page);
    await page.evaluate(async (save) => {
        await new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('rebirth-dungeon', 1);
            open.onupgradeneeded = () => open.result.createObjectStore('saves');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
                const tx = open.result.transaction('saves', 'readwrite');
                tx.objectStore('saves').put(save, 'current');
                tx.oncomplete = () => {
                    open.result.close();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            };
        });
    }, value);
    await page.reload();
    await snapshot(page);
}
async function battle(page: Page, memory = false) {
    for (let turns = 0; turns < 40; turns++) {
        const s = await snapshot(page);
        if (s.save.checkpoint.screen !== 'Battle' || s.save.checkpoint.phase === 'reward') return;
        await readyTurn(page);
        const c = memory ? s.save.data.characters[0].rp.actor : s.save.data.characters[0];
        if (c.hp < 50 && !c.battle.itemUsed && c.inventory.some((i: any) => i.kind === 'hp')) {
            await page.getByRole('button', { name: 'Inventory', exact: true }).click();
            await page.getByRole('button', { name: /^Health potion ×/ }).click({ button: 'right' });
            await page.getByRole('menuitem', { name: 'Use', exact: true }).click();
            await page
                .getByRole('dialog', { name: 'Your belongings' })
                .getByRole('button', { name: 'Close', exact: true })
                .click();
            continue;
        }
        await attack(page);
    }
    throw new Error('Battle did not finish');
}
async function walk(page: Page, x: number, y: number) {
    // Real keyboard movement; the read-only bridge supplies position only.
    await page.locator('#game-container').focus();
    for (let attempts = 0; attempts < 100; attempts++) {
        const s = await snapshot(page);
        if (s.save.checkpoint.screen === 'Battle') return;
        const dx = x - s.position.x,
            dy = y - s.position.y;
        if (Math.hypot(dx, dy) < 28) return;
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const key = horizontal ? (dx > 0 ? 'd' : 'a') : dy > 0 ? 'ArrowDown' : 'w';
        await page.keyboard.down(key);
        await page.waitForTimeout(Math.min(180, (Math.abs(horizontal ? dx : dy) / 180) * 1000));
        await page.keyboard.up(key);
    }
    throw new Error('Could not reach destination');
}

test('quest journal, details, NPC delivery, tracking and scaled mobile layout', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let s = fixture();
    s = reduce(s, { type: 'BUY', shop: 'Grocery', kind: 'bread' });
    s = reduce(s, { type: 'BUY', shop: 'Grocery', kind: 'bread' });
    await seed(page, s);
    const nav = page.getByRole('navigation', { name: 'Game navigation' });
    await nav.getByRole('button', { name: 'Quests', exact: true }).click();
    const journal = page.getByRole('dialog', { name: 'Quests', exact: true });
    await expect(journal.getByRole('tab')).toHaveCount(6);
    await journal.getByRole('button', { name: 'Aren’s Warning', exact: true }).click();
    const detail = page.getByRole('dialog', { name: 'Aren’s Warning' });
    await expect(detail.getByRole('region', { name: 'Quest rewards' })).toContainText('50g');
    await expect(detail.getByRole('button', { name: 'Complete', exact: true })).toBeDisabled();
    await detail.getByRole('button', { name: 'Track Aren’s Warning' }).click();
    await expect(page.locator('.quest-tracker')).toContainText('Aren’s Warning');
    await page.screenshot({ path: 'test-results/quests-desktop.png' });
    await page.keyboard.press('Escape');
    await expect(detail).toHaveCount(0);
    await expect(
        journal.getByRole('button', { name: 'Aren’s Warning', exact: true }),
    ).toBeFocused();
    await journal.getByRole('button', { name: 'Close' }).click();
    await walk(page, 475, 860);
    await page.keyboard.press('e');
    const service = page.getByRole('dialog', { name: 'Combat instructor' });
    await service
        .getByRole('button', { name: 'Speak with Aren · Aren’s Warning', exact: true })
        .click();
    await service.getByRole('button', { name: 'Complete Aren’s Warning', exact: true }).click();
    await expect
        .poll(
            async () =>
                (await snapshot(page)).save.data.characters[0].quests.records['clear-alby']?.status,
        )
        .toBe('active');
    await service
        .getByRole('button', { name: 'Speak with Aren · A Swordsman’s First Lesson', exact: true })
        .click();
    await service
        .getByRole('button', { name: 'Complete A Swordsman’s First Lesson', exact: true })
        .click();
    await expect
        .poll(async () => (await snapshot(page)).save.data.characters[0].skills.swordMastery?.rank)
        .toBe('F');
    await service.getByRole('button', { name: 'Close' }).click();
    await walk(page, 335, 860);
    await page.keyboard.press('e');
    const smith = page.getByRole('dialog', { name: 'Blacksmith', exact: true });
    await smith.getByRole('tab', { name: 'Quests', exact: true }).click();
    await smith.getByRole('button', { name: 'Accept Supplies for the Forge' }).click();
    await smith.getByRole('button', { name: 'Complete Supplies for the Forge' }).click();
    await expect
        .poll(
            async () =>
                (await snapshot(page)).save.data.characters[0].quests.records['forge-supplies']
                    ?.status,
        )
        .toBe('completed');
    await smith.getByRole('button', { name: 'Close' }).click();
    await page.reload();
    await snapshot(page);
    await nav.getByRole('button', { name: 'Quests', exact: true }).click();
    await journal.getByRole('button', { name: 'Clear Alby Dungeon', exact: true }).click();
    await expect(
        page
            .getByRole('dialog', { name: 'Clear Alby Dungeon' })
            .getByRole('region', { name: 'Quest rewards' }),
    ).toContainText('900 EXP');
    await page.keyboard.press('Escape');
    await journal.getByRole('tab', { name: 'Hunting Quests', exact: true }).click();
    await journal.getByRole('button', { name: 'Track Kill 5 Spiders' }).click();
    await journal.getByRole('button', { name: 'Close' }).click();
    await nav.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('spinbutton', { name: /HUD scale/ }).fill('130');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 320, height: 800 });
    await nav.getByRole('button', { name: 'Quests', exact: true }).click();
    await journal.getByRole('tab', { name: 'Skills', exact: true }).click();
    await journal.getByRole('tab', { name: 'Mainstream Quests' }).click();
    await journal.getByRole('button', { name: 'Clear Alby Dungeon', exact: true }).click();
    const mobile = page.getByRole('dialog', { name: 'Clear Alby Dungeon' });
    const bounds = await mobile.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    expect(
        await mobile
            .locator('[data-wm-content]')
            .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/quests-mobile.png' });
    await page.keyboard.press('Escape');
    await expect(journal).toBeVisible();
    expect(errors).toEqual([]);
});

test('hunting quest banks combat progress and claims once after reload', async ({ page }) => {
    let s = JSON.parse(JSON.stringify(fixture())) as SaveData;
    s.data.characters[0].quests.records['kill-spiders'].counts.spiders = 3;
    let run = reduce(s, { type: 'TRACK_QUEST', quest: 'kill-spiders', tracked: true });
    run = reduce(reduce(run, { type: 'ENTER', seed: 42 }), { type: 'ENCOUNTER', room: 2 });
    await seed(page, run);
    await battle(page);
    await page.getByRole('button', { name: 'Take all', exact: true }).click();
    await expect(page.locator('.quest-tracker')).toContainText('(+2 this run)');
    await page.reload();
    await snapshot(page);
    await page.getByRole('button', { name: 'Return to town', exact: true }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await page.getByRole('button', { name: 'Quests', exact: true }).click();
    const journal = page.getByRole('dialog', { name: 'Quests', exact: true });
    await journal.getByRole('tab', { name: 'Hunting Quests' }).click();
    await journal.getByRole('button', { name: 'Kill 5 Spiders', exact: true }).click();
    const detail = page.getByRole('dialog', { name: 'Kill 5 Spiders' });
    await expect(detail.getByText('Defeat spiders: 5 / 5')).toBeVisible();
    const before = (await snapshot(page)).save.data.characters[0].gold;
    await detail.getByRole('button', { name: 'Complete', exact: true }).click();
    await expect
        .poll(async () => (await snapshot(page)).save.data.characters[0].gold)
        .toBe(before + 100);
    await expect(detail.getByRole('button', { name: 'Complete', exact: true })).toHaveCount(0);
    await page.reload();
    const saved = await snapshot(page);
    expect(saved.save.data.characters[0].gold).toBe(before + 100);
    expect(saved.save.data.characters[0].quests.records['kill-spiders'].status).toBe('completed');
});

test('Aren memory plays with borrowed skills, restores a pending turn, and reports success', async ({
    page,
}) => {
    test.setTimeout(180000);
    let s = fixture();
    s = reduce(
        reduce(s, {
            type: 'QUEST_INTERACT',
            quest: 'arens-warning',
            step: 'hear-warning',
            npc: 'Trainer',
        }),
        { type: 'COMPLETE_QUEST', quest: 'arens-warning' },
    );
    const ready = JSON.parse(JSON.stringify(s)) as SaveData;
    ready.data.characters[0].quests.records['clear-alby'].counts['alby-victory'] = 1;
    s = reduce(ready, { type: 'COMPLETE_QUEST', quest: 'clear-alby' });
    const heroBefore = s.data.characters[0];
    await seed(page, s);
    await walk(page, 475, 860);
    await page.keyboard.press('e');
    await page.getByRole('button', { name: 'Enter Aren’s memory' }).click();
    await expect(page.getByRole('heading', { name: 'Aren’s memory', exact: true })).toBeVisible();
    await walk(page, 544, 256);
    await page.keyboard.press('e');
    await readyTurn(page);
    const pending = (await snapshot(page)).save.data.characters[0].rp.actor.battle;
    await page.reload();
    const restored = await snapshot(page);
    expect(restored.save.data.characters[0].rp.actor.battle).toEqual(pending);
    await attack(page);
    await battle(page, true);
    await walk(page, 896, 256);
    await page.keyboard.press('e');
    await battle(page, true);
    await walk(page, 1248, 256);
    await page.keyboard.press('e');
    await expect(page.getByRole('heading', { name: 'Town1', exact: true })).toBeVisible();
    const after = (await snapshot(page)).save.data.characters[0];
    expect(after.skills).toEqual(heroBefore.skills);
    expect(after.inventory).toEqual(heroBefore.inventory);
    expect(after.gold).toBe(heroBefore.gold);
    expect(after.quests.records['kill-spiders']).toEqual(heroBefore.quests.records['kill-spiders']);
    await walk(page, 475, 860);
    await page.keyboard.press('e');
    await page
        .getByRole('button', { name: 'Report to Aren · Aren’s First Expedition', exact: true })
        .click();
    await page
        .getByRole('button', { name: 'Complete Aren’s First Expedition', exact: true })
        .click();
    await expect
        .poll(async () => (await snapshot(page)).save.data.characters[0].quests.chapters)
        .toEqual(['beneath-the-ruins']);
});