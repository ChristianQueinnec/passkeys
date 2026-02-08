import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Vault Deletion', () => {
    const testUser = 'deletion_test';
    const testPassword = 'password';
    const vaultKey = 'password';

    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });

        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '0');
        await expect(page.getByTestId('login-button')).toBeVisible();

        await page.getByPlaceholder('Username').fill(testUser);
        await page.getByPlaceholder('Password').fill(testPassword);
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await expect(page.getByTestId('unlock-button')).toBeVisible();

        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill(vaultKey);
        await page.getByTestId('unlock-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
    });

    test('should delete a single vault from history', async ({ page }) => {
        // Create and save a vault to ensure we have history
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Test Entry for Deletion');
        await page.getByTestId('edit-save').click();
        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Open history modal
        await page.getByTestId('history-btn').click();
        await expect(page.getByTestId('modal-title')).toHaveText(/Vault History|Historique du coffre/);

        // Wait for history to load
        await expect(page.locator('table tbody tr')).not.toHaveCount(0);
        const rows = page.locator('table tbody tr');
        const initialCount = await rows.count();

        // Delete the first vault
        page.once('dialog', dialog => dialog.accept());
        await rows.first().getByTestId('history-delete-btn').click();

        // Verify the vault was removed from the list
        await expect(rows).toHaveCount(initialCount - 1);

        // Close modal
        await page.getByRole('button', { name: '×' }).click();

        // Cleanup: delete the test entry
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Test Entry for Deletion' }).getByTestId('view-details-btn').first().click();
        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
        await page.getByTestId('save-vault-btn').click();
    });

    test('should cancel vault deletion when dialog is dismissed', async ({ page }) => {
        // Create and save a vault
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Test Entry for Cancel');
        await page.getByTestId('edit-save').click();
        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Open history modal
        await page.getByTestId('history-btn').click();
        await expect(page.getByTestId('modal-title')).toHaveText(/Vault History|Historique du coffre/);

        await expect(page.locator('table tbody tr')).not.toHaveCount(0);
        const rows = page.locator('table tbody tr');
        const initialCount = await rows.count();

        // Cancel the deletion
        page.once('dialog', dialog => dialog.dismiss());
        await rows.first().getByTestId('history-delete-btn').click();

        // Verify the vault count hasn't changed
        await page.waitForTimeout(500);
        await expect(rows).toHaveCount(initialCount);

        // Close modal
        await page.getByRole('button', { name: '×' }).click();

        // Cleanup
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Test Entry for Cancel' }).getByTestId('view-details-btn').first().click();
        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
        await page.getByTestId('save-vault-btn').click();
    });

    test('should delete multiple vaults in sequence', async ({ page }) => {
        // Create multiple vault versions
        for (let i = 1; i <= 3; i++) {
            await page.getByTestId('new-entry-btn').click();
            await page.getByTestId('edit-title').fill(`Test Entry ${i}`);
            await page.getByTestId('edit-save').click();
            await page.getByTestId('save-vault-btn').click();
            await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();
            await page.waitForTimeout(100); // Ensure different timestamps
        }

        // Open history modal
        await page.getByTestId('history-btn').click();
        await expect(page.getByTestId('modal-title')).toHaveText(/Vault History|Historique du coffre/);

        await expect(page.locator('table tbody tr')).not.toHaveCount(0);
        const rows = page.locator('table tbody tr');
        const initialCount = await rows.count();

        // Delete 2 vaults
        for (let i = 0; i < 2; i++) {
            page.once('dialog', dialog => dialog.accept());
            await rows.first().getByTestId('history-delete-btn').click();
            await page.waitForTimeout(300);
        }

        // Verify 2 vaults were removed
        await expect(rows).toHaveCount(initialCount - 2);

        // Close modal
        await page.getByRole('button', { name: '×' }).click();

        // Cleanup: delete all test entries
        for (let i = 1; i <= 3; i++) {
            const item = page.locator('[data-testid="vault-item"]').filter({ hasText: `Test Entry ${i}` });
            if (await item.count() > 0) {
                await item.getByTestId('view-details-btn').first().click();
                page.once('dialog', dialog => dialog.accept());
                await page.getByTestId('details-delete').click();
                await page.waitForTimeout(100);
            }
        }
        if (await page.getByTestId('save-vault-btn').isVisible()) {
            await page.getByTestId('save-vault-btn').click();
        }
    });

    test('should show empty state when all vaults are deleted', async ({ page }) => {
        // Create a single vault
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Last Entry');
        await page.getByTestId('edit-save').click();
        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Open history modal
        await page.getByTestId('history-btn').click();
        await expect(page.getByTestId('modal-title')).toHaveText(/Vault History|Historique du coffre/);

        const rows = page.locator('table tbody tr');

        // Delete all vaults except the current one (if there are multiple)
        let rowCount = await rows.count();
        while (rowCount > 1) {
            page.once('dialog', dialog => dialog.accept());
            await rows.nth(1).getByTestId('history-delete-btn').click(); // Delete second row (not current)
            await page.waitForTimeout(300);
            rowCount = await rows.count();
        }

        // Should still have at least the current vault
        await expect(rows).toHaveCount(1);

        // Close modal
        await page.getByRole('button', { name: '×' }).click();

        // Cleanup
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Last Entry' }).getByTestId('view-details-btn').first().click();
        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
        await page.getByTestId('save-vault-btn').click();
    });

    test('should persist deletion after page reload', async ({ page }) => {
        // Create and save a vault
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Persist Test Entry');
        await page.getByTestId('edit-save').click();
        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Create another version
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Persist Test Entry' }).getByTestId('view-details-btn').first().click();
        await page.getByTestId('details-edit').click();
        await page.getByTestId('edit-title').fill('Persist Test Entry Modified');
        await page.getByTestId('edit-save').click();
        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Open history and delete the older version
        await page.getByTestId('history-btn').click();
        await expect(page.locator('table tbody tr')).not.toHaveCount(0);
        const rows = page.locator('table tbody tr');
        const countBeforeDeletion = await rows.count();

        page.once('dialog', dialog => dialog.accept());
        await rows.nth(1).getByTestId('history-delete-btn').click(); // Delete older version
        await page.waitForTimeout(300);

        const countAfterDeletion = await rows.count();
        expect(countAfterDeletion).toBe(countBeforeDeletion - 1);

        await page.getByRole('button', { name: '×' }).click();

        // Reload the page
        await page.reload();
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill(vaultKey);
        await page.getByTestId('unlock-button').click();
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Verify deletion persisted
        await page.getByTestId('history-btn').click();
        await expect(page.locator('table tbody tr')).toHaveCount(countAfterDeletion);
        await page.getByRole('button', { name: '×' }).click();

        // Cleanup
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Persist Test Entry Modified' }).getByTestId('view-details-btn').first().click();
        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
        await page.getByTestId('save-vault-btn').click();
    });

    test('should handle deletion of vault with timestamp in filename', async ({ page }) => {
        // Create a vault (which will have a timestamp filename)
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Timestamp Test');
        await page.getByTestId('edit-save').click();
        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Open history
        await page.getByTestId('history-btn').click();
        await expect(page.locator('table tbody tr')).not.toHaveCount(0);

        const rows = page.locator('table tbody tr');
        const initialCount = await rows.count();

        // Verify the filename contains a timestamp pattern
        await expect(rows.first()).toHaveText(/\d{1,2}\/\d{1,2}\/\d{4}/); // ISO date pattern

        // Delete it
        page.once('dialog', dialog => dialog.accept());
        await rows.first().getByTestId('history-delete-btn').click();
        await expect(rows).toHaveCount(initialCount - 1);

        await page.getByRole('button', { name: '×' }).click();

        // Cleanup
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Timestamp Test' }).getByTestId('view-details-btn').first().click();
        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
        await page.getByTestId('save-vault-btn').click();
    });
});
