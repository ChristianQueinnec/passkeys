import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const username = 'auth_test';
const password = 'password';
const vaultKey = 'password';
const vaultDir = path.join(process.cwd(), 'data', username);

/**
 * Comprehensive tests for vault behavior in various situations:
 * - Safe vs unsafe (untrusted) devices
 * - Vault present vs absent at unlock
 * - Synchronization with older/newer vaults
 * - Online vs offline modes
 */

async function ensureVaultExists(page: any, user: string, pass: string, key: string) {
    console.log(`[DEBUG] Ensuring vault exists for ${user}...`);
    await page.fill('input[placeholder="Username"]', user);
    await page.fill('[data-testid="password-input"]', pass);
    await page.click('[data-testid="login-button"]');

    console.log(`[DEBUG] Waiting for Unlock screen for ${user}...`);
    // Wait for Unlock screen
    // First access is very long!
    await expect(page.getByTestId('unlock-button'))
        .toBeVisible({timeout: 50*1000});

    console.log(`[DEBUG] Unlocking for ${user}...`);
    await page.fill('[data-testid="password-input"]', key);
    await page.click('[data-testid="unlock-button"]');

    console.log(`[DEBUG] Waiting for Dashboard for ${user}...`);
    // Wait for Dashboard
    await expect(page.locator('div.folder-dashboard')).toBeVisible();

    // Add an entry and save to ensure server vault exists
    await page.getByTestId('new-entry-btn').click();
    await page.getByTestId('edit-title').fill('Init Entry');
    await page.getByTestId('edit-save').click();

    const saveBtn = page.getByTestId('save-vault-btn');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(saveBtn).not.toBeVisible({ timeout: 10000 });

    await page.getByTestId('user-menu-btn').click();
    await page.getByTestId('menu-logout').click();
    await expect(page.getByTestId('login-button')).toBeVisible();
}

test.describe('Vault Situations: Safe Device', () => {

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

    test('should persist vault in localStorage on safe device', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        // Login with "trust this device" checked
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        // Unlock vault
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Wait for vault to load
        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Verify token is in localStorage (safe device)
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).not.toBeNull();

        // Verify offline vault is stored
        const offlineVault = await page.evaluate(() => localStorage.getItem('offline_vault'));
        expect(offlineVault).not.toBeNull();

        // Reload page - should stay authenticated (at least have token)
        await page.reload();

        // Should be at Unlock phase (requires master password even if token persisted)
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.folder-dashboard')).toBeVisible();
    });

    test('should reload cached vault from localStorage when offline', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        // First, login and cache vault
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        
        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Wait for vault to be cached
        await page.waitForTimeout(1000);

        // Block all API requests to simulate offline
        await page.route('**/api/**', route => route.abort('failed'));

        // Reload page to simulate restarting app
        await page.reload();

        // Should be at Unlock phase (token persisted)
        await expect(page.getByTestId('unlock-button')).toBeVisible();

        // Unlock with cached vault
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Should load from localStorage
        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Should show offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    });
});

test.describe('Vault Situations: Unsafe Device', () => {

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

    test('should use sessionStorage on unsafe device', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        // Login WITHOUT "trust this device"
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.getByTestId('trust-device-checkbox').uncheck();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        await expect(page.locator('.folder-dashboard')).toBeVisible();
        await page.waitForTimeout(1000);

        // Verify token is in sessionStorage, NOT localStorage
        const localToken = await page.evaluate(() => localStorage.getItem('token'));
        const sessionToken = await page.evaluate(() => sessionStorage.getItem('token'));

        expect(localToken).toBeNull();
        expect(sessionToken).not.toBeNull();

        // Offline vault should still be in localStorage for offline access
        await page.reload();
        const offlineVault = await page.evaluate(() => localStorage.getItem('offline_vault'));
        expect(offlineVault).not.toBeNull();
    });

    test('should NOT persist login after browser restart on unsafe device', async ({ page, context }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        // Login without trust
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.getByTestId('trust-device-checkbox').uncheck();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Simulate browser restart by creating new context
        const newPage = await context.newPage();
        await newPage.goto('/');

        // Should be at login screen, NOT authenticated
        await expect(newPage.getByTestId('login-button')).toBeVisible();

        // Token should not persist
        const token = await newPage.evaluate(() => {
            return localStorage.getItem('token') || sessionStorage.getItem('token');
        });
        expect(token).toBeNull();

        await newPage.close();
    });
});

