import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as historyHandler from '../../../src/routes/api/vault/history/+server';
import * as storage from '$lib/server/storage';
import * as users from '$lib/server/users';
import * as csrf from '$lib/server/csrf';
import * as jwt from '$lib/server/jwt';

vi.mock('$lib/server/storage', () => ({
    listVaults: vi.fn(),
    deleteVault: vi.fn(),
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
                'X-CSRF-Token': 'mock-csrf-token-at-least-32-chars-long'
            })
        };
    }

    // No auth
    vi.mocked(jwt.verifyToken).mockReturnValue(null);
    return { headers: new Headers() };
};

describe('API History', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('GET should return 401 if not authenticated', async () => {
        mockAuth(null);
        const request = new Request('http://localhost', { headers: new Headers() });
        const response = await historyHandler.GET({ request } as any);
        expect(response.status).toBe(401);
    });

    it('GET should return list of vaults', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', { headers });
        const mockVaults = [{
            vaults: [
                { name: 'v1.vault', size: 100, mtime: new Date('2023-01-01').toISOString(), isCiphered: true }
            ]
        }];
        vi.mocked(storage.listVaults).mockReturnValue(mockVaults as any);

        const response = await historyHandler.GET({ request } as any);
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toEqual(mockVaults);
    });

    it('DELETE should return 401 if not authenticated', async () => {
        mockAuth(null);
        const url = new URL('http://localhost/api/vault/history?filename=old.vault');
        const request = new Request(url, {
            method: 'DELETE',
            headers: new Headers()
        });
        const response = await historyHandler.DELETE({ request, url } as any);
        expect(response.status).toBe(401);
    });

    it('DELETE should return 400 if filename missing', async () => {
        const { headers } = mockAuth('testuser');
        const url = new URL('http://localhost/api/vault/history');
        const request = new Request(url, { method: 'DELETE', headers });

        const response = await historyHandler.DELETE({ request, url } as any);
        expect(response.status).toBe(400);
    });

    it('DELETE should return 403 if CSRF token invalid', async () => {
        const { headers } = mockAuth('testuser');
        vi.mocked(csrf.validateCSRFToken).mockReturnValue(false);

        const url = new URL('http://localhost/api/vault/history?filename=old.vault');
        const request = new Request(url, { method: 'DELETE', headers });

        const response = await historyHandler.DELETE({ request, url } as any);
        expect(response.status).toBe(403);
    });

    it('DELETE should delete vault', async () => {
        const { headers } = mockAuth('testuser');
        const url = new URL('http://localhost/api/vault/history?filename=old.vault');
        const request = new Request(url, { method: 'DELETE', headers });

        const response = await historyHandler.DELETE({ request, url } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(storage.deleteVault).toHaveBeenCalledWith('testuser', 'old.vault');
    });

    it('DELETE should prevent path traversal', async () => {
        const { headers } = mockAuth('testuser');
        const url = new URL('http://localhost/api/vault/history?filename=../auth.vault');
        const request = new Request(url, { method: 'DELETE', headers });

        const response = await historyHandler.DELETE({ request, url } as any);
        expect(response.status).toBe(400);
        expect(storage.deleteVault).not.toHaveBeenCalled();
    });
});
