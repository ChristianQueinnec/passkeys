import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults, deleteVault } from '$lib/server/storage';
import { getUser } from '$lib/server/users';
import { validateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import { sanitizeToken, sanitizeFilename, sanitizeCSRFToken } from '$lib/server/sanitizer';

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

export const GET: RequestHandler = async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const vaults = listVaults(user.username);
        return json(vaults);
    } catch (e: any) {
        console.error('Vault history GET error:', e);
        return json({ error: 'Internal error' }, { status: 500 });
    }
}

export const DELETE: RequestHandler = async ({ request, url }) => {
    try {
        const user = getAuthUser(request);
        if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

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

        // Sanitize filename from query parameter
        const filenameRaw = url.searchParams.get('filename');
        if (!filenameRaw) {
            return json({ error: 'Filename required' }, { status: 400 });
        }

        let filename: string;
        try {
            filename = sanitizeFilename(filenameRaw, '.vault');
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message }, { status: 400 });
        }

        // Delete vault
        deleteVault(user.username, filename);
        return json({ success: true });
    } catch (e: any) {
        console.error('Vault history DELETE error:', e);
        return json({ error: 'Internal error' }, { status: 500 });
    }
}
