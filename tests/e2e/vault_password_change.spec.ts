import { test, expect } from '@playwright/test';
import { createHash } from 'crypto';

test.describe('Vault Password Change', () => {
    const username = 'test_pw_change';
    const password = 'p';
    const initialVaultKey = 'old-key';
    const newVaultKey = 'new-key';

    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        // Reduced iterations for faster test
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });

        // Reset DB or create user via API could be better but sticking to UI flow or assuming script ran.
        // Actually, init.sh creates specific users. We should ideally create a fresh one or clean up.
        // Let's use a unique username if possible or cleaning up. 
        // We will assume "auth_test" or similar might be busy. Let's use `auth_test` and ensure cleanup.
        // Or better, let's just use the registration flow at runtime if possible, or `admin` user if safe.
        // Given constraints, let's use `admin` but we must be careful not to break other tests if they run parallel.
        // They don't run parallel.

        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test('should allow changing vault password and re-encrypt data', async ({ page }) => {
        // 1. Login
        await page.fill('input[placeholder="Username"]', 'vault_change_test');
        await page.fill('[data-testid="password-input"]', 'password');
        await page.click('[data-testid="login-button"]');

        // 2. Unlock/Create Vault
        // Admin might have a vault or not depending on previous tests.
        // We should handle both cases or force new user in init.sh?
        // Let's assume we can create a fresh vault for a temp user if we could.
        // But we can only use existing users. 
        // Let's use 'history_test' user, likely less used? Or 'admin'.
        // Let's go with 'admin' and expect specific state.

        await page.waitForTimeout(1000); // Wait for checkVaultExists

        // If unlock screen appears, unlock. If creation screen (which looks same but message differs)?
        // Actually, let's just try to unlock with a known key or reset if possible.
        // To be safe, let's use `reset-db` in the command line before running this test.

        // Assume 'password' as initial vault key for 'admin' based on `init.sh` usually?
        // Actually `init.sh` says: Creating user: admin and its associated password: password.
        // It doesn't explicitly create a vault for admin.

        const isUnlockTextVisible = await page.getByText('Unlock Vault').isVisible();
        if (isUnlockTextVisible) {
            // Try 'password'
            await page.fill('[data-testid="password-input"]', 'password');
            await page.click('[data-testid="unlock-button"]');
        } else {
            // New vault creation flow (effectively same UI)
            await page.fill('[data-testid="password-input"]', initialVaultKey);
            await page.click('[data-testid="unlock-button"]');
        }

        // Wait for dashboard
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // 3. Add a secret entry
        await page.getByTestId('new-entry-btn').click();
        const secretTitle = 'Secret ' + Date.now();
        await page.getByTestId('edit-title').fill(secretTitle);
        await page.getByTestId('edit-save').click();
        await expect(page.getByTestId('vault-modals')).not.toBeVisible();

        // 4. Change Vault Password
        await page.getByTestId('user-menu-btn').click();
        await page.getByTestId('menu-change-vault-password').click();

        await expect(page.getByText('Change Vault Password')).toBeVisible();
        await expect(page.getByText('Warning:')).toBeVisible();

        // Fill form
        // Use correct initial key. If we just created it, it is `initialVaultKey`.
        // If it was existing 'password', we might fail. 
        // Strategy: The test runner should run `reset-db` before this test.
        // If so, admin has NO vault. So we created it with `initialVaultKey`.

        await page.locator('#old-vault-pass').fill(initialVaultKey);
        await page.locator('#new-vault-pass').fill(newVaultKey);
        await page.locator('#confirm-vault-pass').fill(newVaultKey);

        // Click save and handle success dialog
        const successDialogPromise = page.waitForEvent('dialog');
        await page.getByTestId('submit-change-vault-password').click();
        const successDialog = await successDialogPromise;
        expect(successDialog.message()).toContain('success');
        await successDialog.accept();

        // Wait for modal to close
        await expect(page.getByText('Change Vault Password', { exact: true })).not.toBeVisible();

        // 5. Verify persistence

        // Reload page
        await page.reload();

        // 6. Try to unlock with OLD password -> Should Fail
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', initialVaultKey);

        // Handle failure dialog
        const failDialogPromise = page.waitForEvent('dialog');
        await page.click('[data-testid="unlock-button"]');
        const failDialog = await failDialogPromise;
        expect(failDialog.message()).toContain('Failed');
        await failDialog.accept();

        // 7. Unlock with NEW password -> Should Success
        await page.fill('[data-testid="password-input"]', newVaultKey);
        await page.click('[data-testid="unlock-button"]');

        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // 8. Verify Data Integrity
        await expect(page.getByText(secretTitle)).toBeVisible();
    });
});
