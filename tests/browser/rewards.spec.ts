import { expect, test } from '@playwright/test';
import { produce } from 'immer';
import { blankSave, reduceCommand } from '../../src/domain/commands';

test.use({ actionTimeout: 10000 });

for (const mode of ['Take selected', 'Take all']) {
    test(`${mode} collects rewards and continues without another button`, async ({ page }) => {
        let save = reduceCommand(
            blankSave(),
            { type: 'NAV', screen: 'NewCharacter' },
            'reward-nav',
        );
        save = reduceCommand(
            save,
            {
                type: 'CREATE',
                id: 'reward-hero',
                now: 0,
                input: { name: 'Collector', race: 'Human', age: 17, talent: 'Close Combat' },
            },
            'reward-create',
        );
        save = reduceCommand(save, { type: 'ENTER', seed: 42 }, 'reward-enter');
        save = produce(save, (draft) => {
            draft.checkpoint.phase = 'reward';
            draft.data.characters[0].reward = {
                id: 'reward-cards',
                gold: 35,
                boss: false,
                claimed: [],
                items: [
                    { id: 'loot-silk', kind: 'silk', count: 2 },
                    { id: 'loot-hp', kind: 'hp', count: 1 },
                ],
            };
        });
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
        const modal = page.getByRole('dialog', { name: 'Collect rewards' });
        await expect(modal).toBeVisible();
        const cards = modal.getByRole('checkbox');
        await expect(cards).toHaveCount(3);
        await expect(modal.locator('[data-slot="checkbox-button-group-indicator"]')).toHaveCount(0);
        expect(
            await modal
                .locator('img')
                .evaluateAll((images) =>
                    images.every((image) => image.complete && image.naturalWidth > 0),
                ),
        ).toBe(true);
        await expect(modal.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0);
        const potion = modal.getByRole('checkbox', { name: 'Health potion × 1' });
        await potion.focus();
        await page.keyboard.press('Space');
        await expect(potion).not.toBeChecked();
        await page.setViewportSize({ width: 320, height: 800 });
        await page.screenshot({
            path: `test-results/rewards-mobile-${test.info().project.name}.png`,
        });
        await modal.getByRole('button', { name: mode, exact: true }).click();
        await expect(modal).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Alby', exact: true })).toBeVisible();
        await page.reload();
        await page.waitForFunction(() => !!(window as any).__GAME__);
        const result = await page.evaluate(() => (window as any).__GAME__.save.data.characters[0]);
        expect(result.reward).toBeNull();
        expect(result.gold).toBe(save.data.characters[0].gold + 35);
        expect(result.inventory.find((item: any) => item.kind === 'silk').count).toBe(2);
        const originalPotions = save.data.characters[0].inventory.find(
            (item) => item.kind === 'hp',
        )!.count;
        expect(result.inventory.find((item: any) => item.kind === 'hp').count).toBe(
            originalPotions + (mode === 'Take all' ? 1 : 0),
        );
    });
}
