import { test, expect } from '@playwright/test';

test.describe('Language-Aware Sorting', () => {
    test.setTimeout(120000);

    const username = 'admin';
    const password = 'password';
    const vaultKey = 'vault-key-456';

    test.beforeEach(async ({ page, request }) => {
        console.log('Starting beforeEach...');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });

        // Clean up server-side vault for this user
        console.log('Cleaning up server-side vault...');
        await request.get(`/api/test/cleanup-vault?username=${username}`);

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        console.log('Logging in...');
        // Register/Login
        await page.getByTestId('username-input').fill(username);
        await page.getByTestId('password-input').fill(password);
        await page.getByTestId('login-button').click();

        console.log('Waiting for unlock phase...');
        // Unlock/Create Vault
        await expect(page.getByTestId('unlock-button')).toBeVisible({ timeout: 20000 });
        await page.getByTestId('password-input').fill(vaultKey);
        await page.getByTestId('unlock-button').click();

        console.log('Waiting for dashboard...');
        await expect(page.locator('.folder-dashboard')).toBeVisible({ timeout: 20000 });

        // Add 3 entries in non-alphabetical order
        const entries = [
            { title: 'B' },
            { title: 'A' },
            { title: 'C' }
        ];

        for (const entry of entries) {
            console.log(`Adding entry: ${entry.title}`);
            await page.getByTestId('new-entry-btn').click();
            await page.getByTestId('edit-title').fill(entry.title);
            await page.getByTestId('edit-save').click();
            await expect(page.getByTestId('vault-modals')).not.toBeVisible();
        }
        console.log('beforeEach finished.');
    });

    test('should sort entries alphabetically regardless of addition order', async ({ page }) => {
        await expect(page.locator('.item-title')).toHaveText(['A', 'B', 'C']);
    });

    test('should re-sort when language is changed', async ({ page }) => {
        console.log('Adding entry with accent...');
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('É');
        await page.getByTestId('edit-save').click();
        await expect(page.getByTestId('vault-modals')).not.toBeVisible();

        console.log('Checking English sort...');
        const currentTitlesEN = await page.locator('.item-title').allTextContents();
        console.log('EN titles:', currentTitlesEN);
        const expectedEN = [...currentTitlesEN].sort((a, b) => new Intl.Collator('en').compare(a, b));
        await expect(page.locator('.item-title')).toHaveText(expectedEN);

        console.log('Switching to French...');
        await page.getByTestId('lang-switcher-btn').click();
        await page.getByRole('option', { name: 'FR' }).click();

        console.log('Checking French sort...');
        await expect(async () => {
            const currentTitlesFR = await page.locator('.item-title').allTextContents();
            console.log('FR titles:', currentTitlesFR);
            const expectedFR = [...currentTitlesFR].sort((a, b) => new Intl.Collator('fr').compare(a, b));
            expect(currentTitlesFR).toEqual(expectedFR);
        }).toPass({ timeout: 10000 });

        console.log('Switching back to English...');
        await page.getByTestId('lang-switcher-btn').click();
        await page.getByRole('option', { name: 'EN' }).click();

        console.log('Checking English sort again...');
        await expect(page.locator('.item-title')).toHaveText(expectedEN);
    });
});
