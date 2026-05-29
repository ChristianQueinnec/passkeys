import { test, expect } from '@playwright/test';

test.describe('Security Inactivity Timeout', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
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

        // Ensure we have items
        if (await page.locator('[data-testid="vault-item"]').count() === 0) {
            await page.getByTestId('new-entry-btn').click();
            await page.getByTestId('edit-title').fill('Security Test');
            await page.getByTestId('edit-username').fill('sectest');
            await page.getByTestId('edit-password').fill('secpass');
            await page.getByTestId('edit-save').click();

            // Must save vault to populate encryptedVaultData
            await page.getByTestId('save-vault-btn').click();
            await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();
        } else {
            // If items exist but isDirty (unlikely from fresh reload, but possible), save just in case
            if (await page.getByTestId('save-vault-btn').isVisible()) {
                await page.getByTestId('save-vault-btn').click();
                await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();
            }
        }
    });

    test('should support quick unlock after a security lock', async ({ page }) => {
        // 1. Verify items are visible
        await expect(page.locator('[data-testid="vault-item"]').first()).toBeVisible();

        // 2. Capture the quick unlock challenge and force a lock
        const challenge = await page.evaluate(() => (window as any).__PASSKEYS_TEST__.getEasyUnlockChallenge());
        expect(challenge).toBeTruthy();
        await page.evaluate(() => (window as any).__PASSKEYS_TEST__.lockVault());

        // 3. Verify vault is locked (Phase 1)
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1');
        await expect(page.getByTestId('easy-unlock-button')).toBeVisible();

        // 4. Unlock with the quick challenge
        await page.getByTestId('easy-unlock-input').fill(challenge.answer);
        await page.getByTestId('easy-unlock-button').click();

        // 5. Verify vault restored
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('[data-testid="vault-item"]').first()).toBeVisible();
    });
});
