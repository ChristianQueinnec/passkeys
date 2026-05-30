import { randomBytes } from 'node:crypto';
import settings from './server-settings.json';
import { getAuthTokenFromRequest } from './auth-cookie';
import { verifyToken } from './jwt';

// In-memory store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// Token lifetime
const TOKEN_LIFETIME = settings.csrf.tokenLifetimeMs;

// Cleanup expired tokens
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of csrfTokens.entries()) {
        if (data.expiresAt < now) {
            csrfTokens.delete(sessionId);
        }
    }
}, settings.csrf.cleanupIntervalMs);

/**
 * Generate a CSRF token for a session.
 * @param sid  The stable session ID extracted from the JWT payload (jwt.sid).
 *             This value is preserved across token renewals so the CSRF token
 *             does not need to be re-fetched by the client after a renewal.
 */
export function generateCSRFToken(sid: string): string {
    const token = randomBytes(32).toString('hex');
    csrfTokens.set(sid, {
        token,
        expiresAt: Date.now() + TOKEN_LIFETIME
    });
    return token;
}

/**
 * Validate a CSRF token against a session ID.
 * @param sid    Stable session ID from the JWT payload.
 * @param token  Token value sent by the client in X-CSRF-Token header.
 */
export function validateCSRFToken(sid: string, token: string): boolean {
    const stored = csrfTokens.get(sid);

    if (!stored) {
        return false;
    }

    if (stored.expiresAt < Date.now()) {
        csrfTokens.delete(sid);
        return false;
    }

    return stored.token === token;
}

/**
 * Remove a CSRF token (called on logout).
 * @param sid  Stable session ID from the JWT payload.
 */
export function removeCSRFToken(sid: string): void {
    csrfTokens.delete(sid);
}

/**
 * Extract the stable session ID (sid) from the verified JWT in the request.
 *
 * The sid lives inside the signed JWT payload — it cannot be forged without
 * knowing JWT_SECRET — so it is safe to use as the CSRF map key.
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
