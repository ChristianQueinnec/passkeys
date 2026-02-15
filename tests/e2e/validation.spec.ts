import { test, expect } from '@playwright/test';

test.describe('API Request Validation', () => {
    test.beforeEach(async ({ request }) => {
        await request.get('/api/test/reset-rate-limit');
    });

    test('Login validation - short password', async ({ request }) => {
        const response = await request.post('/api/login', {
            data: { username: 'testuser', password: 'short' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('Password must be between 8 and 1000 characters');
    });

    test('Login validation - invalid characters in username', async ({ request }) => {
        const response = await request.post('/api/login', {
            data: { username: 'test user!', password: 'validpassword' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('Username contains invalid characters');
    });

    test('Vault POST validation - missing content', async ({ request }) => {
        // Authenticate first
        const loginRes = await request.post('/api/login', {
            data: { username: 'auth_test', password: 'password' }
        });
        const { token, csrfToken } = await loginRes.json();

        const response = await request.post('/api/vault', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-CSRF-Token': csrfToken
            },
            data: {} // Missing content
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('Vault content must be a string');
    });

    test('Vault history DELETE validation - invalid filename', async ({ request }) => {
        // Authenticate first
        const loginRes = await request.post('/api/login', {
            data: { username: 'auth_test', password: 'password' }
        });
        const { token, csrfToken } = await loginRes.json();

        const response = await request.delete('/api/vault/history?filename=../unauthorized.vault', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-CSRF-Token': csrfToken
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('Filename contains invalid characters');
    });
});
