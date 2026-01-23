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

// Helper to mock auth with JWT
const mockAuth = (username: string | null) => {
    if (username) {
        // Mock JWT verification
        vi.mocked(jwt.verifyToken).mockReturnValue({
            username,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 86400
        });
        
        // Mock user lookup
        vi.mocked(users.getUser).mockReturnValue({ 
            username, 
            password: 'salt:hash' 
        } as any);
        
        // Mock CSRF
        vi.mocked(csrf.validateCSRFToken).mockReturnValue(true);
        vi.mocked(csrf.getSessionIdFromRequest).mockReturnValue('mock-session');
        
        // Create valid JWT token format
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIn0.signature';
        
        return {
            headers: new Headers({
                'Authorization': `Bearer ${mockToken}`,
                'X-CSRF-Token': 'mock-csrf-token-at-least-32-chars-long',
                'content-type': 'application/json',
            })
        };
    }
    
    // No auth
    vi.mocked(jwt.verifyToken).mockReturnValue(null);
    return { headers: new Headers() };
};

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

    it('POST should return 401 if not authenticated', async () => {
        mockAuth(null);
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: new Headers({ 'content-type': 'application/json' }),
            body: JSON.stringify({ content: '{"data":"enc"}' })
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
            body: JSON.stringify({ content: '{"data":"enc"}' })
        });
        const response = await vaultHandler.POST({ request } as any);
        expect(response.status).toBe(403);
    });

    it('POST should save vault', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: '{"data":"enc"}' })
        });
        vi.mocked(storage.saveVault).mockReturnValue(Promise.resolve('new.vault'));

        const response = await vaultHandler.POST({ request } as any);
        const data = await response.json();
        expect(data.filename).toBe('new.vault');
        expect(storage.saveVault).toHaveBeenCalledWith('testuser', expect.stringContaining('enc'));
    });
});
