import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should switch language between EN and FR', async ({ page }) => {
        // Switch to English explicitly
        await page.getByRole('button', { name: 'EN' }).click();
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Secure Vault');

        // Switch to French
        await page.getByRole('button', { name: 'FR' }).click();
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Coffre Sécurisé');

        // Buttons should have active class
        await expect(page.getByRole('button', { name: 'FR' })).toHaveClass(/active/);
        await expect(page.getByRole('button', { name: 'EN' })).not.toHaveClass(/active/);
    });

    test('should persist language choice after reload', async ({ page }) => {
        // Switch to English first to be sure
        await page.getByRole('button', { name: 'EN' }).click();
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Secure Vault');

        // Ensure we are in French
        await page.getByRole('button', { name: 'FR' }).click();
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Coffre Sécurisé');

        // Reload
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should still be in French
        await expect(page.getByTestId('app-title')).toHaveText('Passkeys - Coffre Sécurisé');
        await expect(page.getByRole('button', { name: 'FR' })).toHaveClass(/active/);
    });
});
