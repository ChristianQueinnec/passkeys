import { test, expect } from '@playwright/test';

test.describe('Delayed Vault Polling', () => {
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

    test('should NOT poll server before unlock and SHOULD poll after unlock', async ({ page }) => {
        let pollCount = 0;
        await page.route('**/api/vault/metadata', route => {
            pollCount++;
            route.fulfill({ status: 200, body: JSON.stringify({ mtime: new Date().toISOString() }) });
        });

        // Phase 0: Login
        await page.waitForTimeout(2000); // Wait bit more than polling interval? 
        // Polling interval in tests is 1000ms (pollForUpdatesIntervalTest in client-settings.json)
        expect(pollCount).toBe(0);

        // Phase 1: Unlock
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="login-button"]');
        await expect(page.getByTestId('unlock-button')).toBeVisible();

        await page.waitForTimeout(2000);
        expect(pollCount).toBe(0);

        // Phase 2: Dashboard
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="unlock-button"]');
        await expect(page.getByTestId('new-entry-btn')).toBeVisible();

        // Should start polling now
        await page.waitForResponse(resp => resp.url().includes('/api/vault/metadata'), { timeout: 10000 });
        expect(pollCount).toBeGreaterThanOrEqual(1);
    });
});
