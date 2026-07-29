import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/users', () => ({ getUser: vi.fn() }));
vi.mock('$lib/server/sanitizer', () => ({
    sanitizeJWTToken:  vi.fn((t: string) => t),
    sanitizeCSRFToken: vi.fn((t: string) => t),
}));
vi.mock('$lib/server/jwt', () => ({
    computeCSRFToken: vi.fn(() => 'a'.repeat(64)),
    verifyToken: vi.fn(() => ({ sid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' })),
}));
vi.mock('$lib/server/auth-cookie', () => ({ getAuthTokenFromRequest: vi.fn() }));

import { verifyCSRF } from '$lib/server/csrf';
import * as sanitizer from '$lib/server/sanitizer';
import * as authCookie from '$lib/server/auth-cookie';
import * as jwt from '$lib/server/jwt';

const VALID_TOKEN = 'a'.repeat(64); // 64-char hex passes sanitizeCSRFToken

function makeRequest(csrfHeader?: string): Request {
    const headers: Record<string, string> = {};
    if (csrfHeader !== undefined) headers['X-CSRF-Token'] = csrfHeader;
    return new Request('http://localhost', { headers });
}

describe('verifyCSRF', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(jwt.computeCSRFToken).mockReturnValue(VALID_TOKEN);
        vi.mocked(jwt.verifyToken).mockReturnValue({ sid: 'session-id' } as any);
        vi.mocked(sanitizer.sanitizeCSRFToken).mockImplementation((t: unknown) => t as string);
        vi.mocked(authCookie.getAuthTokenFromRequest).mockReturnValue('valid-token');
    });

    // -------------------------------------------------------------------------
    describe('returns null (pass) when', () => {
        it('header is present, session id is found, and token validates', () => {
            const result = verifyCSRF(makeRequest(VALID_TOKEN));
            expect(result).toBeNull();
        });

        it('passes the sanitised token value to validateCSRFToken', () => {
            const sanitised = 'b'.repeat(64);
            vi.mocked(sanitizer.sanitizeCSRFToken).mockReturnValue(sanitised);

            verifyCSRF(makeRequest(VALID_TOKEN));

            expect(sanitizer.sanitizeCSRFToken).toHaveBeenCalledWith(VALID_TOKEN);
        });
    });

    // -------------------------------------------------------------------------
    describe('returns 403 (fail) when', () => {
        it('X-CSRF-Token header is absent', async () => {
            const result = verifyCSRF(makeRequest());   // no header

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
            expect(await result!.json()).toMatchObject({ error: 'auth.unauthorized' });
        });

        it('X-CSRF-Token header is an empty string', async () => {
            // empty string is falsy — treated same as absent
            const result = verifyCSRF(makeRequest(''));

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
        });

        it('session id cannot be extracted from the request', async () => {
            vi.mocked(authCookie.getAuthTokenFromRequest).mockReturnValue(null);

            const result = verifyCSRF(makeRequest(VALID_TOKEN));

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
            expect(await result!.json()).toMatchObject({ error: 'auth.unauthorized' });
        });

        it('both header and session id are absent', async () => {
            vi.mocked(authCookie.getAuthTokenFromRequest).mockReturnValue(null);

            const result = verifyCSRF(makeRequest());

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
        });

        it('token does not match the stored value', async () => {
            const result = verifyCSRF(makeRequest('b'.repeat(64)));

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
            expect(await result!.json()).toMatchObject({ error: 'auth.unauthorized' });
        });

        it('sanitizeCSRFToken throws (malformed token format)', async () => {
            vi.mocked(sanitizer.sanitizeCSRFToken).mockImplementation(() => {
                throw new Error('Invalid CSRF token format');
            });

            const result = verifyCSRF(makeRequest('!!!bad!!!'));

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
            expect(await result!.json()).toMatchObject({ error: 'auth.unauthorized' });
        });
    });

    // -------------------------------------------------------------------------
    describe('does not perform user lookup', () => {
        it('never calls getUser', async () => {
            const { getUser } = await import('$lib/server/users');
            verifyCSRF(makeRequest(VALID_TOKEN));
            expect(getUser).not.toHaveBeenCalled();
        });
    });
});
