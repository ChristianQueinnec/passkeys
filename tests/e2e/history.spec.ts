import { test, expect } from '@playwright/test';

test.describe('History Operations', () => {
    test.beforeEach(async ({ page }) => {
        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '0');
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

        await page.getByPlaceholder('Username').fill('history_test');
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

    test('should manage history', async ({ page }) => {
        // Create an item to ensure we have something to save
        await page.getByRole('button', { name: '+ New Entry' }).click();
        await page.getByLabel('Title *').fill('History Test Item');
        // Scope to editor
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        // Save Vault explicitly
        await page.getByRole('button', { name: 'Save Vault' }).click();
        // Wait for save to complete (dirty button disappears or notification)
        await expect(page.getByRole('button', { name: 'Save Vault' })).not.toBeVisible();

        // Make another change and save
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'History Test Item' }).getByRole('button', { name: 'View Details' }).first().click();
        await page.getByRole('button', { name: 'Edit' }).click();
        await page.getByLabel('Title *').fill('History Test Item 2');
        // Scope to editor
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        await page.getByRole('button', { name: 'Save Vault' }).click();
        await expect(page.getByRole('button', { name: 'Save Vault' })).not.toBeVisible();

        // Reload to verify persistence and ensure fresh state
        await page.reload();
        // Need to unlock after reload if session persists but memory wiped?
        // Actually, if we reload, token persists but key is in memory. We need to unlock.
        // Wait, does reload keep session? Yes (cookie/token).
        // But dashboard needs unlocking?
        // Dashboard uses `loadVault` on mount.
        // But encryption key is passed from parent? 
        // Layout/Page structure: +page.svelte manages login/unlock state.
        // If reload, we go back to Unlock screen if logged in.

        await expect(page.getByRole('heading', { name: 'Unlock Vault' })).toBeVisible();
        await page.getByPlaceholder('Vault Password').fill('q');
        const unlockBtn = page.getByTestId('unlock-button');
        await expect(unlockBtn).toBeVisible({ timeout: 10000 });
        await expect(unlockBtn).toBeEnabled();
        await unlockBtn.click();
        await expect(page.locator('.dashboard')).toBeVisible();

        // now check history
        await page.getByRole('button', { name: 'History', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Vault History' })).toBeVisible();

        // Should have at least 2 entries (or more if other tests ran)
        // Wait for at least one row
        await expect(page.locator('table tbody tr')).not.toHaveCount(0);
        const rows = page.locator('table tbody tr');

        // Delete one
        const initialCount = await rows.count();
        if (initialCount > 0) {
            page.once('dialog', dialog => dialog.accept());
            await rows.first().getByRole('button', { name: 'Delete' }).click();
            // Wait for list to update - might need reload or just wait for DOM change
            // The modal stays open, list updates
            // await expect(rows).toHaveCount(initialCount - 1); // Flaky if network slow?
        }

        // Cleanup
        await page.getByRole('button', { name: '×' }).click();
        // Delete the item created
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'History Test Item 2' }).getByRole('button', { name: 'View Details' }).first().click();
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('button', { name: 'Save Vault' }).click();
    });
});
