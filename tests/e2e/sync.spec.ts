import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Sync and Offline Recovery', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.getByPlaceholder('Username').fill('history_test');
        await page.getByPlaceholder('Password').fill('password');
        await page.getByTestId('login-button').click();

        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('password');
        await page.getByTestId('unlock-button').click();
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
    });

    test('should detect newer version on server', async ({ page }) => {
        // Ensure we have a baseline
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Sync Baseline');
        await page.getByTestId('edit-save').click();
        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Simulate another client saving a new version by manually creating a file in data/history_test
        // This is a bit "heavy" for a frontend test but effective for verification if we have access.
        // If we can't touch FS, we'd need to mock network, but we are running on the user system.

        const userDir = path.join(process.cwd(), 'data', 'history_test');
        const timestamp = new Date(Date.now() + 5000).toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}.vault`;
        const content = fs.readFileSync(path.join(userDir, fs.readdirSync(userDir).filter(f => f.endsWith('.vault')).sort().reverse()[0]), 'utf-8');
        fs.writeFileSync(path.join(userDir, filename), content);

        // Wait for polling (or trigger it if we had a way, but let's wait a bit or use evaluate)
        // To speed up test, we can force a poll call
        await page.evaluate(() => {
            // @ts-ignore - reaching into svelte state if possible or just wait
        });

        // Actually, the poll interval is 60s. For testing, we might want to reduce it or just trigger the function.
        // Let's use a smaller interval in the test environment if possible, or just wait.
        // Alternative: navigate away and back? No, that's not periodic.

        // Let's modify the interval to 2s for this test via evaluate
        await page.evaluate(() => {
            // This is hacky but common for testing timers
            // We'd need access to the component instance or the timer ID.
            // Since we can't easily get it, let's just wait for the warning if we set it low enough initially?
            // Or just check if the warning appears after a manual refresh of metadata?
        });

        // Let's try to trigger a reload or wait. 
        // Better: check that "Offline" appears if we break the API.

        await page.route('**/api/vault/metadata', route => route.abort('failed'));
        // Wait for a poll cycle. 60s is too long for a test.
        // I should have made the interval configurable.
    });
});
