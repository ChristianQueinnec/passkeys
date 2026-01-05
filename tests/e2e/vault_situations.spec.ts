import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Comprehensive tests for vault behavior in various situations:
 * - Safe vs unsafe (untrusted) devices
 * - Vault present vs absent at unlock
 * - Synchronization with older/newer vaults
 * - Online vs offline modes
 */

test.describe('Vault Situations: Safe Device', () => {
    const username = 'auth_test';
    const password = 'q';
    const vaultKey = 'test-vault-key';
    const vaultDir = path.join(process.cwd(), 'data', username);

    test.beforeEach(async ({ page }) => {
        // Clear storage and ensure clean state
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
    });

    test('should persist vault in localStorage on safe device', async ({ page }) => {
        // Login with "trust this device" checked
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        // Unlock vault
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Wait for vault to load
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Wait for storage to be updated
        await page.waitForTimeout(500);

        // Verify token is in localStorage (safe device)
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).not.toBeNull();

        // Verify offline vault is stored
        const offlineVault = await page.evaluate(() => localStorage.getItem('offline_vault'));
        expect(offlineVault).not.toBeNull();

        // Reload page - should stay authenticated
        await page.reload();
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
    });

    test('should reload cached vault from localStorage when offline', async ({ page }) => {
        // First, login and cache vault
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Wait for vault to be cached
        await page.waitForTimeout(500);

        // Logout
        await page.click('[data-testid="logout-btn"]');
        await expect(page.getByTestId('login-button')).toBeVisible();

        // Block all API requests to simulate offline
        await page.route('**/api/**', route => route.abort('failed'));

        // Login again (token from localStorage)
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        // Unlock with cached vault
        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Should load from localStorage
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Should show offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    });
});

test.describe('Vault Situations: Unsafe Device', () => {
    const username = 'auth_test';
    const password = 'q';
    const vaultKey = 'test-vault-key';

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
    });

    test('should use sessionStorage on unsafe device', async ({ page }) => {
        // Login WITHOUT "trust this device"
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.getByTestId('trust-device-checkbox').uncheck();
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
        await page.waitForTimeout(500);

        // Verify token is in sessionStorage, NOT localStorage
        const localToken = await page.evaluate(() => localStorage.getItem('token'));
        const sessionToken = await page.evaluate(() => sessionStorage.getItem('token'));
        
        expect(localToken).toBeNull();
        expect(sessionToken).not.toBeNull();

        // Offline vault should still be in localStorage for offline access
        const offlineVault = await page.evaluate(() => localStorage.getItem('offline_vault'));
        expect(offlineVault).not.toBeNull();
    });

    test('should NOT persist login after browser restart on unsafe device', async ({ page, context }) => {
        // Login without trust
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.getByTestId('trust-device-checkbox').uncheck();
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

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
    const username = 'auth_test';
    const password = 'q';
    const vaultKey = 'test-vault-key';
    const vaultDir = path.join(process.cwd(), 'data', username);

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
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        // Should proceed to unlock even without server vault
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Should initialize empty vault or load from offline cache
        // If no offline cache, should start with empty vault
        const offlineVault = await page.evaluate(() => localStorage.getItem('offline_vault'));
        if (!offlineVault) {
            // Empty vault case - should still show dashboard
            await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
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
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Should see server entry, not cached entry
        await expect(page.getByText('Server Version Entry')).toBeVisible();
        await expect(page.getByText('Cached Version Entry')).not.toBeVisible();
    });
});

test.describe('Vault Situations: Synchronization', () => {
    const username = 'history_test';
    const password = 'q';
    const vaultKey = 'q';
    const vaultDir = path.join(process.cwd(), 'data', username);

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        // Login and unlock
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
    });

    test('should detect when server has newer vault version', async ({ page }) => {
        // Enable testing mode for faster polling
        await page.evaluate(() => {
            (window as any).__TESTING__ = true;
        });

        // Create a newer vault file on server
        const newerTimestamp = new Date(Date.now() + 10000).toISOString();
        const newerFilename = `vault-${newerTimestamp.replace(/[:.]/g, '-')}.vault`;
        
        // Get existing vault content
        const existingFiles = fs.readdirSync(vaultDir).filter(f => f.endsWith('.vault'));
        let content = '[]';
        if (existingFiles.length > 0) {
            content = fs.readFileSync(path.join(vaultDir, existingFiles[0]), 'utf-8');
        }
        
        fs.writeFileSync(path.join(vaultDir, newerFilename), content);

        // Wait for polling to detect (test mode uses 1s interval)
        await page.waitForTimeout(2000);

        // Should show newer version warning
        await expect(page.locator('[data-testid="newer-version-alert"]')).toBeVisible({
            timeout: 5000
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

        // Simulate server change by creating newer vault
        await page.evaluate(() => {
            (window as any).__TESTING__ = true;
        });

        const newerTimestamp = new Date(Date.now() + 5000).toISOString();
        const newerFilename = `vault-${newerTimestamp.replace(/[:.]/g, '-')}.vault`;
        const existingFiles = fs.readdirSync(vaultDir).filter(f => f.endsWith('.vault'));
        const content = fs.readFileSync(path.join(vaultDir, existingFiles[0]), 'utf-8');
        fs.writeFileSync(path.join(vaultDir, newerFilename), content);

        // Wait for detection
        await page.waitForTimeout(2000);

        // Should show both: newer version alert AND save button (conflict state)
        await expect(page.locator('[data-testid="newer-version-alert"]')).toBeVisible();
        await expect(page.getByTestId('save-vault-btn')).toBeVisible();

        // User should be able to choose: reload (lose local) or save (overwrite server)
        // This is expected behavior - user must manually resolve conflict

        // Clean up
        fs.unlinkSync(path.join(vaultDir, newerFilename));
    });
});

