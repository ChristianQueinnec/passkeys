import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as loginHandler from '../../../src/routes/api/login/+server';
import * as users from '$lib/server/users';
import * as cryptoUtils from '$lib/server/crypto-utils';
import * as jwt from '$lib/server/jwt';

vi.mock('$lib/server/users', () => ({
    getUser: vi.fn(),
}));
vi.mock('$lib/server/crypto-utils', () => ({
    verifyPassword: vi.fn(),
}));
vi.mock('$lib/server/jwt', () => ({
    generateToken: vi.fn(),
}));

describe('API Login', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    function makeHeaders() {
        return new Headers({
            'Content-Type': 'application/json'
        });
    }

    it('should return 400 if password missing', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'test' }), // Missing password
        });
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Username and password required');
    });

    it('should return 400 if username missing', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ password: 'test' }), // Missing username
        });
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Username and password required');
    });

    it('should return 401 if user not found', async () => {
        vi.mocked(users.getUser).mockReturnValue(undefined);
        vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(false);
        
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'unknown', password: 'password123' }),
        });
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid credentials');
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
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid credentials');
    });

    it('should return JWT token on success', async () => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QifQ.signature';
        
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
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.token).toBe(mockToken);
        expect(data.username).toBe('test');
        expect(jwt.generateToken).toHaveBeenCalledWith('test');
    });

    it('should verify password even if user does not exist (timing attack protection)', async () => {
        vi.mocked(users.getUser).mockReturnValue(undefined);
        vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(false);

        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'nonexistent', password: 'password123' }),
        });
        
        await loginHandler.POST({ request } as any);

        // Should still call verifyPassword even though user doesn't exist
        expect(cryptoUtils.verifyPassword).toHaveBeenCalled();
    });

    it('should reject passwords shorter than 8 characters', async () => {
        const request = new Request('http://localhost', {
            method: 'POST',
            headers: makeHeaders(),
            body: JSON.stringify({ username: 'test', password: 'short' }),
        });
        const response = await loginHandler.POST({ request } as any);
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
        const response = await loginHandler.POST({ request } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('invalid characters');
    });
});
