import { timingSafeEqual } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { sanitizeCSRFToken } from '$lib/server/sanitizer';
import { HTTP_STATUS } from './http-codes';
import { computeCSRFToken } from './jwt';
import { getAuthTokenFromRequest } from './auth-cookie';
import { verifyToken } from './jwt';

/**
 * Stateless CSRF token implementation using HMAC double-submit.
 *
 * ## Why stateless?
 * The previous implementation stored tokens in a process-local Map.  In any
 * multi-worker deployment (SvelteKit adapter-node with workers > 1, or even
 * two concurrent `vite dev` processes) Worker A's Map is invisible to Worker B,
 * causing every cross-worker CSRF check to return 403.
 *
 * ## How it works
 * The CSRF token is HMAC-SHA256(JWT_SECRET, "csrf:" + sid), returned as hex.
 * Any process that knows JWT_SECRET can recompute and verify the token without
 * shared state or network round-trips.  This is the standard OWASP-recommended
 * stateless CSRF pattern.
 *
 * ## Security properties
 * - An attacker without the auth cookie cannot obtain or predict the sid, so
 *   they cannot compute the token.
 * - Comparison uses timingSafeEqual — no timing oracle.
 * - The "csrf:" prefix domain-separates this HMAC from JWT signatures that
 *   use the same key.
 * - Token lifetime is implicitly bounded by the JWT's own exp: once the JWT
 *   expires, getSessionIdFromRequest returns null and validation fails.
 * - removeCSRFToken is a no-op — there is nothing to remove.
 */

/**
 * Generate (or re-derive) the CSRF token for a session.
 * Deterministic: calling it twice with the same sid returns the same value.
 * @param sid  The stable session ID from the JWT payload.
 */
export function generateCSRFToken(sid: string): string {
    return computeCSRFToken(sid);
}

/**
 * Validate a CSRF token against a session ID using constant-time comparison.
 * @param sid    Stable session ID from the JWT payload.
 * @param token  Token value sent by the client in X-CSRF-Token header.
 */
export function validateCSRFToken(sid: string, token: string): boolean {
    const expected = computeCSRFToken(sid);

    // Both values are 64-char hex strings (32 bytes); lengths always match.
    // timingSafeEqual requires equal-length Buffers — guard anyway.
    const expectedBuf = Buffer.from(expected, 'hex');
    const tokenBuf    = Buffer.from(token,    'hex');

    if (expectedBuf.length !== tokenBuf.length) return false;

    return timingSafeEqual(expectedBuf, tokenBuf);
}

/** Verify the CSRF token in a request without requiring a User lookup. */
export function verifyCSRF(request: Request): Response | null {
    const csrfTokenRaw = request.headers.get('X-CSRF-Token');
    const sessionId = getSessionIdFromRequest(request);

    if (!csrfTokenRaw || !sessionId) {
        return json({ error: 'auth.unauthorized' }, { status: HTTP_STATUS.FORBIDDEN });
    }

    try {
        const csrfToken = sanitizeCSRFToken(csrfTokenRaw);
        if (!validateCSRFToken(sessionId, csrfToken)) {
            return json({ error: 'auth.unauthorized' }, { status: HTTP_STATUS.FORBIDDEN });
        }
    } catch {
        return json({ error: 'auth.unauthorized' }, { status: HTTP_STATUS.FORBIDDEN });
    }

    return null;
}

/**
 * No-op — stateless tokens have nothing to remove.
 * Kept for API compatibility with callers (login, renew, logout).
 */
export function removeCSRFToken(_sid: string): void {
    // Intentional no-op: stateless HMAC tokens are not stored anywhere.
    // Invalidation is handled by JWT expiry — when the JWT expires,
    // getSessionIdFromRequest returns null and all CSRF checks fail.
}

/**
 * Extract the stable session ID (sid) from the verified JWT in the request.
 *
 * The sid lives inside the signed JWT payload — it cannot be forged without
 * knowing JWT_SECRET — so it is safe to use as the CSRF derivation input.
 *
 * Returns null if there is no auth cookie or the token is invalid/expired.
 */
export function getSessionIdFromRequest(request: Request): string | null {
    const token = getAuthTokenFromRequest(request);
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    return payload.sid;
}
