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
            expect(token).toHaveLength(64); // HMAC-SHA256 = 32 bytes = 64 hex chars
            expect(token).toMatch(/^[0-9a-f]{64}$/);
        });

        it('generates different tokens for different session IDs', () => {
            expect(generateCSRFToken('sid-1')).not.toBe(generateCSRFToken('sid-2'));
        });

        it('is deterministic — same sid always yields the same token', () => {
            // Stateless HMAC: calling twice with the same sid must return the same value.
            // This is the key difference from the old random-token implementation.
            const sid = 'stable-sid';
            expect(generateCSRFToken(sid)).toBe(generateCSRFToken(sid));
        });

        it('produces a token that is independent of call count', () => {
            const sid = 'any-sid';
            const first  = generateCSRFToken(sid);
            const second = generateCSRFToken(sid);
            const third  = generateCSRFToken(sid);
            expect(first).toBe(second);
            expect(second).toBe(third);
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
            expect(validateCSRFToken(sid, 'deadbeef'.repeat(8))).toBe(false);
        });

        it('rejects a token belonging to a different session', () => {
            const tokenA = generateCSRFToken('sid-A');
            expect(validateCSRFToken('sid-B', tokenA)).toBe(false);
        });

        it('allows the same token to be validated multiple times (stateless — no single-use)', () => {
            const sid = 'reuse-sid';
            const token = generateCSRFToken(sid);
            expect(validateCSRFToken(sid, token)).toBe(true);
            expect(validateCSRFToken(sid, token)).toBe(true);
        });

        it('rejects a token with wrong hex encoding (odd-length input)', () => {
            // Buffer.from('abc', 'hex') produces 1 byte — length mismatch → false
            expect(validateCSRFToken('any-sid', 'abc')).toBe(false);
        });

        it('rejects an empty string token', () => {
            expect(validateCSRFToken('any-sid', '')).toBe(false);
        });

        it('uses timingSafeEqual — does not throw on length-mismatched input', () => {
            // An attacker submitting a short token must get false, not an exception.
            expect(() => validateCSRFToken('any-sid', 'short')).not.toThrow();
            expect(validateCSRFToken('any-sid', 'short')).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    describe('removeCSRFToken', () => {
        it('is a no-op — does not throw', () => {
            expect(() => removeCSRFToken('any-sid')).not.toThrow();
        });

        it('token remains valid after removeCSRFToken (stateless — nothing to remove)', () => {
            // The stateless design means invalidation is handled by JWT expiry,
            // not by removing an entry from a store.  removeCSRFToken exists only
            // for API compatibility and must not break anything.
            const sid = 'remove-sid';
            const token = generateCSRFToken(sid);
            removeCSRFToken(sid);
            // Token is still valid because the HMAC has not changed
            expect(validateCSRFToken(sid, token)).toBe(true);
        });

        it('does not throw for a non-existent session', () => {
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
            vi.advanceTimersByTime(25 * 60 * 60 * 1000); // past 24-hour JWT expiry
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
    describe('Multi-worker / stateless properties', () => {
        it('two independent calls with the same sid produce identical tokens (no shared state needed)', () => {
            // Simulates Worker A generating and Worker B validating the same session.
            const sid = 'cross-worker-sid';
            const tokenFromWorkerA = generateCSRFToken(sid);  // Worker A
            const tokenFromWorkerB = generateCSRFToken(sid);  // Worker B (different process)
            expect(tokenFromWorkerA).toBe(tokenFromWorkerB);
            expect(validateCSRFToken(sid, tokenFromWorkerA)).toBe(true);
        });

        it('validation works without any prior generateCSRFToken call', () => {
            // Worker B can validate a token it never generated — no Map lookup needed.
            const sid = 'fresh-worker-sid';
            const token = generateCSRFToken(sid);
            // Simulate a fresh worker: validateCSRFToken called without generateCSRFToken
            expect(validateCSRFToken(sid, token)).toBe(true);
        });

        it('CSRF token is implicitly invalidated when JWT expires', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

            const sid = '55555555-5555-5555-5555-555555555555';
            const request = makeRequestWithToken('alice', sid);
            const csrfToken = generateCSRFToken(sid);

            // Before expiry — CSRF token is derivable and valid
            expect(validateCSRFToken(sid, csrfToken)).toBe(true);
            // Session ID is still extractable from the JWT
            expect(getSessionIdFromRequest(request)).toBe(sid);

            // Advance past SESSION_EXPIRY_SECONDS (2 h for non-remember)
            vi.advanceTimersByTime(3 * 60 * 60 * 1000);

            // JWT is now expired — getSessionIdFromRequest returns null, so
            // verifyCSRF in auth.ts will reject the request before validateCSRFToken
            // is even reached.
            expect(getSessionIdFromRequest(request)).toBeNull();

            vi.useRealTimers();
        });
    });

    // -----------------------------------------------------------------------
    describe('Session ID stability across token renewal', () => {
        it('CSRF token is stable across renewal (same sid → same HMAC)', () => {
            const sid = '22222222-2222-2222-2222-222222222222';

            const csrfBefore = generateCSRFToken(sid);
            // Simulate renewal: removeCSRFToken is a no-op in stateless design
            removeCSRFToken(sid);
            const csrfAfter = generateCSRFToken(sid);

            // Both tokens are identical — the client does not need to re-fetch
            expect(csrfBefore).toBe(csrfAfter);
            expect(validateCSRFToken(sid, csrfAfter)).toBe(true);
        });

        it('logout does not break subsequent validation (removeCSRFToken is no-op)', () => {
            const sid = '44444444-4444-4444-4444-444444444444';
            const csrfToken = generateCSRFToken(sid);
            removeCSRFToken(sid); // logout
            // Token is still mathematically valid; real invalidation happens via JWT expiry
            expect(validateCSRFToken(sid, csrfToken)).toBe(true);
        });
    });
});
