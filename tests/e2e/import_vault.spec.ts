import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Vault Import', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test('should import an unciphered JSON vault', async ({ page }) => {
        console.log("Starting test...");
        // 1. Login
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="login-button"]');
        console.log("Logged in");

        // 2. Unlock
        await expect(page.getByText('Unlock Vault')).toBeVisible();
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="unlock-button"]');
        console.log("Unlocked");

        // Wait for dashboard
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible({ timeout: 15000 });
        console.log("Dashboard visible");

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
        console.log("Import file prepared at", importFilePath);

        // 4. Trigger Import
        await page.click('[data-testid="user-menu-btn"]');

        // Wait for menu
        await expect(page.getByTestId('menu-import')).toBeVisible();

        // Handle file chooser
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('[data-testid="menu-import"]');
        const fileChooser = await fileChooserPromise;
        console.log("File chooser opened");

        const dialogPromise = page.waitForEvent('dialog');
        await fileChooser.setFiles(importFilePath);
        console.log("Files set to chooser");

        // 5. Verify Import Alert
        const dialog = await dialogPromise;
        console.log("Dialog appeared:", dialog.message());
        expect(dialog.message()).toContain('imported successfully');
        await dialog.accept();

        // 6. Verify entry appears
        // Force folder view or list view?
        // If imported has group "Imported", it should be in a folder named "Imported" in Folder View
        // Or "Imported Entry" in list view.

        // Let's search for it to be view-agnostic
        await page.fill('[data-testid="filter-input"]', 'Imported Entry');
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
