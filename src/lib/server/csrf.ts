import { randomBytes } from 'node:crypto';

// In-memory store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// Token lifetime: 1 hour
const TOKEN_LIFETIME = 60 * 60 * 1000;

// Cleanup expired tokens every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of csrfTokens.entries()) {
        if (data.expiresAt < now) {
            csrfTokens.delete(sessionId);
        }
    }
}, 5 * 60 * 1000);

/**
 * Generate a CSRF token for a session
 */
export function generateCSRFToken(sessionId: string): string {
    const token = randomBytes(32).toString('hex');
    csrfTokens.set(sessionId, {
        token,
        expiresAt: Date.now() + TOKEN_LIFETIME
    });
    return token;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
    const stored = csrfTokens.get(sessionId);

    if (!stored) {
        return false;
    }

    if (stored.expiresAt < Date.now()) {
        csrfTokens.delete(sessionId);
        return false;
    }

    return stored.token === token;
}

/**
 * Remove a CSRF token (for logout)
 */
export function removeCSRFToken(sessionId: string): void {
    csrfTokens.delete(sessionId);
}

/**
 * Get session ID from request (using Authorization header)
 */
export function getSessionIdFromRequest(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    // Use the token itself as session ID (or extract username from it)
    const token = authHeader.substring(7);
    return token;
}
