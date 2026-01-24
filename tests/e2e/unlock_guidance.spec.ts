import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

type User = {
    username: string;
    password: string;
};



test.describe('Unlock Guidance Message', () => {
    const adminUser = 'admin';
    const newUser = 'unlock_test_new';

    test.beforeAll(async () => {
        const usersFile = path.join(process.cwd(), 'data', 'users.json');
        if (fs.existsSync(usersFile)) {
            const users: User[] = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
            if (!users.find(u => u.username === 'no_vault_user')) {
                users.push({ username: 'no_vault_user', password: 'password' });
                fs.writeFileSync(usersFile, JSON.stringify(users));
            }
        }
    });

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
        await page.waitForLoadState('networkidle');
    });

    test('should show "vault exists" message for admin', async ({ page }) => {
        await page.fill('input[placeholder="Username"]', 'admin');
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();

        const notice = page.locator('.unlock-notice');
        await expect(notice).toBeVisible();
        await expect(notice).toContainText(/vault exists|coffre est présent/);
        await expect(notice).toHaveClass(/exists/);
    });

    test('should show "no vault" message for a user without vault', async ({ page }) => {
        await page.fill('input[placeholder="Username"]', 'no_vault_user');
        await page.fill('input[type="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        await expect(page.getByTestId('unlock-button')).toBeVisible();

        const notice = page.locator('.unlock-notice');
        await expect(notice).toBeVisible();
        await expect(notice).toContainText(/no vault|pas encore de coffre/);
        await expect(notice).not.toHaveClass(/exists/);
    });
});
