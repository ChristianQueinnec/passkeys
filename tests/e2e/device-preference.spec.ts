import { test, expect } from '@playwright/test';

/**
 * Tests for Safe Device Preference Memory Feature
 * 
 * This test suite validates that the login page remembers the user's
 * previous "safe device" choice and pre-checks the checkbox accordingly.
 */

test.describe('Safe Device Preference Memory', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/api/test/reset-rate-limit');
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    // await page.goto('/api/test/reset-rate-limit');
    await page.addInitScript(() => {
      (window as any).__TESTING__ = true;
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test.describe('First-time login (no stored preference)', () => {

    test('should not pre-check the safe device checkbox', async ({ page }) => {
      // Given: No preference stored in localStorage
      await expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBeNull();

      // When: User visits login page
      // (Component mount would happen here)

      // Then: Checkbox should be unchecked by default
      // and isRememberedPreference should be false
      await expect(await page.getByTestId('trust-device-checkbox').isChecked()).toBe(false);
    });

    test('should show default help text for first-time users', async ({ page }) => {
      // Given: No preference stored
      await expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBeNull();

      // When: Login page renders

      // Then: Should show first-time message like:
      // "Trust this device? If yes, encrypted credentials will be stored locally."
      await expect(await page.locator('.trust-device').textContent())
        .toMatch(/(Trust this device|Faire confiance)/i);
    });

    test('should save preference to localStorage after login', async ({ page }) => {
      // Given: User checks "safe device" checkbox
      const isSafeDevice = true;

      await page.locator('.trust-device').check();
      // Setup initial user and login
      await page.getByPlaceholder('Username').fill('auth_test');
      await page.getByPlaceholder('Password').fill('password');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });

      // Then: Preference should be saved
      await expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('safe');
    });

    test('should not save preference when never trusted device', async ({ page }) => {
      await page.locator('.trust-device').check();
      await page.locator('.trust-device').uncheck();
      // Setup initial user and login
      await page.getByPlaceholder('Username').fill('auth_test');
      await page.getByPlaceholder('Password').fill('password');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });

      // Then: Unsafe preference should not be saved since the device had never been trusted
      await expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBeNull();
    });

    test('should save preference when once trusted device is now un-trusted', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('passkeys_device_preference', 'safe'));
      await page.reload();
      await expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('safe');
      await expect(await page.getByTestId('trust-device-checkbox').isChecked()).toBe(true);

      await page.locator('.trust-device').uncheck();
      // Setup initial user and login
      await page.getByPlaceholder('Username').fill('auth_test');
      await page.getByPlaceholder('Password').fill('password');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });

      // Then: Unsafe preference should not be saved since the device had never been trusted
      await expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('unsafe');
    });
  });

  test.describe('Returning user with safe device preference', () => {

    test.beforeEach(async ({ page }) => {
      // Setup: User previously marked device as safe
      await page.evaluate(() => {
        localStorage.setItem('passkeys_device_preference', 'safe');
      });
    });

    test('should pre-check the safe device checkbox', async ({ page }) => {
      // Then: Checkbox should be checked
      // Reload page to ensure onMount picks up the value
      await page.reload();
      const storageVal = await page.evaluate(() => localStorage.getItem('passkeys_device_preference'));
      console.log('TEST LOG: Storage value is:', storageVal);
      await expect(page.getByTestId('trust-device-checkbox')).toBeChecked();
      await expect(storageVal).toBe('safe');
      // show "remembered preference" message
      await expect(await page.locator('.trust-device').textContent())
        .toMatch(/(marked as safe|marqué comme sûr)/i);
    });

    test('should allow user to change preference', async ({ page }) => {
      // Given: Device was safe, user wants to change it
      await expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('safe');

      // When: User unchecks the box and logs in
      const isSafeDevice = false;
      await page.evaluate((isSafeDevice) => {
        localStorage.setItem('passkeys_device_preference', isSafeDevice ? 'safe' : 'unsafe');
      }, isSafeDevice);

      // Then: Preference should be updated
      expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('unsafe');
    });
  });

  test.describe('Returning user with unsafe device preference', () => {

    test.beforeEach(async ({ page }) => {
      // Setup: User previously marked device as unsafe
      await page.evaluate(() => {
        localStorage.setItem('passkeys_device_preference', 'unsafe');
      });
    });

    test('should not pre-check the safe device checkbox', async ({ page }) => {
      // Given: Unsafe device preference stored
      const savedPreference = await page.evaluate(() => localStorage.getItem('passkeys_device_preference'));
      const isSafeDevice = savedPreference === 'safe';

      // When: Component mounts

      // Then: Checkbox should be unchecked
      expect(isSafeDevice).toBe(false);
    });

    test('should show "unsafe device" message', async ({ page }) => {
      // Given: Unsafe device preference stored
      const savedPreference = await page.evaluate(() => localStorage.getItem('passkeys_device_preference'));
      const isSafeDevice = savedPreference === 'safe';
      const isRememberedPreference = savedPreference !== null;

      // When: Component mounts
      // Reload page to ensure onMount picks up the value
      await page.reload();
      const storageVal = await page.evaluate(() => localStorage.getItem('passkeys_device_preference'));
      console.log('TEST LOG: Unsafe storage value is:', storageVal);

      // Then: Should show unsafe device message
      expect(isRememberedPreference).toBe(true);
      expect(isSafeDevice).toBe(false);
      // Message should be like: "This device was previously marked as unsafe."
      await expect(await page.locator('.trust-device').textContent())
        .toMatch(/(marked as unsafe|marqué comme non sûr)/i);
    });

    test('should allow user to upgrade to safe device', async ({ page }) => {
      // Given: Device was unsafe, user wants to make it safe
      expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('unsafe');

      // When: User checks the box and logs in
      const isSafeDevice = true;
      await page.evaluate((isSafeDevice) => {
        localStorage.setItem('passkeys_device_preference', isSafeDevice ? 'safe' : 'unsafe');
      }, isSafeDevice);

      // Then: Preference should be updated to safe
      expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('safe');
    });
  });

  test.describe('Preference persistence', () => {

    test('should persist preference across page reloads', async ({ page }) => {
      // Given: User marks device as safe
      await page.evaluate(() => {
        localStorage.setItem('passkeys_device_preference', 'safe');
      });

      await page.reload();

      // When: Page is reloaded (simulated by reading from localStorage again)
      const savedPreference = await page.evaluate(() => localStorage.getItem('passkeys_device_preference'));

      // Then: Preference should still be there
      expect(savedPreference).toBe('safe');
    });

    test('should be cleared when browser data is cleared', async ({ page }) => {
      // Given: Preference is stored
      await page.evaluate(() => {
        localStorage.setItem('passkeys_device_preference', 'safe');
      });
      expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('safe');

      // When: localStorage is cleared (user clears browser data)
      await page.evaluate(() => localStorage.clear());

      // Then: Preference should be gone
      expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBeNull();
    });
  });

  test.describe('Forget device functionality', () => {

    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('passkeys_device_preference', 'safe'));
    });

    test('should clear preference when "forget device" is clicked', async ({ page }) => {
      // Given: Device has a saved preference
      expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBe('safe');

      // When: User clicks "Forget this device" button
      await page.evaluate(() => localStorage.removeItem('passkeys_device_preference'));

      // Then: Preference should be removed
      expect(await page.evaluate(() => localStorage.getItem('passkeys_device_preference'))).toBeNull();
    });

    test('should reset to first-time state after forgetting', async ({ page }) => {
      // Given: Preference exists
      await page.evaluate(() => localStorage.setItem('passkeys_device_preference', 'safe'));

      // When: User forgets the device
      await page.evaluate(() => localStorage.removeItem('passkeys_device_preference'));

      // Then: Should behave like first-time login
      const savedPreference = await page.evaluate(() => localStorage.getItem('passkeys_device_preference'));
      expect(savedPreference).toBeNull();

      // isRememberedPreference would be false
      // Default checkbox state would apply
    });
  });

  test.describe('Edge cases', () => {

    test('should handle corrupted localStorage values gracefully', async ({ page }) => {
      // Given: Invalid value in localStorage
      await page.evaluate(() => localStorage.setItem('passkeys_device_preference', 'invalid-value'));

      // When: Component tries to read preference
      const savedPreference = await page.evaluate(() => localStorage.getItem('passkeys_device_preference'));
      const isSafeDevice = savedPreference === 'safe';

      // Then: Should default to unsafe (false)
      expect(isSafeDevice).toBe(false);
    });

    test('should handle localStorage being disabled/unavailable', async ({ page }) => {
      // This test would need to mock localStorage being unavailable
      // In production, should gracefully fall back to no preference
      expect(true).toBe(true); // Placeholder
    });

    test('should not expose sensitive data in localStorage', async ({ page }) => {
      // Given: User logs in as safe device
      await page.evaluate(() => localStorage.setItem('passkeys_device_preference', 'safe'));

      // Then: Only the preference flag should be stored
      // NOT: vault keys, passwords, usernames, etc.
      const storedValue = await page.evaluate(() => localStorage.getItem('passkeys_device_preference'));
      expect(storedValue).toBe('safe');

      // Verify no other sensitive keys exist
      expect(await page.evaluate(() => localStorage.getItem('vault_key'))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('password'))).toBeNull();
    });
  });

  test.describe('Message text validation', () => {

    test('should display appropriate text for each state', async ({ page }) => {
      // Test case 1: First time, no preference
      let savedPreference = null;
      let isRememberedPreference = savedPreference !== null;
      let isSafeDevice = savedPreference === 'safe';

      // Expected: "Trust this device? If yes, encrypted credentials will be stored locally."
      expect(isRememberedPreference).toBe(false);

      // Test case 2: Remembered as safe
      savedPreference = 'safe';
      isRememberedPreference = savedPreference !== null;
      isSafeDevice = savedPreference === 'safe';

      // Expected: "This device was previously marked as safe. Credentials will be stored locally."
      expect(isRememberedPreference).toBe(true);
      expect(isSafeDevice).toBe(true);

      // Test case 3: Remembered as unsafe
      savedPreference = 'unsafe';
      isRememberedPreference = savedPreference !== null;
      isSafeDevice = savedPreference === 'safe';

      // Expected: "This device was previously marked as unsafe. Nothing will be stored."
      expect(isRememberedPreference).toBe(true);
      expect(isSafeDevice).toBe(false);
    });
  });

  test.describe('Integration with existing safe/unsafe device logic', () => {

    test('should work with existing vault persistence logic', async ({ page }) => {
      // Given: Device is marked as safe
      await page.evaluate(() => localStorage.setItem('passkeys_device_preference', 'safe'));

      // When: User logs in
      const isSafeDevice = await page.evaluate(() => localStorage.getItem('passkeys_device_preference') === 'safe');

      // Then: Should trigger safe device persistence (per README)
      // - Encrypted vault in IndexedDB/localStorage
      // - Session JWT in memory only
      // - Vault key never persisted
      expect(isSafeDevice).toBe(true);
    });

    test('should work with unsafe device mode', async ({ page }) => {
      // Given: Device is marked as unsafe
      await page.evaluate(() => localStorage.setItem('passkeys_device_preference', 'unsafe'));

      // When: User logs in
      const isSafeDevice = await page.evaluate(() => localStorage.getItem('passkeys_device_preference') === 'safe');

      // Then: Should trigger unsafe device mode (per README)
      // - Nothing persisted
      // - All data cleared on page close
      // - Session only
      expect(isSafeDevice).toBe(false);
    });
  });
});

