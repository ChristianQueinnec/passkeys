import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });

    test('should show login screen initially', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });

    test('should fail login with invalid credentials', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('wronguser');
        await page.getByPlaceholder('Password').fill('wrongpass');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        const error = page.locator('.error');
        await expect(error).toBeVisible();
        // Optional: check text if possible, but visibility is good enough for now
    });

    test('should login successfully and manage session', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('auth_test');
        await page.getByPlaceholder('Password').fill('q');
        await page.waitForTimeout(500); // Wait for runes to update
        await page.keyboard.press('Enter');

        // Should see Unlock screen (Phase 1)
        try {
            await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        } catch (e) {
            const html = await page.locator('.app-container').innerHTML();
            console.error('Login transition failed. HTML state:', html);
            const errorMsg = await page.locator('.error').innerText().catch(() => 'No error msg');
            console.error('Error on page:', errorMsg);
            throw e;
        }
        await expect(page.getByRole('heading', { name: 'Unlock Vault' })).toBeVisible();

        // Should see user menu
        await expect(page.locator('.user-name')).toHaveText('auth_test');

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
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'Login' }).click();

        // Should see Unlock screen (Phase 1)
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder('Vault Password').fill('q');
        await page.getByTestId('unlock-button').click();

        // Should be in Dashboard (Phase 2)
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard')).toBeVisible();

        // Open menu
        await page.locator('.user-btn').click();
        await page.getByRole('button', { name: 'Change Password' }).click();

        // Fill form
        await page.getByLabel('Current Password:').fill('q'); // Old
        await page.getByLabel('New Password:').fill('newpass'); // New
        await page.getByRole('button', { name: 'Update Password' }).click();

        await expect(page.getByText('Password updated successfully')).toBeVisible();

        // Cleanup: Revert password for other tests
        await page.getByLabel('Current Password:').fill('newpass');
        await page.getByLabel('New Password:').fill('q');
        await page.getByRole('button', { name: 'Update Password' }).click();
        await expect(page.getByText('Password updated successfully')).toBeVisible();
    });
});
