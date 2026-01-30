import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
        await expect(page.getByTestId('app-title')).toBeVisible();
        await expect(page.getByTestId('login-button')).toBeVisible();
    });

    test('should show login screen initially', async ({ page }) => {
        await expect(page.getByTestId('login-button')).toBeVisible();
    });

    test('should fail login with invalid credentials', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('wronguser');
        await page.getByPlaceholder('Password').fill('wrongpass');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        const error = page.locator('.error');
        await expect(error).toBeVisible();
    });

    test('should login successfully and manage session', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('auth_test');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await expect(page.getByTestId('unlock-button')).toBeVisible();

        await expect(page.locator('.user-name')).toHaveText('auth_test');

        await page.locator('.user-btn').click();
        await page.getByTestId('menu-logout').click();

        await expect(page.getByTestId('login-button')).toBeVisible();
    });

    test('should change login password successfully', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('pass_change_test');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('password');
        await page.getByTestId('unlock-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Open user menu
        await page.locator('.user-btn').click();
        await expect(page.getByTestId('menu-change-password')).toBeVisible();
        
        // Click change password
        await page.getByTestId('menu-change-password').click();
        
        // Wait for modal to be visible
        await expect(page.locator('.modal-content')).toBeVisible({ timeout: 5000 });

        // First password change: password → newpassword
        await page.getByTestId('cp-old').fill('password');
        await page.getByTestId('cp-new').fill('newpassword');
        await page.getByTestId('cp-confirm').fill('newpassword');
        await page.getByTestId('cp-submit').click();

        await expect(page.getByText(/your (login|master) password has been updated successfully|Votre mot de passe de connexion a été mis à jour avec succès/i)).toBeVisible({ timeout: 5000 });

        // Wait for success message to be visible before continuing
        await page.waitForTimeout(1000);

        // Second password change: newpassword → password (restore)
        await page.getByTestId('cp-old').fill('newpassword');
        await page.getByTestId('cp-new').fill('password');
        await page.getByTestId('cp-confirm').fill('password');
        await page.getByTestId('cp-submit').click();
        
        await expect(page.getByText(/your (login|master) password has been updated successfully|Votre mot de passe de connexion a été mis à jour avec succès/i)).toBeVisible({ timeout: 5000 });
    });

    test('should validate password confirmation matches', async ({ page }) => {
        await page.getByPlaceholder('Username').fill('pass_change_test');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('password');
        await page.getByTestId('unlock-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();

        // Open user menu and wait for it to be visible
        await page.locator('.user-btn').click();
        await expect(page.getByTestId('menu-change-password')).toBeVisible();
        
        // Click change password
        await page.getByTestId('menu-change-password').click();

        // Wait for modal to be visible
        await expect(page.locator('.modal-content')).toBeVisible({ timeout: 5000 });
        
        // Get all elements upfront
        const oldInput = page.getByTestId('cp-old');
        const newInput = page.getByTestId('cp-new');
        const confirmInput = page.getByTestId('cp-confirm');
        const submitButton = page.getByTestId('cp-submit');

        // Test 1: passwords don't match
        // Fill form with mismatched passwords
        await oldInput.click();
        await oldInput.fill('password');
        await newInput.click();
        await newInput.fill('newpassword');
        await confirmInput.click();
        await confirmInput.fill('differentpassword');
        
        // Small wait for state to settle
        await page.waitForTimeout(300);
        
        //Click submit
        await submitButton.click();
        
        // Wait a bit longer for the error to render
        await page.waitForTimeout(1000);
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-before-error-check.png', fullPage: true });

        // Check if error appears
        const errorElement = page.locator('.change-password-form .error');
        const errorCount = await errorElement.count();
        
        if (errorCount === 0) {
            // No error element found, let's check the whole page
            const pageContent = await page.content();
            console.log('Page HTML:', pageContent);
            await page.screenshot({ path: 'test-error-not-found.png', fullPage: true });
            throw new Error('Error element not found in DOM');
        }
        
        await expect(errorElement).toBeVisible({ timeout: 5000 });
        await expect(errorElement).toContainText(/passwords do not match|Les mots de passe ne correspondent pas/i);

        // Clear field to trigger auto-clear
        await newInput.fill('');
        await page.waitForTimeout(300);
        await expect(errorElement).not.toBeVisible();

        // Test 2: empty password
        await oldInput.fill('password');
        await newInput.fill('');
        await confirmInput.fill('');
        await page.waitForTimeout(300);
        
        await submitButton.click();
        await page.waitForTimeout(1000);

        const emptyErrorElement = page.locator('.change-password-form .error');
        await expect(emptyErrorElement).toBeVisible({ timeout: 5000 });
        await expect(emptyErrorElement).toContainText(/new password cannot be empty|Le nouveau mot de passe ne peut pas être vide/i);
    });
});
