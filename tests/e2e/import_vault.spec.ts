import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Vault Import', () => {
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
    });

    test('should import an unciphered JSON vault', async ({ page }) => {
        // 1. Login
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        // 2. Unlock
        await expect(page.getByText('Unlock Vault')).toBeVisible();
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="unlock-button"]');

        // Wait for dashboard
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible({ timeout: 15000 });

        // 3. Prepare import file
        const importData = [
            {
                "group": "Imported",
                "title": "Imported Entry",
                "username": "imported_user",
                "password": "imported_password",
                "site": "https://imported.example.com",
                "tags": ["import"]
            }
        ];
        const importFilePath = path.join(process.cwd(), 'tests/e2e/fixtures/import.json');

        // Ensure directory exists
        const dir = path.dirname(importFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(importFilePath, JSON.stringify(importData, null, 2));

        // 4. Trigger Import
        await page.click('[data-testid="user-menu-btn"]');

        // Wait for menu
        await expect(page.getByTestId('menu-import')).toBeVisible();

        // Handle file chooser
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('[data-testid="menu-import"]');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(importFilePath);

        // 5. Verify Import Alert
        page.on('dialog', dialog => {
            expect(dialog.message()).toContain('imported successfully');
            dialog.accept();
        });

        // 6. Verify entry appears
        // Force folder view or list view?
        // If imported has group "Imported", it should be in a folder named "Imported" in Folder View
        // Or "Imported Entry" in list view.

        // Let's search for it to be view-agnostic
        await page.fill('input[placeholder*="Search"]', 'Imported Entry');
        await expect(page.getByText('Imported Entry')).toBeVisible();

        // 7. Save
        await page.click('button:has-text("Securely Save Changes")');
        // Wait for save?
        // Alert on save?
        // Check manually reload?

        await page.reload();
        // Login/Unlock cycle again? 
        // Reloading might kick back to unlock if session persists, or login if not.
        // Assuming session persists for short time or mock.
        // Wait, reload clears in-memory state in our app unless we use localStorage for persistence of token/keys?
        // App checks token on mount.

        await expect(page.getByText('Unlock Vault')).toBeVisible();
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="unlock-button"]');

        // Check if data persisted
        await page.fill('input[placeholder*="Search"]', 'Imported Entry');
        await expect(page.getByText('Imported Entry')).toBeVisible();
    });
});
