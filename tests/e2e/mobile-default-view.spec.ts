import { test, expect, type Page } from '@playwright/test';

test.describe('Mobile portrait default view', () => {
    test.use({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    });

    test.beforeEach(async ({ page, context, request }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });

        await request.get('/api/test/cleanup-vault?username=admin');

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('should open in list view on a phone in portrait mode', async ({ page }) => {
        await ensureVaultExists(page, 'admin', 'password', 'password');
        await loginAndUnlockVault(page);

        await expect(page.locator('.dashboard')).toBeVisible();
        await expect(page.locator('.folder-dashboard')).toBeHidden();
        await expect(page.getByTestId('list-view')).toBeVisible();
    });
});

async function loginAndUnlockVault(page: Page) {
    await page.goto('/');
    await page.getByTestId('username-input').fill('admin');
    await page.getByTestId('password-input').fill('password');
    await page.getByTestId('login-button').click();

    await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1');
    await page.getByTestId('password-input').fill('password');
    await page.getByTestId('unlock-button').click();

    await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
    await page.waitForSelector('.dashboard');
}

async function ensureVaultExists(page: Page, user: string, pass: string, key: string) {
    await page.goto('/');
    await page.getByTestId('username-input').fill(user);
    await page.getByTestId('password-input').fill(pass);
    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('unlock-button')).toBeVisible();

    await page.getByTestId('password-input').fill(key);
    await page.getByTestId('unlock-button').click();

    await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

    await page.getByTestId('new-entry-btn').click();
    await page.getByTestId('edit-title').fill('Init Entry');
    await page.getByTestId('edit-username').fill('testuser');
    await page.getByTestId('edit-password').fill('testpassword');
    await page.getByTestId('edit-save').click();

    const saveBtn = page.getByTestId('save-vault-btn');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(saveBtn).not.toBeVisible({ timeout: 15000 });

    await page.getByTestId('user-menu-btn').click();
    await page.getByTestId('menu-logout').click();
    await expect(page.getByTestId('login-button')).toBeVisible();
}
