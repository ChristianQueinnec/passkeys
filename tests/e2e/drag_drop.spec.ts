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
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder('Vault Password').fill('q');
        await page.getByTestId('unlock-button').click();

        // Wait for Dashboard
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');

        // Switch to Folder View
        await page.getByRole('button', { name: 'Folder View' }).click();
        await expect(page.getByText('Folders')).toBeVisible();
    });

    test('should move item to folder via drag and drop', async ({ page }) => {
        // Create Folder A item
        await page.getByRole('button', { name: '+ New Entry' }).click();
        await page.getByLabel('Title *').fill('Item A');
        // Folder/Group input
        await page.getByLabel('Group/Folder').fill('Folder A');
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        // Create Folder B item (to create the folder)
        await page.getByRole('button', { name: '+ New Entry' }).click();
        await page.getByLabel('Title *').fill('Item B');
        await page.getByLabel('Group/Folder').fill('Folder B');
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

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
        await page.getByRole('button', { name: '+ New Entry' }).click();
        await page.getByLabel('Title *').fill('Item C');
        await page.getByLabel('Group/Folder').fill('Folder C');
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        await page.getByRole('button', { name: 'Folder C' }).click();
        const itemC = page.locator('[data-testid="vault-item"]', { hasText: 'Item C' });
        await expect(itemC).toBeVisible();

        // Drag to Root
        const rootFolder = page.getByRole('button', { name: 'Root' });
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
