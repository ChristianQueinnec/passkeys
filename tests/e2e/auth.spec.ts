import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should show login screen initially', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });

    test('should fail login with invalid credentials', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('wronguser');
        await page.getByPlaceholder('Password').fill('wrongpass');
        await page.getByRole('button', { name: 'Login' }).click();

        const error = page.locator('.error');
        await expect(error).toBeVisible();
        // Optional: check text if possible, but visibility is good enough for now
    });

    test('should login successfully and manage session', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('auth_test');
        await page.getByPlaceholder('Password').fill('q');
        await page.getByRole('button', { name: 'Login' }).click();

        // Should see Unlock screen (Phase 1)
        await expect(page.getByRole('heading', { name: 'Unlock Vault' })).toBeVisible();

        // Should see user menu
        await expect(page.locator('.user-btn')).toContainText('auth_test');

        // Logout
        await page.locator('.user-btn').click();
        await page.getByRole('button', { name: 'Logout' }).click();

        // Should be back to login
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });

    test('should change password successfully', async ({ page }) => {
        // Login
        await page.getByPlaceholder('Username').fill('auth_test');
        await page.getByPlaceholder('Password').fill('q');
        await page.getByRole('button', { name: 'Login' }).click();

        // Open menu
        await page.locator('.user-btn').click();
        await page.getByRole('button', { name: 'Change Password' }).click();

        // Fill form
        await page.locator('input[type="password"]').nth(0).fill('q'); // Old
        await page.locator('input[type="password"]').nth(1).fill('newpass'); // New
        await page.getByRole('button', { name: 'Update Password' }).click();

        await expect(page.getByText('Password updated successfully')).toBeVisible();

        // Cleanup: Revert password for other tests
        await page.locator('input[type="password"]').nth(0).fill('newpass');
        await page.locator('input[type="password"]').nth(1).fill('q');
        await page.getByRole('button', { name: 'Update Password' }).click();
    });
});
