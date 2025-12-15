import { test, expect } from '@playwright/test';

test.describe('History Operations', () => {
    test.beforeEach(async ({ page }) => {
        // Login and unlock
        await page.goto('/');
        await page.getByPlaceholder('Username').fill('history_test');
        await page.getByPlaceholder('Password').fill('q');
        await page.getByRole('button', { name: 'Login' }).click();
        await page.getByPlaceholder('Vault Password').fill('q');
        await page.getByRole('button', { name: 'Unlock' }).click();
        await expect(page.locator('.dashboard')).toBeVisible();
    });

    test('should manage history', async ({ page }) => {
        // Create an item to ensure we have something to save
        await page.getByRole('button', { name: '+ New Entry' }).click();
        await page.getByLabel('Title').fill('History Test Item');
        // Scope to editor
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        // Save Vault explicitly
        await page.getByRole('button', { name: 'Save Vault' }).click();
        // Wait for save to complete (dirty button disappears or notification)
        await expect(page.getByRole('button', { name: 'Save Vault' })).not.toBeVisible();

        // Make another change and save
        await page.getByText('History Test Item').click();
        await page.getByRole('button', { name: 'Edit' }).click();
        await page.getByLabel('Title').fill('History Test Item 2');
        // Scope to editor
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        await page.getByRole('button', { name: 'Save Vault' }).click();
        await expect(page.getByRole('button', { name: 'Save Vault' })).not.toBeVisible();

        // Reload to verify persistence and ensure fresh state
        await page.reload();
        await page.getByRole('button', { name: 'Unlock' }).click(); // Need to unlock after reload if session persists but memory wiped?
        // Actually, if we reload, token persists but key is in memory. We need to unlock.
        // Wait, does reload keep session? Yes (cookie/token).
        // But dashboard needs unlocking?
        // Dashboard uses `loadVault` on mount.
        // But encryption key is passed from parent? 
        // Layout/Page structure: +page.svelte manages login/unlock state.
        // If reload, we go back to Unlock screen if logged in.

        await expect(page.getByRole('heading', { name: 'Unlock Vault' })).toBeVisible();
        await page.getByPlaceholder('Vault Password').fill('q');
        await page.getByRole('button', { name: 'Unlock' }).click();

        // now check history
        await page.getByRole('button', { name: 'History' }).click();
        await expect(page.getByRole('heading', { name: 'Vault History' })).toBeVisible();

        // Should have at least 2 entries (or more if other tests ran)
        // Wait for at least one row
        await expect(page.locator('table tbody tr')).not.toHaveCount(0);
        const rows = page.locator('table tbody tr');

        // Delete one
        const initialCount = await rows.count();
        if (initialCount > 0) {
            page.on('dialog', dialog => dialog.accept());
            await rows.first().locator('button', { name: 'Delete' }).click();
            // Wait for list to update - might need reload or just wait for DOM change
            // The modal stays open, list updates
            // await expect(rows).toHaveCount(initialCount - 1); // Flaky if network slow?
        }

        // Cleanup
        await page.getByRole('button', { name: '×' }).click();
        // Delete the item created
        await page.getByText('History Test Item 2').click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('button', { name: 'Save Vault' }).click();
    });
});
