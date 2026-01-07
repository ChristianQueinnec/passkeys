import { json } from '@sveltejs/kit';
import { getUser, updateUserPassword } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import { validateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import { sanitizeToken, sanitizePassword, sanitizeCSRFToken } from '$lib/server/sanitizer';
import type { RequestEvent } from './$types';

// Helper to validate auth token with sanitization
function getAuthUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

    try {
        const sanitizedToken = sanitizeToken(parts[1]);
        const decoded = Buffer.from(sanitizedToken, 'base64').toString('utf-8');
        const [username, ...rest] = decoded.split(':');
        const passwordHash = rest.join(':');

        const user = getUser(username);
        if (user && user.password === passwordHash) {
            return user;
        }
    } catch (e) {
        return null;
    }
    return null;
}

export async function POST({ request }: RequestEvent) {
    try {
        const user = getAuthUser(request);
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate CSRF token with sanitization
        const csrfTokenRaw = request.headers.get('X-CSRF-Token');
        const sessionId = getSessionIdFromRequest(request);

        if (!csrfTokenRaw || !sessionId) {
            return json({ error: 'Missing CSRF token' }, { status: 403 });
        }

        let csrfToken: string;
        try {
            csrfToken = sanitizeCSRFToken(csrfTokenRaw);
        } catch (sanitizeError: any) {
            return json({ error: 'Invalid CSRF token format' }, { status: 403 });
        }

        if (!validateCSRFToken(sessionId, csrfToken)) {
            return json({ error: 'Invalid CSRF token' }, { status: 403 });
        }

        // Parse and sanitize request body
        const body = await request.json();
        const { oldPassword, newPassword } = body;

        if (!oldPassword || !newPassword) {
            return json({ error: 'Missing parameters' }, { status: 400 });
        }

        let sanitizedOldPassword: string;
        let sanitizedNewPassword: string;

        try {
            sanitizedOldPassword = sanitizePassword(oldPassword);
            sanitizedNewPassword = sanitizePassword(newPassword);
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message }, { status: 400 });
        }

        // Verify old password
        const [salt, hash] = user.password.split(':');
        const isValid = await verifyPassword(sanitizedOldPassword, hash, salt);

        if (!isValid) {
            return json({ error: 'Invalid current password' }, { status: 403 });
        }

        // Update password
        updateUserPassword(user.username, sanitizedNewPassword);
        return json({ success: true });
    } catch (e: any) {
        console.error('Password change error:', e);
        return json({ error: 'Failed to update password' }, { status: 500 });
    }
}
