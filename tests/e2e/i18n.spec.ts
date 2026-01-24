import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should switch language between EN and FR', async ({ page }) => {
        // Dropdown is initially EN
        await expect(page.getByTestId('lang-switcher-btn')).toContainText('EN');

        // Switch to French
        await page.getByTestId('lang-switcher-btn').click();
        await page.getByRole('option', { name: 'FR' }).click();
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Coffre Sécurisé');
        await expect(page.getByTestId('lang-switcher-btn')).toContainText('FR');

        // Switch back to English
        await page.getByTestId('lang-switcher-btn').click();
        await page.getByRole('option', { name: 'EN' }).click();
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Secure Vault');
        await expect(page.getByTestId('lang-switcher-btn')).toContainText('EN');
    });

    test('should persist language choice after reload', async ({ page }) => {
        // Switch to French
        await page.getByTestId('lang-switcher-btn').click();
        await page.getByRole('option', { name: 'FR' }).click();
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Coffre Sécurisé');

        // Reload
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should still be in French
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Coffre Sécurisé');
        await expect(page.getByTestId('lang-switcher-btn')).toContainText('FR');
    });
});
