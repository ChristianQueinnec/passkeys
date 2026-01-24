import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/users';
import { sanitizeJWTToken, sanitizeCSRFToken } from '$lib/server/sanitizer';
import { validateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import { verifyToken } from '$lib/server/jwt';
import type { User } from '$lib/types';
import logger from '$lib/server/logger';

/**
 * Helper to validate JWT token and return authenticated user
 */
export function getAuthUser(request: Request): User | null {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    try {
        const sanitizedToken = sanitizeJWTToken(parts[1]);

        // Verify JWT token
        const payload = verifyToken(sanitizedToken);
        if (!payload) {
            return null;
        }

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
 * Combined helper for authentication and CSRF validation
 * Returns User if successful, or Response (error) if not
 */
export async function verifyRequest(
    request: Request,
    options: { csrf?: boolean } = {}
): Promise<User | Response> {
    const user = getAuthUser(request);
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (options.csrf) {
        const csrfTokenRaw = request.headers.get('X-CSRF-Token');
        const sessionId = getSessionIdFromRequest(request);

        if (!csrfTokenRaw || !sessionId) {
            return json({ error: 'Missing CSRF token' }, { status: 403 });
        }

        try {
            const csrfToken = sanitizeCSRFToken(csrfTokenRaw);
            if (!validateCSRFToken(sessionId, csrfToken)) {
                return json({ error: 'Invalid CSRF token' }, { status: 403 });
            }
        } catch (sanitizeError: any) {
            return json({ error: 'Invalid CSRF token format' }, { status: 403 });
        }
    }

    return user;
}
