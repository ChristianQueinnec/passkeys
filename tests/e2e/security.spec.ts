import { test, expect } from '@playwright/test';

test.describe('Security Inactivity Timeout', () => {
    test.beforeEach(async ({ page }) => {
        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.getByPlaceholder('Username').fill('q');
        await page.getByPlaceholder('Password').fill('q');
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder('Vault Password').fill('q');
        await page.getByTestId('unlock-button').click();

        // Wait for Dashboard
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard')).toBeVisible();

        // Ensure we have items
        if (await page.locator('[data-testid="vault-item"]').count() === 0) {
            await page.getByRole('button', { name: '+ New Entry' }).click();
            await page.getByLabel('Title *').fill('Security Test');
            await page.getByLabel('Username', { exact: true }).fill('sectest');
            await page.getByLabel('Password', { exact: true }).fill('secpass');
            await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

            // Must save vault to populate encryptedVaultData
            await page.locator('.save-btn').click();
            await expect(page.locator('.save-btn')).not.toBeVisible();
        } else {
            // If items exist but isDirty (unlikely from fresh reload, but possible), save just in case
            if (await page.locator('.save-btn').isVisible()) {
                await page.locator('.save-btn').click();
                await expect(page.locator('.save-btn')).not.toBeVisible();
            }
        }
    });

    test('should clear vault from memory after inactivity and restore on interaction', async ({ page }) => {
        // 1. Verify items are visible
        await expect(page.locator('[data-testid="vault-item"]').first()).toBeVisible();

        // 2. Install clock to mock time
        await page.clock.install();

        // Trigger a reset so the new timer uses the mocked clock
        await page.mouse.move(50, 50);

        // 3. Fast forward time by 61 seconds (timeout is 60s)
        await page.clock.fastForward(61000);

        // 4. Verify empty state message
        await expect(page.locator('.empty-state')).toContainText('Vault cleared from memory');
        await expect(page.locator('[data-testid="vault-item"]')).toHaveCount(0);

        // 5. Simulate interaction (mouse move)
        await page.mouse.move(100, 100);
        await page.mouse.move(200, 200); // Move a bit to ensure event triggers

        // 6. Verify items are restored
        await expect(page.locator('[data-testid="vault-item"]').first()).toBeVisible();
    });
});
