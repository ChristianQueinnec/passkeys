import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
        await expect(page.getByTestId('app-title')).toBeVisible();
        await expect(page.getByTestId('login-button')).toBeVisible();
    });

    test('should show login screen initially', async ({ page }) => {
        await expect(page.getByTestId('login-button')).toBeVisible();
    });

    test('should fail login with invalid credentials', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('wronguser');
        await page.getByPlaceholder('Password').fill('wrongpass');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        const error = page.locator('.error');
        await expect(error).toBeVisible();
    });

    test('should login successfully and manage session', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('auth_test');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await expect(page.getByTestId('unlock-button')).toBeVisible();

        await expect(page.locator('.user-name')).toHaveText('auth_test');

        await page.locator('.user-btn').click();
        await page.getByTestId('menu-logout').click();

        await expect(page.getByTestId('login-button')).toBeVisible();
    });

    test('should change password successfully', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('pass_change_test');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('password');
        await page.getByTestId('unlock-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        await page.locator('.user-btn').click();
        await page.getByTestId('menu-change-password').click();

        await page.getByTestId('cp-old').fill('password');
        await page.getByTestId('cp-new').fill('newpassword');
        await page.getByTestId('cp-submit').click();

        await expect(page.getByText(/your (login|master) password has been updated successfully/i)).toBeVisible();

        await page.getByTestId('cp-old').fill('newpassword');
        await page.getByTestId('cp-new').fill('password');
        await page.getByTestId('cp-submit').click();
        await expect(page.getByText(/your (login|master) password has been updated successfully/i)).toBeVisible();
    });
});
