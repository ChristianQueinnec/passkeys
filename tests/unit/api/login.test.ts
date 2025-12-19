import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as loginHandler from '../../../src/routes/api/login/+server';
import * as users from '$lib/server/users';
import * as cryptoUtils from '$lib/server/crypto-utils';

vi.mock('$lib/server/users', () => ({
    getUser: vi.fn(),
}));
vi.mock('$lib/server/crypto-utils', () => ({
    verifyPassword: vi.fn(),
}));

describe('API Login', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return 400 if password missing', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ username: 'test' }), // Missing password
        });
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Username and password required');
    });

    it('should return 400 if username  missing', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ password: 'test' }), // Missing username
        });
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Username and password required');
    });

    it('should return 401 if user not found', async () => {
        vi.mocked(users.getUser).mockReturnValue(undefined);
        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ username: 'unknown', password: 'password' }),
        });
        const response = await loginHandler.POST({ request } as any);

        expect(response.status).toBe(401);
    });

    it('should return 401 if password invalid', async () => {
        vi.mocked(users.getUser).mockReturnValue({ username: 'test', password: 'hash' } as any);
        vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(false);

        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ username: 'test', password: 'wrong' }),
        });
        const response = await loginHandler.POST({ request } as any);

        expect(response.status).toBe(401);
    });

    it('should return token on success', async () => {
        vi.mocked(users.getUser).mockReturnValue({ username: 'test', password: 'hash' } as any);
        vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(true);

        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ username: 'test', password: 'correct' }),
        });
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.token).toBeDefined();
        expect(data.username).toBe('test');
    });
});
