import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/users';
import { sanitizeToken, sanitizeCSRFToken } from '$lib/server/sanitizer';
import { validateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import type { User } from '$lib/types';

/**
 * Helper to validate auth token with sanitization
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
        const sanitizedToken = sanitizeToken(parts[1]);
        const decoded = Buffer.from(sanitizedToken, 'base64').toString('utf-8');
        const [username, ...rest] = decoded.split(':');
        const passwordHash = rest.join(':');

        const user = getUser(username);
        if (!user) {
            return null;
        }

        if (user.password === passwordHash) {
            return user;
        }
    } catch (e: any) {
        console.error('[AUTH] Token validation error:', e.message);
        return null;
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
