import { test, expect } from '@playwright/test';

test.describe('Logout Security', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        // await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();

        // Setup initial user and login
        await page.getByPlaceholder('Username').fill('auth_test');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('password');
        await page.getByTestId('unlock-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
    });

    test('should clear inactivity timer on logout', async ({ page }) => {
        // 1. Wait a bit to ensure potential timers are running
        await page.waitForTimeout(1000);

        // 2. Logout
        await page.locator('.user-btn').click();
        await page.getByTestId('menu-logout').click();

        await expect(page.getByTestId('login-button')).toBeVisible();
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '0');

        // 3. Wait for longer than the inactivity timeout (which is 1s in test mode)
        // If the timer wasn't cleared, it might try to "lock" the vault or throw errors
        // because vault is already closed.
        await page.waitForTimeout(2000);

        // 4. Verify we are still on login screen and no crash/weird state
        await expect(page.getByTestId('login-button')).toBeVisible();

        // Check related console errors? Playwright captures them.
        // If the timer fired and tried to access null vault/key, it might throw exception.

        // Let's verify we can log back in freshly
        await page.getByPlaceholder('Username').fill('auth_test');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1');
    });
});
