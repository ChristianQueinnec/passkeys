import { test, expect } from '@playwright/test';

test.describe('Help Menu Item', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();

        // Login
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="login-button"]');
        await expect(page.getByTestId('unlock-button')).toBeVisible();
    });

    test('should show Help link in user menu and point to correct URL', async ({ page, context }) => {
        // Open user menu
        await page.click('button.user-btn');

        const helpLink = page.getByTestId('menu-help');
        await expect(helpLink).toBeVisible();
        await expect(helpLink).toHaveAttribute('href', 'https://github.com/ChristianQueinnec/passkeys/blob/main/user-guide.md');
        await expect(helpLink).toHaveAttribute('target', '_blank');

        // Verify it opens in a new tab
        const [newPage] = await Promise.all([
            context.waitForEvent('page'),
            helpLink.click()
        ]);

        expect(newPage.url()).toBe('https://github.com/ChristianQueinnec/passkeys/blob/main/user-guide.md');

        // Verify menu is closed after click
        await expect(helpLink).not.toBeVisible();
    });
});
