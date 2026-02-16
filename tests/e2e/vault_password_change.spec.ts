import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

test.describe('Vault Password Change', () => {
    const username = 'test_pw_change';
    const password = 'p';
    const initialVaultKey = 'old-key';
    const newVaultKey = 'new-key';

    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        // Clean up vault for the test user to ensure a fresh start
        await page.goto(`/api/test/cleanup-vault?username=vault_change_test`);

        // Reduced iterations for faster test
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });

        // Diagnostic logging
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
        });

        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test('should allow changing vault password and re-encrypt data', async ({ page }) => {
        // 1. Login
        await page.fill('[data-testid="username-input"]', 'vault_change_test');
        await page.fill('[data-testid="password-input"]', 'password');

        await page.click('[data-testid="login-button"]');

        // 2. Unlock/Create Vault
        // Unlock screen is identified by the app-container data-phase="1"
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1');

        // Wait for the unlock notice to be updated by checkVaultExists
        // We use a regex to wait for either EN or FR text to appear, ensuring the state is loaded
        const notice = page.locator('.unlock-notice');
        await expect(notice).toBeVisible();
        await expect(notice).not.toHaveText(/notice|note/i); // Wait until it contains actual info

        // Check if vault exists for this user by looking at the CSS class
        const vaultExistsOnUI = await notice.evaluate(el => el.classList.contains('exists'));

        if (vaultExistsOnUI) {
            // Unlock flow (if vault somehow survived cleanup or we are repeating)
            await page.fill('[data-testid="password-input"]', 'password');
            await page.click('[data-testid="unlock-button"]');
        } else {
            // New vault creation flow
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

        const modalTitle = page.getByTestId('modal-title');
        await expect(modalTitle).toHaveText(/Change Vault Password|Changer le mot de passe du coffre/);

        // Fill form
        await page.locator('#old-vault-pass').fill(initialVaultKey);
        await page.locator('#new-vault-pass').fill(newVaultKey);
        await page.locator('#confirm-vault-pass').fill(newVaultKey);

        // Click save and verify success toast
        await page.getByTestId('submit-change-vault-password').click();
        const successToast = page.getByTestId('toast-content');
        await expect(successToast).toBeVisible();
        await expect(successToast).toHaveText(/success|succès|changed|changé/i);

        // Close toast to clear UI
        await page.getByTestId('toast-close').click();

        // Wait for modal to close
        await expect(modalTitle).not.toBeVisible();

        // 5. Verify persistence

        // Reload page
        await page.reload();

        // 6. Try to unlock with OLD password -> Should Fail
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', initialVaultKey);

        // Click and verify failure toast or error message
        await page.click('[data-testid="unlock-button"]');

        // It could be either a toast or the inline error message
        const failToast = page.getByTestId('toast-content');
        const inlineError = page.locator('.error[role="alert"]');

        await expect(failToast.or(inlineError).first()).toBeVisible();
        await expect(failToast.or(inlineError).first()).toHaveText(/failed|échec|incorrect/i);

        // 7. Unlock with NEW password -> Should Success
        await page.fill('[data-testid="password-input"]', newVaultKey);
        await page.click('[data-testid="unlock-button"]');

        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // 8. Verify Data Integrity
        await expect(page.getByText(secretTitle)).toBeVisible();

        // Cleanup at the end
        await page.goto(`/api/test/cleanup-vault?username=vault_change_test`);
    });
});
