import { test, expect } from '@playwright/test';

test.describe('Drag and Drop', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page, context }) => {
        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.getByPlaceholder('Username').fill('q');
        await page.getByPlaceholder('Password').fill('q');
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('q');
        await page.getByTestId('unlock-button').click();

        // Should be in Dashboard (Phase 2)
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');

        // Verify we are in Folder View (now default)
        await expect(page.getByText(/Folders|Dossiers/)).toBeVisible();
    });

    test('should move item to folder via drag and drop', async ({ page }) => {
        // Create Folder A item
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Item A');
        // Folder/Group input
        await page.getByTestId('edit-group').fill('Folder A');
        await page.getByTestId('edit-save').click();

        // Create Folder B item (to create the folder)
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Item B');
        await page.getByTestId('edit-group').fill('Folder B');
        await page.getByTestId('edit-save').click();

        // Verify folders exist in tree
        await expect(page.getByRole('button', { name: 'Folder A' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Folder B' })).toBeVisible();

        // Open Folder A to see Item A
        await page.getByRole('button', { name: 'Folder A' }).click();
        const itemA = page.locator('[data-testid="vault-item"]', { hasText: 'Item A' });
        await expect(itemA).toBeVisible();

        // Drag Item A to Folder B using manual event dispatching
        const folderB = page.getByRole('button', { name: 'Folder B' });
        const itemId = await itemA.getAttribute('data-id');

        // Simulate drop event on Folder B
        await folderB.dispatchEvent('drop', {
            dataTransfer: await page.evaluateHandle((id) => {
                const dt = new DataTransfer();
                dt.setData('text/plain', id || '');
                return dt;
            }, itemId)
        });

        // Verify Item A is no longer in Folder A
        await expect(itemA).not.toBeVisible();

        // Click Folder B
        await folderB.click();

        // Verify Item A is now in Folder B
        await expect(page.locator('[data-testid="vault-item"]', { hasText: 'Item A' })).toBeVisible();

        // Also verify Item B is there
        await expect(page.locator('[data-testid="vault-item"]', { hasText: 'Item B' })).toBeVisible();
    });

    test('should update group when dropping on root', async ({ page }) => {
        // Create Item in Folder C
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Item C');
        await page.getByTestId('edit-group').fill('Folder C');
        await page.getByTestId('edit-save').click();

        // Create another Item in Folder C to keep folder alive
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Item Keep');
        await page.getByTestId('edit-group').fill('Folder C');
        await page.getByTestId('edit-save').click();

        await page.getByRole('button', { name: 'Folder C' }).click();
        const itemC = page.locator('[data-testid="vault-item"]', { hasText: 'Item C' });
        await expect(itemC).toBeVisible();

        // Drag to Root
        const rootFolder = page.getByRole('button', { name: /Main Vault|Coffre Principal/ });
        const itemId = await itemC.getAttribute('data-id');

        // Simulate drop event on Root
        await rootFolder.dispatchEvent('drop', {
            dataTransfer: await page.evaluateHandle((id) => {
                const dt = new DataTransfer();
                dt.setData('text/plain', id || '');
                return dt;
            }, itemId)
        });

        // Verify Item C is gone from Folder C
        await expect(itemC).not.toBeVisible();

        // Click Root
        await rootFolder.click();

        // Verify Item C is in Root
        await expect(page.locator('[data-testid="vault-item"]', { hasText: 'Item C' })).toBeVisible();
    });
});
