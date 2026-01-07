import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vaultHandler from '../../../src/routes/api/vault/+server';
import * as storage from '$lib/server/storage';
import * as users from '$lib/server/users';
import * as csrf from '$lib/server/csrf';

vi.mock('$lib/server/storage', () => ({
    getLatestVault: vi.fn(),
    saveVault: vi.fn(),
}));
vi.mock('$lib/server/users', () => ({
    getUser: vi.fn(),
}));
vi.mock('$lib/server/csrf', () => ({
    validateCSRFToken: () => true,
    getSessionIdFromRequest: () => 'mock-session',
}));

// Helper to mock auth
const mockAuth = (username: string | null) => {
    if (username) {
        vi.mocked(users.getUser).mockReturnValue({ username, password: 'hash' } as any);
        return {
            headers: new Headers({
                'Authorization': 'Bearer ' + Buffer.from(`${username}:hash`).toString('base64'),
                'X-CSRF-Token': 'mock-token-should-be-at-least-32chars'
            })
        };
    }
    return { headers: new Headers() };
};

describe('API Vault', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('GET should return 401 if not authenticated', async () => {
        const request = new Request('http://localhost', { headers: new Headers() });
        const response = await vaultHandler.GET({ request } as any);
        expect(response.status).toBe(401);
    });

    it('GET should return 404 if no vault found', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', { headers });
        vi.mocked(storage.getLatestVault).mockReturnValue(null);

        const response = await vaultHandler.GET({ request } as any);
        expect(response.status).toBe(404);
    });

    it('GET should return vault content', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', { headers });
        vi.mocked(storage.getLatestVault).mockReturnValue(JSON.stringify({ data: 'encrypted' }));

        const response = await vaultHandler.GET({ request } as any);
        const data = await response.json();
        expect(data).toEqual({ data: 'encrypted' });
    });

    it('POST should return 400 if content missing', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', {
            method: 'POST',
            headers,
            body: JSON.stringify({})
        });
        const response = await vaultHandler.POST({ request } as any);
        console.log(await response.json());//DEBUG
        expect(response.status).toBe(400);
    });

    it('POST should save vault', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: '{"data":"enc"}' })
        });
        vi.mocked(storage.saveVault).mockReturnValue('new.vault');

        const response = await vaultHandler.POST({ request } as any);
        const data = await response.json();
        expect(data.filename).toBe('new.vault');
        expect(storage.saveVault).toHaveBeenCalledWith('testuser', expect.stringContaining('enc'));
    });
});
