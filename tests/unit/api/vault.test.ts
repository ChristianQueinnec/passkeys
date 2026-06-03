import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vaultHandler from '../../../src/routes/api/vault/+server';
import * as storage from '$lib/server/storage';
import * as users from '$lib/server/users';
import * as csrf from '$lib/server/csrf';
import * as jwt from '$lib/server/jwt';

vi.mock('$lib/server/storage', () => ({
    getLatestVault: vi.fn(),
    saveVault: vi.fn(),
}));
vi.mock('$lib/server/users', () => ({
    getUser: vi.fn(),
}));
vi.mock('$lib/server/csrf', () => ({
    validateCSRFToken: vi.fn(),
    getSessionIdFromRequest: vi.fn(),
}));
vi.mock('$lib/server/jwt', () => ({
    verifyToken: vi.fn(),
}));

const mockAuth = (username: string | null) => {
    if (username) {
        vi.mocked(jwt.verifyToken).mockReturnValue({
            username,
            sid: 'mock-session-id',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 86400
        });
        vi.mocked(users.getUser).mockReturnValue({ username, password: 'salt:hash' } as any);
        vi.mocked(csrf.validateCSRFToken).mockReturnValue(true);
        vi.mocked(csrf.getSessionIdFromRequest).mockReturnValue('mock-session-id');
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIn0.signature';
        return {
            headers: new Headers({
                'cookie': `passkeys_auth=${mockToken}`,
                'X-CSRF-Token': 'a'.repeat(64),   // valid 64-char hex CSRF token
                'content-type': 'application/json',
            })
        };
    }
    vi.mocked(jwt.verifyToken).mockReturnValue(null);
    return { headers: new Headers() };
};

// A vault body that passes sanitizeVaultContent — shape 1: { iv, cipher }
const VALID_VAULT = JSON.stringify({ iv: 'abc123', cipher: 'encrypteddata' });

describe('API Vault', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('GET should return 401 if not authenticated', async () => {
        mockAuth(null);
        const request = new Request('http://localhost', { headers: new Headers() });
        const response = await vaultHandler.GET({ request } as any);
        expect(response.status).toBe(401);
    });

    it('GET should return 404 if no vault found', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', { headers });
        vi.mocked(storage.getLatestVault).mockResolvedValue(null);

        const response = await vaultHandler.GET({ request } as any);
        expect(response.status).toBe(404);
    });

    it('GET should return vault content', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', { headers });
        vi.mocked(storage.getLatestVault).mockResolvedValue(JSON.stringify({ data: 'encrypted' }));

        const response = await vaultHandler.GET({ request } as any);
        const data = await response.json();
        expect(data).toEqual({ data: 'encrypted' });
    });

    it('POST should return 401 if not authenticated', async () => {
        mockAuth(null);
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: new Headers({ 'content-type': 'application/json' }),
            body: JSON.stringify({ content: VALID_VAULT })
        });
        const response = await vaultHandler.POST({ request } as any);
        expect(response.status).toBe(401);
    });

    it('POST should return 400 if content missing', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', {
            method: 'POST',
            headers,
            body: '{}'
        });
        const response = await vaultHandler.POST({ request } as any);
        expect(response.status).toBe(400);
    });

    it('POST should return 403 if CSRF token invalid', async () => {
        const { headers } = mockAuth('testuser');
        vi.mocked(csrf.validateCSRFToken).mockReturnValue(false);
        const request = new Request('http://localhost', {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: VALID_VAULT })
        });
        const response = await vaultHandler.POST({ request } as any);
        expect(response.status).toBe(403);
    });

    it('POST should save vault', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: VALID_VAULT })
        });
        vi.mocked(storage.saveVault).mockResolvedValue('new.vault');

        const response = await vaultHandler.POST({ request } as any);
        const data = await response.json();
        expect(data.filename).toBe('new.vault');
        expect(storage.saveVault).toHaveBeenCalledWith('testuser', VALID_VAULT);
    });
});
