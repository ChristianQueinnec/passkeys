import { test, expect } from '@playwright/test';

test.describe('Vault Operations', () => {
    test.beforeEach(async ({ page }) => {
        // Login and unlock
        await page.goto('/');
        await page.getByPlaceholder('Username').fill('q');
        await page.getByPlaceholder('Password').fill('q');
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.getByRole('heading', { name: 'Unlock Vault' })).toBeVisible();
        await page.getByPlaceholder('Vault Password').fill('q'); // Assuming master password matches for MVP demo
        // Wait for unlock button to be enabled (loading state)
        // Note: Unlock might be fast, but robustness is good
        await page.getByRole('button', { name: 'Unlock' }).click();

        // Wait for Dashboard
        await expect(page.locator('.dashboard')).toBeVisible();
    });

    test('should create, edit and delete a vault entry', async ({ page }) => {
        // Create
        await page.getByRole('button', { name: '+ New Entry' }).click();
        await expect(page.getByRole('heading', { name: 'New Item' })).toBeVisible();

        await page.getByLabel('Title').fill('Test Site');
        await page.getByLabel('Username').fill('testuser');
        await page.getByLabel('Password').fill('secret123');
        await page.getByLabel('Site URL').fill('https://example.com');

        // Scope to editor to avoid ambiguity with "Save Vault"
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        // Verify in list
        await expect(page.getByText('Test Site')).toBeVisible();

        // Edit
        await page.getByText('Test Site').click();
        await page.getByRole('button', { name: 'Edit' }).click();
        await page.getByLabel('Title').fill('Updated Site');
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        // Verify update
        await expect(page.getByText('Updated Site')).toBeVisible();
        await expect(page.getByText('Test Site')).not.toBeVisible();

        // Delete
        await page.getByText('Updated Site').click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Delete' }).click();

        // Verify deletion
        await expect(page.getByText('Updated Site')).not.toBeVisible();
    });
});
