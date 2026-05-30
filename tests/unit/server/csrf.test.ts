import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCSRFToken, validateCSRFToken, removeCSRFToken, getSessionIdFromRequest } from '../../../src/lib/server/csrf';
import { generateToken } from '../../../src/lib/server/jwt';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Request with a signed JWT cookie for the given username. */
function makeRequestWithToken(username: string, sid?: string): Request {
    const token = generateToken(username, false, sid);
    return new Request('http://localhost', {
        headers: new Headers({ cookie: `passkeys_auth=${token}` })
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CSRF Token Management', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    describe('generateCSRFToken', () => {
        it('generates a 64-character hex token', () => {
            const token = generateCSRFToken('sid-abc');
            expect(typeof token).toBe('string');
            expect(token).toHaveLength(64); // 32 bytes as hex
            expect(token).toMatch(/^[0-9a-f]{64}$/);
        });

        it('generates different tokens for different session IDs', () => {
            expect(generateCSRFToken('sid-1')).not.toBe(generateCSRFToken('sid-2'));
        });

        it('generates different tokens on repeated calls for the same session ID', () => {
            const sid = 'same-sid';
            expect(generateCSRFToken(sid)).not.toBe(generateCSRFToken(sid));
        });
    });

    // -----------------------------------------------------------------------
    describe('validateCSRFToken', () => {
        it('validates the correct token', () => {
            const sid = 'validate-sid';
            const token = generateCSRFToken(sid);
            expect(validateCSRFToken(sid, token)).toBe(true);
        });

        it('rejects a wrong token value', () => {
            const sid = 'reject-wrong';
            generateCSRFToken(sid);
            expect(validateCSRFToken(sid, 'deadbeef'.repeat(8))).toBe(false);
        });

        it('rejects a token for a non-existent session', () => {
            expect(validateCSRFToken('no-such-sid', 'a'.repeat(64))).toBe(false);
        });

        it('rejects a token belonging to a different session', () => {
            const token1 = generateCSRFToken('sid-A');
            generateCSRFToken('sid-B');
            expect(validateCSRFToken('sid-B', token1)).toBe(false);
        });

        it('allows the same token to be reused within its lifetime', () => {
            const sid = 'reuse-sid';
            const token = generateCSRFToken(sid);
            expect(validateCSRFToken(sid, token)).toBe(true);
            expect(validateCSRFToken(sid, token)).toBe(true);
        });

        it('rejects an expired token', () => {
            vi.useFakeTimers();
            const sid = 'expire-sid';
            const token = generateCSRFToken(sid);
            expect(validateCSRFToken(sid, token)).toBe(true);

            // Advance past TOKEN_LIFETIME (default 1 hour = 3 600 000 ms)
            vi.advanceTimersByTime(3_600_001);
            expect(validateCSRFToken(sid, token)).toBe(false);
            vi.useRealTimers();
        });
    });

    // -----------------------------------------------------------------------
    describe('removeCSRFToken', () => {
        it('removes the token so validation fails afterwards', () => {
            const sid = 'remove-sid';
            const token = generateCSRFToken(sid);
            expect(validateCSRFToken(sid, token)).toBe(true);
            removeCSRFToken(sid);
            expect(validateCSRFToken(sid, token)).toBe(false);
        });

        it('does not throw when removing a non-existent session', () => {
            expect(() => removeCSRFToken('ghost-sid')).not.toThrow();
        });
    });

    // -----------------------------------------------------------------------
    describe('getSessionIdFromRequest', () => {
        it('returns the sid embedded in a valid JWT cookie', () => {
            const sid = '11111111-1111-1111-1111-111111111111';
            const request = makeRequestWithToken('alice', sid);
            expect(getSessionIdFromRequest(request)).toBe(sid);
        });

        it('returns null when there is no auth cookie', () => {
            const request = new Request('http://localhost');
            expect(getSessionIdFromRequest(request)).toBeNull();
        });

        it('returns null when the auth cookie contains a tampered JWT', () => {
            const token = generateToken('alice');
            const [h, , s] = token.split('.');
            const tampered = `${h}.AAAAAAAAAA.${s}`;
            const request = new Request('http://localhost', {
                headers: new Headers({ cookie: `passkeys_auth=${tampered}` })
            });
            expect(getSessionIdFromRequest(request)).toBeNull();
        });

        it('returns null for an expired JWT', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
            const request = makeRequestWithToken('alice');
            // Advance past 24-hour JWT expiry
            vi.advanceTimersByTime(25 * 60 * 60 * 1000);
            expect(getSessionIdFromRequest(request)).toBeNull();
            vi.useRealTimers();
        });

        it('returns null when the cookie is missing a value', () => {
            const request = new Request('http://localhost', {
                headers: new Headers({ cookie: 'passkeys_auth=' })
            });
            expect(getSessionIdFromRequest(request)).toBeNull();
        });
    });

    // -----------------------------------------------------------------------
    describe('Session ID stability across token renewal', () => {
        it('CSRF token remains valid after renewal (same sid)', () => {
            const sid = '22222222-2222-2222-2222-222222222222';

            // Login: generate CSRF token bound to sid
            const csrfToken = generateCSRFToken(sid);
            expect(validateCSRFToken(sid, csrfToken)).toBe(true);

            // Renewal: evict old entry, generate a new CSRF token for the same sid
            removeCSRFToken(sid);
            const newCsrfToken = generateCSRFToken(sid);

            // New token is valid; old token is gone
            expect(validateCSRFToken(sid, newCsrfToken)).toBe(true);
            expect(validateCSRFToken(sid, csrfToken)).toBe(false);
        });

        it('old JWT cannot replay against renewed session (sid evicted on renewal)', () => {
            const sid = '33333333-3333-3333-3333-333333333333';
            const csrfToken = generateCSRFToken(sid);

            // Simulate renewal: evict + reissue
            removeCSRFToken(sid);
            generateCSRFToken(sid); // new token

            // Old CSRF token is no longer accepted
            expect(validateCSRFToken(sid, csrfToken)).toBe(false);
        });

        it('logout invalidates the CSRF token for the session', () => {
            const sid = '44444444-4444-4444-4444-444444444444';
            const csrfToken = generateCSRFToken(sid);
            expect(validateCSRFToken(sid, csrfToken)).toBe(true);

            removeCSRFToken(sid); // what logout calls
            expect(validateCSRFToken(sid, csrfToken)).toBe(false);
        });
    });
});
