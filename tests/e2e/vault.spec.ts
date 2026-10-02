import { test, expect } from '@playwright/test';

test.describe('Vault Operations', () => {
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

        await page.getByPlaceholder('Username').fill('q');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('password'); // Assuming master password matches for MVP demo
        await page.getByTestId('unlock-button').click();

        // Wait for Vault to be unlocked
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
    });

    test('should create, edit and delete a vault entry', async ({ page }) => {
        // Create
        await page.getByTestId('new-entry-btn').click();
        await expect(page.getByTestId('modal-title')).toBeVisible();

        await page.getByTestId('edit-title').fill('Test Site');
        await page.getByTestId('edit-username').fill('testuser');
        await page.getByTestId('edit-password').fill('secret123');
        await page.getByTestId('edit-site').fill('https://example.com');

        // Scope to editor to avoid ambiguity with "Save Vault"
        await page.getByTestId('edit-save').click();

        // Verify in list
        await expect(page.getByText('Test Site')).toBeVisible();

        // Edit
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Test Site' }).getByTestId('view-details-btn').click();
        await page.getByTestId('details-edit').click();
        await page.getByTestId('edit-title').fill('Updated Site');
        await page.getByTestId('edit-save').click();

        // Verify update
        await expect(page.getByText('Updated Site')).toBeVisible();
        await expect(page.getByText('Test Site')).not.toBeVisible();

        // Delete
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Updated Site' }).getByTestId('view-details-btn').click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();

        // Verify deletion
        await expect(page.getByText('Updated Site')).not.toBeVisible();
    });

    test('should reveal and select a password in details, then mask it again', async ({ page }) => {
        await page.getByTestId('new-entry-btn').click();
        const editorPassword = page.getByTestId('edit-password');

        await expect(editorPassword).toHaveAttribute('type', 'text');
        await editorPassword.fill('secret123');
        await page.getByTestId('edit-title').fill('Password Details Test');
        await page.getByTestId('edit-save').click();
        await page.locator('[data-testid="vault-item"]').filter({ hasText: 'Password Details Test' }).getByTestId('view-details-btn').click();

        const password = page.getByTestId('details-password');
        await expect(password).toHaveAttribute('type', 'text');
        await expect(password).toHaveValue('********');
        await password.click();

        await expect(password).toHaveValue('secret123');
        await expect.poll(() =>
            password.evaluate((element) => {
                const input = element as HTMLInputElement;
                return {
                start: input.selectionStart,
                end: input.selectionEnd,
                };
            }),
        ).toEqual({ start: 0, end: 9 });

        await page.waitForTimeout(5100);
        await expect(password).toHaveValue('********');
    });
});
