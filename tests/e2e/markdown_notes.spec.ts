import { test, expect } from '@playwright/test';

test.describe('Markdown Notes Support', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/api/test/reset-rate-limit');
        await page.addInitScript(() => {
            (window as any).__TESTING__ = true;
        });
        
        // Login and unlock
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '0');
        await expect(page.getByTestId('login-button')).toBeVisible();

        await page.getByPlaceholder('Username').fill('q');
        await page.getByPlaceholder('Password').fill('password');
        await page.waitForTimeout(500);
        await page.getByTestId('login-button').click();

        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '1', { timeout: 10000 });
        await expect(page.getByTestId('unlock-button')).toBeVisible();
        await page.getByPlaceholder(/Master Vault Password|Mot de passe maître/).fill('password');
        await page.getByTestId('unlock-button').click();

        // Wait for Vault to be unlocked
        await expect(page.locator('.app-container')).toHaveAttribute('data-phase', '2');
        await expect(page.locator('.dashboard, .folder-dashboard')).toBeVisible();
    });

    test('should render basic markdown formatting in notes', async ({ page }) => {
        // Create entry with basic markdown
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Markdown Test Entry');
        await page.getByTestId('edit-username').fill('markdownuser');
        await page.getByTestId('edit-password').fill('secret123');
        
        const markdownText = '**Bold text** and *italic text* with `inline code`';
        await page.getByTestId('edit-notes').fill(markdownText);
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Markdown Test Entry' })
            .getByTestId('view-details-btn')
            .click();

        // Verify markdown is rendered
        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        
        // Check for rendered HTML elements
        await expect(notesSection.locator('strong')).toHaveText('Bold text');
        await expect(notesSection.locator('em')).toHaveText('italic text');
        await expect(notesSection.locator('code')).toHaveText('inline code');
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        
        // Delete the entry
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Markdown Test Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should render markdown headings in notes', async ({ page }) => {
        // Create entry with headings
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Heading Test Entry');
        
        const markdownText = '# Main Heading\n## Sub Heading\n### Small Heading\nSome content';
        await page.getByTestId('edit-notes').fill(markdownText);
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Heading Test Entry' })
            .getByTestId('view-details-btn')
            .click();

        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        
        // Check for rendered heading elements
        await expect(notesSection.locator('h1')).toHaveText('Main Heading');
        await expect(notesSection.locator('h2')).toHaveText('Sub Heading');
        await expect(notesSection.locator('h3')).toHaveText('Small Heading');
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Heading Test Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should render markdown lists in notes', async ({ page }) => {
        // Create entry with lists
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('List Test Entry');
        
        const markdownText = '- Item 1\n- Item 2\n- Item 3\n\n1. First\n2. Second\n3. Third';
        await page.getByTestId('edit-notes').fill(markdownText);
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'List Test Entry' })
            .getByTestId('view-details-btn')
            .click();

        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        
        // Check for unordered list
        const ul = notesSection.locator('ul');
        await expect(ul).toBeVisible();
        await expect(ul.locator('li')).toHaveCount(3);
        await expect(ul.locator('li').nth(0)).toHaveText('Item 1');
        await expect(ul.locator('li').nth(1)).toHaveText('Item 2');
        await expect(ul.locator('li').nth(2)).toHaveText('Item 3');
        
        // Check for ordered list
        const ol = notesSection.locator('ol');
        await expect(ol).toBeVisible();
        await expect(ol.locator('li')).toHaveCount(3);
        await expect(ol.locator('li').nth(0)).toHaveText('First');
        await expect(ol.locator('li').nth(1)).toHaveText('Second');
        await expect(ol.locator('li').nth(2)).toHaveText('Third');
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'List Test Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should render markdown links in notes', async ({ page }) => {
        // Create entry with links
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Link Test Entry');
        
        const markdownText = 'Visit [Example](https://example.com) for more info';
        await page.getByTestId('edit-notes').fill(markdownText);
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Link Test Entry' })
            .getByTestId('view-details-btn')
            .click();

        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        
        // Check for rendered link
        const link = notesSection.locator('a');
        await expect(link).toBeVisible();
        await expect(link).toHaveText('Example');
        await expect(link).toHaveAttribute('href', 'https://example.com');
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Link Test Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should render markdown code blocks in notes', async ({ page }) => {
        // Create entry with code block
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Code Block Test Entry');
        
        const markdownText = 'Sample code:\n\n```\nfunction hello() {\n  console.log("Hello");\n}\n```';
        await page.getByTestId('edit-notes').fill(markdownText);
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Code Block Test Entry' })
            .getByTestId('view-details-btn')
            .click();

        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        
        // Check for rendered code block (pre tag)
        const pre = notesSection.locator('pre');
        await expect(pre).toBeVisible();
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Code Block Test Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should handle mixed markdown formatting', async ({ page }) => {
        // Create entry with complex mixed markdown
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Complex Markdown Entry');
        
        const markdownText = `# Account Details
        
## Important Notes
- Password changes **monthly**
- Use *two-factor* authentication
- Backup codes: \`ABC123\`, \`DEF456\`

## Recovery Info
1. Security question: First pet's name
2. Phone: +1-555-1234
3. Email: [recovery@example.com](mailto:recovery@example.com)

Remember to update the password before the end of the month!`;
        
        await page.getByTestId('edit-notes').fill(markdownText);
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Complex Markdown Entry' })
            .getByTestId('view-details-btn')
            .click();

        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        
        // Verify various elements are rendered
        await expect(notesSection.locator('h1')).toHaveText('Account Details');
        await expect(notesSection.locator('h2').first()).toHaveText('Important Notes');
        await expect(notesSection.locator('ul')).toBeVisible();
        await expect(notesSection.locator('ol')).toBeVisible();
        await expect(notesSection.locator('strong')).toContainText('monthly');
        await expect(notesSection.locator('em')).toContainText('two-factor');
        await expect(notesSection.locator('code').filter({hasText: 'ABC123'})).toBeVisible();
        await expect(notesSection.locator('a')).toBeVisible();
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Complex Markdown Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should sanitize potentially dangerous HTML/scripts in notes', async ({ page }) => {
        // Create entry with potentially dangerous content
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('XSS Test Entry');
        
        // Attempt to inject script
        const dangerousText = '<script>alert("XSS")</script>\n<img src=x onerror="alert(\'XSS\')">\nSafe text **here**';
        await page.getByTestId('edit-notes').fill(dangerousText);
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'XSS Test Entry' })
            .getByTestId('view-details-btn')
            .click();

        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        
        // Verify script tags are removed/sanitized
        const scriptTags = notesSection.locator('script');
        await expect(scriptTags).toHaveCount(0);
        
        // Verify dangerous attributes are removed
        const images = notesSection.locator('img');
        const imageCount = await images.count();
        for (let i = 0; i < imageCount; i++) {
            await expect(images.nth(i)).not.toHaveAttribute('onerror');
        }
        
        // Verify safe markdown still works
        await expect(notesSection.locator('strong')).toContainText('here');
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'XSS Test Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should preserve markdown in notes when editing entry', async ({ page }) => {
        // Create entry with markdown
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Edit Preservation Test');
        
        const originalMarkdown = '# Title\n- Item 1\n- Item 2\n**Bold text**';
        await page.getByTestId('edit-notes').fill(originalMarkdown);
        await page.getByTestId('edit-save').click();

        // Edit the entry
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Edit Preservation Test' })
            .getByTestId('view-details-btn')
            .click();
        await page.getByTestId('details-edit').click();
        
        // Verify markdown is preserved in the editor
        const notesTextarea = page.getByTestId('edit-notes');
        await expect(notesTextarea).toHaveValue(originalMarkdown);
        
        // Modify the entry (but not the notes)
        await page.getByTestId('edit-username').fill('testuser');
        await page.getByTestId('edit-save').click();
        
        // Verify markdown still renders correctly
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Edit Preservation Test' })
            .getByTestId('view-details-btn')
            .click();
        
        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection.locator('h1')).toHaveText('Title');
        await expect(notesSection.locator('ul li')).toHaveCount(2);
        await expect(notesSection.locator('strong')).toHaveText('Bold text');
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Edit Preservation Test' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should handle empty notes gracefully', async ({ page }) => {
        // Create entry without notes
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Empty Notes Entry');
        await page.getByTestId('edit-username').fill('user');
        // Leave notes empty
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Empty Notes Entry' })
            .getByTestId('view-details-btn')
            .click();

        // Verify notes section exists but is empty
        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        await expect(notesSection).toBeEmpty();
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Empty Notes Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });

    test('should handle plain text notes without markdown', async ({ page }) => {
        // Create entry with plain text
        await page.getByTestId('new-entry-btn').click();
        await page.getByTestId('edit-title').fill('Plain Text Entry');
        
        const plainText = 'This is just plain text without any markdown formatting.';
        await page.getByTestId('edit-notes').fill(plainText);
        await page.getByTestId('edit-save').click();

        // Open details modal
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Plain Text Entry' })
            .getByTestId('view-details-btn')
            .click();

        const notesSection = page.locator('.markdown-notes');
        await expect(notesSection).toBeVisible();
        
        // Verify text is displayed (wrapped in p tag by markdown parser)
        await expect(notesSection).toContainText(plainText);
        
        // Close modal and clean up
        await page.locator('div.modal-header button.close').click();
        await page.locator('[data-testid="vault-item"]')
            .filter({ hasText: 'Plain Text Entry' })
            .getByTestId('view-details-btn')
            .click();
        page.on('dialog', dialog => dialog.accept());
        await page.getByTestId('details-delete').click();
    });
});
