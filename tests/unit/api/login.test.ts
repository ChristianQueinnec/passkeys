import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/rate-limiter', () => ({
    isBlocked: vi.fn().mockReturnValue(false),
    recordFailure: vi.fn(),
    recordSuccess: vi.fn(),
    getDelay: vi.fn().mockReturnValue(0),
}));

vi.mock('$lib/server/users', () => ({
    getUser: vi.fn(),
}));
vi.mock('$lib/server/crypto-utils', () => ({
    verifyPassword: vi.fn(),
}));
vi.mock('$lib/server/jwt', () => ({
    generateToken: vi.fn(),
}));
vi.mock('$lib/server/csrf', () => ({
    generateCSRFToken: vi.fn().mockReturnValue('mock-csrf-token'),
}));

import * as loginHandler from '../../../src/routes/api/login/+server';
import * as users from '$lib/server/users';
import * as cryptoUtils from '$lib/server/crypto-utils';
import * as jwt from '$lib/server/jwt';
import * as rateLimiter from '$lib/server/rate-limiter';
import * as csrf from '$lib/server/csrf';

describe('API Login', () => {
    const cookies = {
        set: vi.fn()
    };

    beforeEach(() => {
        vi.resetAllMocks();
        cookies.set.mockClear();
    });

    function makeHeaders() {
        return new Headers({
            'Content-Type': 'application/json'
        });
    }

    function makeEvent(request: Request) {
        return {
            request,
            getClientAddress: () => '127.0.0.1',
            cookies
        } as any;
    }

    it('should return 400 if password missing', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'test' }),
        });
        const response = await loginHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Field "password": Password must be a string');
    });

    it('should return 400 if username missing', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ password: 'test' }),
        });
        const response = await loginHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Field "username": Username must be a string');
    });

    it('should return 401 if user not found', async () => {
        vi.mocked(users.getUser).mockReturnValue(undefined);
        vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(false);

        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'unknown', password: 'password123' }),
        });
        const response = await loginHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('auth.invalid_credentials');
    });

    it('should return 401 if password invalid', async () => {
        vi.mocked(users.getUser).mockReturnValue({
            username: 'test',
            password: 'salt123:hash456'
        } as any);
        vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(false);

        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'test', password: 'wrongpass123' }),
        });
        const response = await loginHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('auth.invalid_credentials');
    });

    it('should set auth cookie on success', async () => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QifQ.signature';
        vi.mocked(csrf.generateCSRFToken).mockReturnValue('mock-csrf-token');
        vi.mocked(users.getUser).mockReturnValue({
            username: 'test',
            password: 'salt123:hash456'
        } as any);
        vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(true);
        vi.mocked(jwt.generateToken).mockReturnValue(mockToken);

        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'test', password: 'correctpass123' }),
        });
        const response = await loginHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.username).toBe('test');
        expect(data.csrfToken).toBe('mock-csrf-token');

        // Login generates a UUID sid itself, passes it as the third arg to generateToken
        // and also to generateCSRFToken — capture what was actually used.
        const [calledUsername, calledRemember, calledSid] =
            vi.mocked(jwt.generateToken).mock.calls[0];
        expect(calledUsername).toBe('test');
        expect(calledRemember).toBe(false);
        // sid must be a valid UUID v4
        expect(calledSid).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
        // generateCSRFToken must receive the same sid (not the JWT token string)
        expect(csrf.generateCSRFToken).toHaveBeenCalledWith(calledSid);

        expect(cookies.set).toHaveBeenCalledWith(
            'passkeys_auth',
            mockToken,
            expect.objectContaining({
                httpOnly: true,
                sameSite: 'lax',
                path: '/'
            })
        );
    });

    it('should verify password even if user does not exist (timing attack protection)', async () => {
        vi.mocked(users.getUser).mockReturnValue(undefined);
        vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(false);

        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'nonexistent', password: 'password123' }),
        });

        await loginHandler.POST(makeEvent(request));

        expect(cryptoUtils.verifyPassword).toHaveBeenCalled();
    });

    it('should reject passwords shorter than 8 characters', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'test', password: 'short' }),
        });
        const response = await loginHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Password must be between 8 and 1000 characters');
    });

    it('should reject invalid username characters', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'test/../admin', password: 'password123' }),
        });
        const response = await loginHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('invalid characters');
    });
});
