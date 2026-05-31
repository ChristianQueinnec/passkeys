import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/users', () => ({ getUser: vi.fn() }));
vi.mock('$lib/server/sanitizer', () => ({
    sanitizeJWTToken:  vi.fn((t: string) => t),
    sanitizeCSRFToken: vi.fn((t: string) => t),
}));
vi.mock('$lib/server/csrf', () => ({
    validateCSRFToken:      vi.fn(),
    getSessionIdFromRequest: vi.fn(),
}));
vi.mock('$lib/server/jwt',         () => ({ verifyToken: vi.fn() }));
vi.mock('$lib/server/auth-cookie', () => ({ getAuthTokenFromRequest: vi.fn() }));

import { verifyCSRF } from '$lib/server/auth';
import * as csrf from '$lib/server/csrf';
import * as sanitizer from '$lib/server/sanitizer';

const VALID_SID   = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const VALID_TOKEN = 'a'.repeat(64); // 64-char hex passes sanitizeCSRFToken

function makeRequest(csrfHeader?: string): Request {
    const headers: Record<string, string> = {};
    if (csrfHeader !== undefined) headers['X-CSRF-Token'] = csrfHeader;
    return new Request('http://localhost', { headers });
}

describe('verifyCSRF', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(csrf.getSessionIdFromRequest).mockReturnValue(VALID_SID);
        vi.mocked(csrf.validateCSRFToken).mockReturnValue(true);
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

            expect(csrf.validateCSRFToken).toHaveBeenCalledWith(VALID_SID, sanitised);
        });
    });

    // -------------------------------------------------------------------------
    describe('returns 403 (fail) when', () => {
        it('X-CSRF-Token header is absent', async () => {
            const result = verifyCSRF(makeRequest());   // no header

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
            expect(await result!.json()).toMatchObject({ error: 'Missing CSRF token' });
        });

        it('X-CSRF-Token header is an empty string', async () => {
            // empty string is falsy — treated same as absent
            vi.mocked(csrf.getSessionIdFromRequest).mockReturnValue(VALID_SID);
            const result = verifyCSRF(makeRequest(''));

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
        });

        it('session id cannot be extracted from the request', async () => {
            vi.mocked(csrf.getSessionIdFromRequest).mockReturnValue(null);

            const result = verifyCSRF(makeRequest(VALID_TOKEN));

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
            expect(await result!.json()).toMatchObject({ error: 'Missing CSRF token' });
        });

        it('both header and session id are absent', async () => {
            vi.mocked(csrf.getSessionIdFromRequest).mockReturnValue(null);

            const result = verifyCSRF(makeRequest());

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
        });

        it('token does not match the stored value', async () => {
            vi.mocked(csrf.validateCSRFToken).mockReturnValue(false);

            const result = verifyCSRF(makeRequest(VALID_TOKEN));

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
            expect(await result!.json()).toMatchObject({ error: 'Invalid CSRF token' });
        });

        it('sanitizeCSRFToken throws (malformed token format)', async () => {
            vi.mocked(sanitizer.sanitizeCSRFToken).mockImplementation(() => {
                throw new Error('Invalid CSRF token format');
            });

            const result = verifyCSRF(makeRequest('!!!bad!!!'));

            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
            expect(await result!.json()).toMatchObject({ error: 'Invalid CSRF token format' });
            // validateCSRFToken must NOT be called when sanitisation throws
            expect(csrf.validateCSRFToken).not.toHaveBeenCalled();
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
