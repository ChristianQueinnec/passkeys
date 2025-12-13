import { test, expect } from '@playwright/test';

test('app has login screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
