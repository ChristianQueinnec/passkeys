import { test, expect } from '@playwright/test';

test.describe('History Operations', () => {
    test.beforeEach(async ({ page }) => {
        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '0');
        await expect(page.getByTestId('login-button')).toBeVisible();

        await page.getByPlaceholder('Username').fill('history_test');
        await page.getByPlaceholder('Password').fill('q');
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('q');
        await page.getByTestId('unlock-button').click();
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard')).toBeVisible();
    });

    test('should manage history', async ({ page }) => {
        // Create an item to ensure we have something to save
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('History Test Item');
        // Scope to editor
        await page.getByTestId('edit-save').click();

        // Save Vault explicitly
        await page.getByTestId('save-vault-btn').click();
        // Wait for save to complete (dirty button disappears or notification)
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Make another change and save
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'History Test Item' }).getByTestId('view-details-btn').first().click();
        await page.getByTestId('details-edit').click();
        await page.getByTestId('edit-title').fill('History Test Item 2');
        // Scope to editor
        await page.getByTestId('edit-save').click();

        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

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

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('q');
        const unlockBtn = page.getByTestId('unlock-button');
        await expect(unlockBtn).toBeVisible({ timeout: 10000 });
        await expect(unlockBtn).toBeEnabled();
        await unlockBtn.click();
        await expect(page.locator('.dashboard')).toBeVisible();

        // now check history
        await page.getByTestId('history-btn').click();
        await expect(page.getByTestId('modal-title')).toHaveText(/Vault History|Historique du coffre/);

        // Should have at least 2 entries (or more if other tests ran)
        // Wait for at least one row
        await expect(page.locator('table tbody tr')).not.toHaveCount(0);
        const rows = page.locator('table tbody tr');

        // Delete one
        const initialCount = await rows.count();
        if (initialCount > 0) {
            page.once('dialog', dialog => dialog.accept());
            await rows.first().getByTestId('history-delete-btn').click();
            // Wait for list to update - might need reload or just wait for DOM change
            // The modal stays open, list updates
            await expect(rows).toHaveCount(initialCount - 1);
        }

        // Cleanup
        await page.getByRole('button', { name: '×' }).click();
        // Delete the item created
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'History Test Item 2' }).getByTestId('view-details-btn').first().click();
        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
        await page.getByTestId('save-vault-btn').click();
    });
});
