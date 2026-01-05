import { test, expect } from '@playwright/test';

test('debug login and unlock', async ({ page }) => {
    await page.addInitScript(() => {
        (window as any).__TESTING__ = true;
    });
    await page.goto('http://localhost:3000/');

    console.log('Filling login...');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    console.log('Waiting for unlock button...');
    await expect(page.getByTestId('unlock-button')).toBeVisible({ timeout: 10000 });

    console.log('Filling vault key...');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="unlock-button"]');

    console.log('Waiting for dashboard...');
    await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible({ timeout: 10000 });
    console.log('Dashboard visible!');
});