test.describe('Vault Situations: Vault Presence at Unlock', () => {

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

    test('should handle missing vault file gracefully', async ({ page }) => {
        // Remove all vault files
        if (fs.existsSync(vaultDir)) {
            const files = fs.readdirSync(vaultDir).filter(f => f.endsWith('.vault'));
            files.forEach(f => fs.unlinkSync(path.join(vaultDir, f)));
        }

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        // Should proceed to unlock even without server vault
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Should initialize empty vault or load from offline cache
        // If no offline cache, should start with empty vault
        const offlineVault = await page.evaluate(() => localStorage.getItem('offline_vault'));
        if (!offlineVault) {
            // Empty vault case - should still show dashboard
            await expect(page.locator('.folder-dashboard')).toBeVisible();
        }
    });

    test('should prioritize server vault over cached vault when present', async ({ page }) => {
        // Create a server vault with specific content
        const serverEntry = {
            id: 'server-entry',
            title: 'Server Version Entry',
            username: 'server@example.com',
            password: 'server-pass',
            created: Date.now(),
            modified: Date.now()
        };

        // Ensure vault exists on server
        if (!fs.existsSync(vaultDir)) {
            fs.mkdirSync(vaultDir, { recursive: true });
        }
        fs.writeFileSync(
            path.join(vaultDir, 'vault-init.vault'),
            JSON.stringify([serverEntry])
        );

        // Set different cached vault in localStorage
        await page.goto('/');
        await page.evaluate(() => {
            const cachedEntry = {
                id: 'cached-entry',
                title: 'Cached Version Entry',
                username: 'cached@example.com',
                password: 'cached-pass'
            };
            localStorage.setItem('offline_vault', JSON.stringify([cachedEntry]));
        });

        // Login and unlock
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Should see server entry, not cached entry
        await expect(page.getByText('Server Version Entry')).toBeVisible();
        await expect(page.getByText('Cached Version Entry')).not.toBeVisible();
    });
});

test.describe('Vault Situations: Synchronization', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await ensureVaultExists(page, username, password, vaultKey);

        // Login and unlock
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.folder-dashboard')).toBeVisible();
    });

    test('should detect when server has newer vault version', async ({ page }) => {
        // Create a newer vault file on server
        // Wait to ensure mtime difference (test polling is 1s)
        await page.waitForTimeout(1200);

        const newerTimestamp = new Date().toISOString();
        const newerFilename = `vault-${newerTimestamp.replace(/[:.]/g, '-')}.vault`;

        // Get existing vault content
        const existingFiles = fs.readdirSync(vaultDir).filter(f => f.endsWith('.vault'));
        let content = '[]';
        if (existingFiles.length > 0) {
            content = fs.readFileSync(path.join(vaultDir, existingFiles[0]), 'utf-8');
        }

        const newerPath = path.join(vaultDir, newerFilename);
        fs.writeFileSync(newerPath, content);
        // fs.utimesSync(newerPath, futureTime, futureTime); // Removed manual utimes

        // Wait for polling to detect
        await page.waitForTimeout(2000);

        // Should show newer version warning
        await expect(page.locator('[data-testid="newer-version-alert"]')).toBeVisible({
            timeout: 15000
        });

        // Should offer to reload
        const reloadButton = page.locator('[data-testid="reload-vault-btn"]');
        await expect(reloadButton).toBeVisible();

        // Clean up
        fs.unlinkSync(path.join(vaultDir, newerFilename));
    });

    test('should allow user to save when local version is newer', async ({ page }) => {
        // Make a change to create dirty state
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Local Change');
        await page.getByTestId('edit-save').click();

        // Save button should be visible
        await expect(page.getByTestId('save-vault-btn')).toBeVisible();

        // Should be able to save despite any server state
        await page.getByTestId('save-vault-btn').click();

        // Wait for save to complete
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible({ timeout: 5000 });

        // Entry should persist
        await expect(page.getByText('Local Change')).toBeVisible();
    });

    test('should handle conflict when both local and server have changes', async ({ page }) => {
        // Make local change but don't save
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Unsaved Local Change');
        await page.getByTestId('edit-save').click();

        const newerTimestamp = new Date(Date.now() + 5000).toISOString();
        const newerFilename = `vault-${newerTimestamp.replace(/[:.]/g, '-')}.vault`;
        const existingFiles = fs.readdirSync(vaultDir).filter(f => f.endsWith('.vault'));
        const content = fs.readFileSync(path.join(vaultDir, existingFiles[0]), 'utf-8');
        const newerPath = path.join(vaultDir, newerFilename);
        fs.writeFileSync(newerPath, content);
        const futureTime = new Date(Date.now() + 10000);
        fs.utimesSync(newerPath, futureTime, futureTime);

        // Wait for detection
        await page.waitForTimeout(2000);

        // Should show both: newer version alert AND xsave button (conflict state)
        await expect(page.locator('[data-testid="newer-version-alert"]')).toBeVisible();
        await expect(page.getByTestId('save-vault-btn')).toBeVisible();

        // Clean up
        fs.unlinkSync(path.join(vaultDir, newerFilename));
    });
});

