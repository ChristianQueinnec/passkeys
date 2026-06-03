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
        vi.mocked(jwt.verifyToken).mockReturnValue({
            username,
            sid: 'mock-session-id',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 86400
        });

        vi.mocked(users.getUser).mockReturnValue({
            username,
            password: 'salt:hash'
        } as any);

        vi.mocked(csrf.validateCSRFToken).mockReturnValue(true);
        vi.mocked(csrf.getSessionIdFromRequest).mockReturnValue('mock-session-id');

        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIn0.signature';

        return {
            headers: new Headers({
                'cookie': `passkeys_auth=${mockToken}`,
                'X-CSRF-Token': 'a'.repeat(64)   // 64-char hex — matches /^[0-9a-f]{64}$/
            })
        };
    }

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
        vi.mocked(storage.listVaults).mockResolvedValue(mockVaults as any);

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

    it('DELETE should handle storage errors', async () => {
        const { headers } = mockAuth('testuser');
        const url = new URL('http://localhost/api/vault/history?filename=test.vault');
        const request = new Request(url, { method: 'DELETE', headers });

        vi.mocked(storage.deleteVault).mockRejectedValue(new Error('Storage error'));

        const response = await historyHandler.DELETE({ request, url } as any);
        expect(response.status).toBe(500);
    });

    it('DELETE should handle special characters in filename', async () => {
        const { headers } = mockAuth('testuser');
        const specialFilename = 'vault-2024-01-15T10-30-45.123Z.vault';
        const url = new URL(`http://localhost/api/vault/history?filename=${encodeURIComponent(specialFilename)}`);
        const request = new Request(url, { method: 'DELETE', headers });

        const response = await historyHandler.DELETE({ request, url } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(storage.deleteVault).toHaveBeenCalledWith('testuser', specialFilename);
    });

    it('DELETE should reject filenames without .vault extension', async () => {
        const { headers } = mockAuth('testuser');
        const url = new URL('http://localhost/api/vault/history?filename=malicious.txt');
        const request = new Request(url, { method: 'DELETE', headers });

        const response = await historyHandler.DELETE({ request, url } as any);
        expect(response.status).toBe(400);
        expect(storage.deleteVault).not.toHaveBeenCalled();
    });

    it('DELETE should handle empty filename parameter', async () => {
        const { headers } = mockAuth('testuser');
        const url = new URL('http://localhost/api/vault/history?filename=');
        const request = new Request(url, { method: 'DELETE', headers });

        const response = await historyHandler.DELETE({ request, url } as any);
        expect(response.status).toBe(400);
    });
});
