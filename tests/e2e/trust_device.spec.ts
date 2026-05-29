import { test, expect } from '@playwright/test';

const authCookieName = 'passkeys_auth';

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

    test('should persist login in a persistent cookie when device is trusted', async ({ page }) => {
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('app-title')).toBeVisible();

        // Extra wait to ensure storage is updated
        await page.waitForTimeout(500);

        const cookies = await page.context().cookies();
        const authCookie = cookies.find(cookie => cookie.name === authCookieName);
        expect(authCookie).toBeTruthy();
        expect(authCookie?.httpOnly).toBe(true);
        expect(authCookie?.expires).toBeGreaterThan(0);

        // Reload should keep session
        await page.reload();
        await expect(page.getByTestId('app-title')).toBeVisible();
    });

    test('should use a session cookie when device is NOT trusted', async ({ page }) => {
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        // Explicitly uncheck to be safe
        await page.getByTestId('trust-device-checkbox').uncheck();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('app-title')).toBeVisible();

        // Extra wait to ensure storage is updated
        await page.waitForTimeout(500);

        const cookies = await page.context().cookies();
        const authCookie = cookies.find(cookie => cookie.name === authCookieName);
        expect(authCookie).toBeTruthy();
        expect(authCookie?.httpOnly).toBe(true);
        expect(authCookie?.expires).toBe(-1);

        // Reload should keep session (sessionStorage survives reload)
        await page.reload();
        await expect(page.getByTestId('app-title')).toBeVisible();
    });
});