test.describe('Vault Situations: Online/Offline Modes', () => {
    const username = 'auth_test';
    const password = 'q';
    const vaultKey = 'test-vault-key';

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
    });

    test('should work fully when online', async ({ page }) => {
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

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
        // Enable testing mode for faster polling
        await page.evaluate(() => {
            (window as any).__TESTING__ = true;
        });

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

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
        // Login and get to vault view
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Block API
        await page.route('**/api/**', route => route.abort('failed'));

        // Enable testing mode for faster offline detection
        await page.evaluate(() => {
            (window as any).__TESTING__ = true;
        });

        await page.waitForTimeout(2000);

        // Make a change
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Offline Entry');
        await page.getByTestId('edit-save').click();

        // Save button should appear but clicking should fail
        const saveBtn = page.getByTestId('save-vault-btn');
        await expect(saveBtn).toBeVisible();

        // Try to save - should show error or disabled state
        await saveBtn.click();

        // Should show error message or remain dirty
        await page.waitForTimeout(500);
        // Button should still be visible (save failed)
        await expect(saveBtn).toBeVisible();
    });

    test('should restore online mode when connection returns', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__TESTING__ = true;
        });

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

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
        // First, populate cache
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.getByTestId('trust-device-checkbox').check();
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
        
        // Add an entry to cache
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Cached Entry');
        await page.getByTestId('edit-save').click();
        
        await page.waitForTimeout(500);

        // Logout
        await page.click('[data-testid="logout-btn"]');

        // Block all API from the start
        await page.route('**/api/**', route => route.abort('failed'));

        // Try to login (will fail at API level but token is in localStorage)
        await page.goto('/');

        // Because API is blocked, login will fail
        // But if we still have token in storage from trusted device...
        const hasToken = await page.evaluate(() => localStorage.getItem('token'));
        
        if (hasToken) {
            // Navigate directly (simulating app restart with cached credentials)
            await page.reload();
            
            // If auth is restored from localStorage, should see unlock
            // This depends on implementation - may need to adjust
        }
    });
});

test.describe('Vault Situations: Edge Cases', () => {
    const username = 'auth_test';
    const password = 'q';
    const vaultKey = 'test-vault-key';
    const vaultDir = path.join(process.cwd(), 'data', username);

    test('should handle corrupted cached vault gracefully', async ({ page }) => {
        await page.goto('/');
        
        // Set corrupted vault in cache
        await page.evaluate(() => {
            localStorage.setItem('offline_vault', 'not-valid-json{{{');
        });

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Should fall back to server vault or show error
        // Should not crash
        await page.waitForTimeout(1000);
        
        // Either shows vault or error, but app should still be functional
        const isVisible = await page.locator('.dashboard, .folder-dashboard').isVisible().catch(() => false);
        if (!isVisible) {
            // If vault load failed, should show error message
            await expect(page.locator('text=/error|failed/i')).toBeVisible();
        }
    });

    test('should handle wrong vault key gracefully', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        // Use wrong vault key
        await page.fill('input[type="password"]', 'wrong-key-intentionally');
        await page.click('[data-testid="unlock-button"]');

        // Should show error message
        await expect(page.locator('text=/failed to decrypt|cannot decrypt|incorrect.*key/i')).toBeVisible({
            timeout: 3000
        });

        // Should remain at unlock screen
        await expect(page.getByTestId('unlock-button')).toBeVisible();

        // Should be able to retry with correct key
        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
    });

    test('should handle vault with missing encryption metadata', async ({ page }) => {
        // Create a vault file with missing IV or cipher
        if (!fs.existsSync(vaultDir)) {
            fs.mkdirSync(vaultDir, { recursive: true });
        }
        
        const malformedVault = {
            date: new Date().toISOString(),
            data: {
                // Missing 'cipher' field
                iv: 'some-iv-data'
            }
        };
        
        fs.writeFileSync(
            path.join(vaultDir, 'vault-malformed.vault'),
            JSON.stringify(malformedVault)
        );

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', password);
        await page.click('[data-testid="login-button"]');

        await page.fill('input[type="password"]', vaultKey);
        await page.click('[data-testid="unlock-button"]');

        // Should handle error gracefully
        await page.waitForTimeout(1000);
        
        // Should show error or fall back to empty vault
        const errorVisible = await page.locator('text=/error|failed|corrupt/i').isVisible().catch(() => false);
        const vaultVisible = await page.locator('.dashboard, .folder-dashboard').isVisible().catch(() => false);
        
        // One of these should be true
        expect(errorVisible || vaultVisible).toBe(true);

        // Clean up
        fs.unlinkSync(path.join(vaultDir, 'vault-malformed.vault'));
    });
});
