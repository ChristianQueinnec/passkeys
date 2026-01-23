import { test, expect } from '@playwright/test';

test.describe('Markdown Notes', () => {
    test.beforeEach(async ({ page }) => {
        // Reset rate limit
        await page.goto('/api/test/reset-rate-limit');
        // Cleanup vault for test user
        await page.goto('/api/test/cleanup-vault?username=admin');

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

    test('should render markdown notes and protect against XSS', async ({ page }) => {
        // 1. Login
        await page.fill('[data-testid="username-input"]', 'admin');
        await page.fill('[data-testid="password-input"]', 'password');
        await page.click('[data-testid="login-button"]');

        // 2. Unlock/Create Vault
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await page.fill('[data-testid="password-input"]', 'vault-password');
        await page.click('[data-testid="unlock-button"]');

        // 3. Create new entry with markdown
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2', { timeout: 10000 });
        await page.locator('[data-testid="new-entry-btn"]').click();
        await page.locator('[data-testid="edit-title"]').fill('Markdown Entry');

        const markdownContent = '# Header 1\n**Bold** and *Italic*\n- Item 1\n`code`\n<script>window.xss_triggered = true;</script>';
        await page.locator('[data-testid="edit-notes"]').fill(markdownContent);
        await page.locator('[data-testid="edit-save"]').click();

        // 4. Open details and verify rendering
        const entry = page.locator('.list-item', { hasText: 'Markdown Entry' });
        await entry.locator('[data-testid="view-details-btn"]').click();

        const notesContainer = page.locator('.markdown-notes');
        await expect(notesContainer).toBeVisible();

        // Verify H1
        await expect(notesContainer.locator('h1')).toHaveText('Header 1');
        // Verify Bold
        await expect(notesContainer.locator('strong')).toHaveText('Bold');
        // Verify List
        await expect(notesContainer.locator('ul li')).toHaveText('Item 1');
        // Verify Code
        await expect(notesContainer.locator('code')).toHaveText('code');

        // 5. Verify XSS protection
        const xssCheck = await page.evaluate(() => (window as any).xss_triggered);
        expect(xssCheck).toBeUndefined();
        await expect(notesContainer.locator('script')).toHaveCount(0);
    });
});
