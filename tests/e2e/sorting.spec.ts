import { test, expect } from '@playwright/test';

test.describe('Sorting Operations', () => {
    test.beforeEach(async ({ page }) => {
        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '0');
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

        await page.getByPlaceholder('Username').fill('q');
        await page.getByPlaceholder('Password').fill('q');
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await expect(page.getByRole('heading', { name: 'Unlock Vault' })).toBeVisible();
        await page.getByPlaceholder('Vault Password').fill('q');
        await page.getByTestId('unlock-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard')).toBeVisible();
    });

    test('should list entries in alphabetical order of titles', async ({ page }) => {
        // Clear any existing entries if possible (reset-db should have handled this)

        const testTitles = ['Zebra', 'Apple', 'Banana'];

        for (const title of testTitles) {
            await page.getByRole('button', { name: '+ New Entry' }).click();
            await page.getByLabel('Title *').fill(title);
            await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();
        }

        // Wait for list to update and be sorted
        await page.waitForTimeout(500);

        const items = page.locator('[data-testid="vault-item"] .item-title');
        const titles = await items.allTextContents();

        // Sort our expected list alphabetically (French locale as per implementation)
        const expectedOrder = [...testTitles].sort((a, b) =>
            new Intl.Collator("fr", { sensitivity: "base" }).compare(a, b)
        );

        // We check if the expected titles are present and in the right order among possibly other titles
        // Since reset-db might leave some users/entries, we filter our titles
        const ourTitles = titles.filter(t => testTitles.includes(t));

        expect(ourTitles).toEqual(expectedOrder);
    });
});
