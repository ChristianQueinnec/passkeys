import { test, expect } from '@playwright/test';

test.describe('Trust Device Security', () => {
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
    });

    test('should persist login in localStorage when device is trusted', async ({ page }) => {
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('app-title')).toBeVisible();

        // Extra wait to ensure storage is updated
        await page.waitForTimeout(500);

        // Check localStorage
        await page.waitForFunction(() => localStorage.getItem('token') !== null);
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).not.toBeNull();

        // Check sessionStorage (should be empty for token)
        const sToken = await page.evaluate(() => sessionStorage.getItem('token'));
        expect(sToken).toBeNull();

        // Reload should keep session
        await page.reload();
        await expect(page.getByTestId('app-title')).toBeVisible();
    });

    test('should only persist login in sessionStorage when device is NOT trusted', async ({ page }) => {
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        // Explicitly uncheck to be safe
        await page.getByTestId('trust-device-checkbox').uncheck();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('app-title')).toBeVisible();

        // Extra wait to ensure storage is updated
        await page.waitForTimeout(500);

        // Check localStorage (should be empty for token)
        const lToken = await page.evaluate(() => localStorage.getItem('token'));
        expect(lToken).toBeNull();

        // Check sessionStorage (should have token)
        await page.waitForFunction(() => sessionStorage.getItem('token') !== null);
        const sToken = await page.evaluate(() => sessionStorage.getItem('token'));
        expect(sToken).not.toBeNull();

        // Reload should keep session (sessionStorage survives reload)
        await page.reload();
        await expect(page.getByTestId('app-title')).toBeVisible();
    });
});
