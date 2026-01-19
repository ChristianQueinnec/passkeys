import { test, expect } from '@playwright/test';

test.describe('Folder Count', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
        page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    });

    test('should display recursive entry counts in folders', async ({ page }) => {
        // 1. Login
        await page.fill('input[placeholder="Username"]', 'auth_test');
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        // 2. Unlock
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="unlock-button"]');

        // Wait for dashboard
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible({ timeout: 10000 });

        // 3. Create structure
        // Root
        // |- Entry 1
        // |- Folder A
        //    |- Entry 2
        //    |- Folder B
        //       |- Entry 3
        //       |- Entry 4

        // Add Entry 1 to Root (default)
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Entry 1');
        await page.getByTestId('edit-save').click();

        // Add Entry 2 to Folder A
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Entry 2');
        await page.getByTestId('edit-group').fill('Folder A');
        await page.getByTestId('edit-save').click();

        // Add Entry 3 to Folder A/Folder B
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Entry 3');
        await page.getByTestId('edit-group').fill('Folder A/Folder B');
        await page.getByTestId('edit-save').click();

        // Add Entry 4 to Folder A/Folder B
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Entry 4');
        await page.getByTestId('edit-group').fill('Folder A/Folder B');
        await page.getByTestId('edit-save').click();

        // Default view is Folder View. Ensure we are in it.
        await expect(page.locator('.folder-pane')).toBeVisible();

        // Verify counts
        // Folder B should have 2
        // Folder A should have 1 (direct) + 2 (from B) = 3
        // Root should have 8 (4 initial + 4 new)(from A) = 4

        // Expand root if needed (it is open by default)
        // Expand Folder A
        const folderA = page.locator('.folder-item', { hasText: 'Folder A' });
        await folderA.getByRole('button').click(); // Toggle open if not open, or select. 
        // Note: Logic in component toggles on click.

        // Wait for tree to update
        await page.waitForTimeout(500);

        // Check text contents
        await expect(folderA.locator('.entry-count')).toHaveText('(3)');

        const folderB = page.locator('.folder-item', { hasText: 'Folder B' });
        await expect(folderB.locator('.entry-count')).toHaveText('(2)');

        // Check Root (Total)
        // Root usually has name from i18n 'vault.root' -> "My Vault" or similar.
        // Or "Root" depending on translation.
        const rootFolder = page.locator('.folder-item').first();
        // Assuming root is first.
        // We can check the count directly.
        await expect(rootFolder.locator('.entry-count')).toHaveText('(4)'); // 4 new items
    });
});