test.describe('Vault Situations: Online/Offline Modes', () => {

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

    test('should work fully when online', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Should NOT show offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();

        // Should be able to save
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Online Entry');
        await page.getByTestId('edit-save').click();
        await page.getByTestId('save-vault-btn').click();

        // Save should succeed
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible({ timeout: 5000 });
    });

    test('should transition to offline mode when connection lost', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Initially online
        await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();

        // Break connection
        await page.route('**/api/vault/metadata', route => route.abort('failed'));

        // Wait for next poll cycle (1s in test mode)
        await page.waitForTimeout(2000);

        // Should show offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({
            timeout: 3000
        });
    });

    test('should prevent saving when offline', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        // Login and get to vault view
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Block API
        await page.route('**/api/**', route => route.abort('failed'));

        await page.waitForTimeout(2000);

        // Make a change
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Offline Entry');
        await page.getByTestId('edit-save').click();

        // Save button should appear but be disabled
        const saveBtn = page.getByTestId('save-vault-btn');
        await expect(saveBtn).toBeVisible();
        await expect(saveBtn).toBeDisabled();

        // Try to save - should be disabled
        await expect(saveBtn).toBeDisabled();

        // Should show error message or remain dirty
        await page.waitForTimeout(500);
        // Button should still be visible (save failed)
        await expect(saveBtn).toBeVisible();
    });

    test('should restore online mode when connection returns', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Break connection
        await page.route('**/api/vault/metadata', route => route.abort('failed'));
        await page.waitForTimeout(2000);
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

        // Restore connection
        await page.unroute('**/api/vault/metadata');

        // Wait for next poll cycle
        await page.waitForTimeout(2000);

        // Should go back online
        await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible({
            timeout: 3000
        });
    });

    test('should use cached vault when offline from start', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        // First, populate cache
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.folder-dashboard')).toBeVisible();

        // Add an entry to cache
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Cached Entry');
        await page.getByTestId('edit-save').click();

        // Wait for save to complete and modal to close
        await expect(page.getByTestId('vault-modals')).not.toBeVisible();

        // PERSIST CHANGES: Click the main save button
        await page.getByTestId('save-vault-btn').click();
        await expect(page.getByTestId('save-vault-btn')).not.toBeVisible();

        // Wait a bit to ensure localStorage persistence
        await page.waitForTimeout(2000);

        // Verify offline vault is stored
        const storedVault = await page.evaluate(() => localStorage.getItem('offline_vault'));
        expect(storedVault).not.toBeNull();

        // Block all API from the start
        await page.route('**/api/**', route => route.abort('failed'));

        // Reload to simulate fresh start offline
        await page.reload();

        // Even with API blocked, we should be able to see Unlock screen because token is in localStorage
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Should load from cache
        // Should load from cache
        await expect(page.locator('.folder-dashboard')).toBeVisible();
        await expect(page.getByText('Cached Entry')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Vault Situations: Edge Cases', () => {

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

    test('should handle corrupted cached vault gracefully', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        await page.goto('/');

        // Set corrupted vault in cache
        await page.evaluate(() => {
            localStorage.setItem('offline_vault', 'not-valid-json{{{');
        });

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Should fall back to server vault
        await expect(page.locator('.folder-dashboard')).toBeVisible();
    });

    test('should handle wrong vault key gracefully', async ({ page }) => {
        await ensureVaultExists(page, username, password, vaultKey);

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('[data-testid="password-input"]', password);
        await page.click('[data-testid="login-button"]');

        // Use wrong vault key
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/failed/i);
            await dialog.dismiss();
        });
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', 'wrong-key-intentionally');
        await page.click('[data-testid="unlock-button"]');

        // Should remain at unlock screen
        await expect(page.getByTestId('unlock-button')).toBeVisible();

        // Should be able to retry with correct key
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('[data-testid="password-input"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.folder-dashboard')).toBeVisible();
    });

});
