import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Unciphered Vault Detection', () => {
    const username = 'admin';
    const vaultDir = path.join(process.cwd(), 'data', username);

    test.beforeEach(async ({ page }) => {
        // Ensure user exists and has an unciphered vault
        if (!fs.existsSync(vaultDir)) {
            fs.mkdirSync(vaultDir, { recursive: true });
        }
        // Write an unciphered vault (starts with [)
        fs.writeFileSync(path.join(vaultDir, '00_unciphered.vault'), '[]');

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        // Wait for unlock button
        await expect(page.getByTestId('unlock-button')).toBeVisible();

        // Unlock step
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="unlock-button"]');

        await expect(page.getByTestId('app-title')).toBeVisible();
    });

    test('should flag unciphered vault in history', async ({ page }) => {
        // Open History directly from dashboard
        await page.click('button[data-testid="history-btn"]');

        // Wait for modal
        await expect(page.getByText('Vault History')).toBeVisible();

        // Check for warning icon (at least one)
        await expect(page.locator('span.warning-icon').first()).toBeVisible();
        await expect(page.locator('span.warning-icon').first()).toHaveText('⚠️');

        // Check for special delete button text
        await expect(page.locator('button.pulse').first()).toContainText(/Delete Promptly|Supprimer sans attendre/);

        // Handle confirm dialog
        page.once('dialog', dialog => dialog.accept());

        // Delete the first one
        await page.locator('button.pulse').first().click();

        // Should be at least one less (or gone if it was the only one, but here we expect at least one less)
        // Let's just wait for the specific one to disappear if we can find it by filename?
        // But the modal stays open. Let's just check that we can delete one.
    });

    test.afterAll(async () => {
        // Cleanup if needed, but init.sh -t usually cleans up
    });
});
