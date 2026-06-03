import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/users';
import { sanitizeJWTToken, sanitizeCSRFToken } from '$lib/server/sanitizer';
import { validateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import { verifyToken } from '$lib/server/jwt';
import { getAuthTokenFromRequest } from '$lib/server/auth-cookie';
import { HTTP_STATUS } from './http-codes';
import type { User } from '$lib/types';
import logger from '$lib/server/logger';

/**
 * Helper to validate JWT token and return authenticated user
 */
export function getAuthUser(request: Request): User | null {
    const payload = getAuthPayload(request);
    if (!payload) return null;

    try {
        // Get user from database
        const user = getUser(payload.username);
        if (!user) {
            logger.warn({ username: payload.username }, 'Token valid but user not found');
            return null;
        }

        return user;
    } catch (e: any) {
        logger.error({ error: e.message }, 'Token validation error');
        return null;
    }
}

/**
 * Helper to get verified JWT payload from request
 */
export function getAuthPayload(request: Request) {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
        return null;
    }

    try {
        const sanitizedToken = sanitizeJWTToken(token);

        // Verify JWT token
        const payload = verifyToken(sanitizedToken);
        return payload;
    } catch (e: any) {
        logger.error({ error: e.message }, 'Token payload extraction error');
        return null;
    }
}

/**
 * Verify the CSRF token in a request without requiring a full User lookup.
 * Used by endpoints (e.g. /api/renew) that need CSRF protection but obtain
 * their auth payload through a different path.
 *
 * Returns null on success, or an error Response on failure.
 */
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
 * Combined helper for authentication and CSRF validation
 * Returns User if successful, or Response (error) if not
 */
export async function verifyRequest(
    request: Request,
    options: { csrf?: boolean } = {}
): Promise<User | Response> {
    const user = getAuthUser(request);
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    if (options.csrf) {
        const csrfError = verifyCSRF(request);
        if (csrfError) return csrfError;
    }

    return user;
}

/**
 * Helper to safely extract username from JWT token in request for logging purposes.
 * Does not validate the token - use verifyRequest or getAuthUser for authentication.
 * @param request The incoming request
 * @returns The username from the token, or undefined if not found
 */
export function peekUsernameFromRequest(request: Request): string | undefined {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
        return undefined;
    }

    const parts = token.split('.');
    if (parts.length === 3) {
        try {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            return payload.username;
        } catch { /* ignore */ }
    }
    return undefined;
}
