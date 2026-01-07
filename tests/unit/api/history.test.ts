import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as historyHandler from '../../../src/routes/api/vault/history/+server';
import * as storage from '$lib/server/storage';
import * as users from '$lib/server/users';
import * as csrf from '$lib/server/csrf';

vi.mock('$lib/server/storage', () => ({
    listVaults: vi.fn(),
    deleteVault: vi.fn(),
}));
vi.mock('$lib/server/users', () => ({
    getUser: vi.fn(),
}));
vi.mock('$lib/server/csrf', () => ({
    validateCSRFToken: () => true,
    getSessionIdFromRequest: () => 'mock-session',
}));

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

describe('API History', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('GET should return list of vaults', async () => {
        const { headers } = mockAuth('testuser');
        const request = new Request('http://localhost', { headers });
        const mockVaults = [{ name: 'v1.vault', size: 100, mtime: '2023-01-01' }];
        vi.mocked(storage.listVaults).mockReturnValue(mockVaults as any);

        const response = await historyHandler.GET({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockVaults);
    });

    it('DELETE should return 403 if filename missing', async () => {
        const { headers } = mockAuth('testuser');
        // No query param
        const url = new URL('http://localhost/api/vault/history');
        const request = new Request(url, { method: 'DELETE', headers });

        const response = await historyHandler.DELETE({ request, url } as any);
        expect(response.status).toBe(400);
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
