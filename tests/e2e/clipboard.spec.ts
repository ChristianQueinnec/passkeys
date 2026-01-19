import { test, expect } from '@playwright/test';

test.describe('Clipboard Reset', () => {
    test.setTimeout(60000); // Increase timeout for waiting

    test.beforeEach(async ({ page, context }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.getByPlaceholder('Username').fill('q');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('password');
        await page.getByTestId('unlock-button').click();

        // Wait for Vault to be unlocked
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Toggling to List View for clipboard tests if we are in Folder View
        if (await page.locator('.folder-dashboard').isVisible()) {
            await page.getByTestId('toggle-view-btn').click();
        }
        await expect(page.locator('.dashboard')).toBeVisible();

        // Create a test item if none exist
        if (await page.locator('[data-testid="vault-item"]').count() === 0) {
            await page.getByTestId('new-entry-btn').click();
            await page.getByTestId('edit-title').fill('Clipboard Test');
            await page.getByTestId('edit-username').fill('clipuser');
            await page.getByTestId('edit-password').fill('clippass');
            await page.getByTestId('edit-save').click();
            await expect(page.getByText('Clipboard Test')).toBeVisible();
        }
    });

    test('should clear clipboard after 10 seconds', async ({ page }) => {
        // Find an item and copy its username
        const firstItem = page.locator('[data-testid="vault-item"]').first();
        await expect(firstItem).toBeVisible();

        // Click copy username button
        await firstItem.getByTestId('copy-username-btn').click();

        // Verify it was copied
        let clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).not.toBe('');

        // Wait a bit (1000ms reset + 500ms buffer)
        console.log('Waiting for clipboard reset...');
        await page.waitForTimeout(1500);

        // Verify it's cleared
        clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).toBe('');
    });

    test('should reset timer when copying again', async ({ page }) => {
        const firstItem = page.locator('[data-testid="vault-item"]').first();

        // Copy first time
        await firstItem.getByTestId('copy-username-btn').click();
        let clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).not.toBe('');

        // Wait 500ms (timer at 1s, not cleared yet)
        await page.waitForTimeout(500);

        // Copy again (resets timer to another 1s)
        await firstItem.getByTestId('copy-password-btn').click();
        clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).not.toBe('');

        // Wait 700ms (total 1.2s from first copy, but only 700ms from second)
        await page.waitForTimeout(700);

        // Verify it's NOT cleared yet
        clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).not.toBe('');

        // Wait another 500ms (total 1.2s from second copy)
        await page.waitForTimeout(500);

        // Verify it's cleared
        clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).toBe('');
    });
});
