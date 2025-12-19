import { test, expect } from '@playwright/test';

test.describe('Filter Operations', () => {
    test.beforeEach(async ({ page }) => {
        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '0');

        await page.getByPlaceholder('Username').fill('q');
        await page.getByPlaceholder('Password').fill('q');
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.getByPlaceholder('Vault Password').fill('q');
        await page.getByTestId('unlock-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
    });

    test('should filter entries and reset filter', async ({ page }) => {
        // Create two entries
        await page.getByRole('button', { name: '+ New Entry' }).click();
        await page.getByLabel('Title *').fill('UniqueItem');
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        await page.getByRole('button', { name: '+ New Entry' }).click();
        await page.getByLabel('Title *').fill('AnotherItem');
        await page.locator('.editor').getByRole('button', { name: 'Save', exact: true }).click();

        // Check both visible
        await expect(page.getByText('UniqueItem')).toBeVisible();
        await expect(page.getByText('AnotherItem')).toBeVisible();

        // Filter
        const filterInput = page.getByTestId('filter-input');
        await filterInput.fill('Unique');

        await expect(page.getByText('UniqueItem')).toBeVisible();
        await expect(page.getByText('AnotherItem')).not.toBeVisible();

        // Reset filter
        const resetBtn = page.getByRole('button', { name: 'Reset filter' });
        await expect(resetBtn).toBeVisible();
        await resetBtn.click();

        // Check reset
        await expect(filterInput).toHaveValue('');
        await expect(page.getByText('UniqueItem')).toBeVisible();
        await expect(page.getByText('AnotherItem')).toBeVisible();
        await expect(resetBtn).not.toBeVisible();
    });
});
