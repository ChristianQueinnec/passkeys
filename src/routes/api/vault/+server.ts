import { json, type RequestHandler } from '@sveltejs/kit';
import { getLatestVault, saveVault } from '$lib/server/storage';
import { getUser } from '$lib/server/users';
import { validateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import { sanitizeToken, sanitizeVaultContent, sanitizeCSRFToken } from '$lib/server/sanitizer';

// Middleware-like auth check helper with sanitization
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
        const vault = getLatestVault(user.username);
        if (!vault) return json({ error: 'Not found' }, { status: 404 });
        return json(JSON.parse(vault));
    } catch (e: any) {
        console.error('Vault GET error:', e);
        return json({ error: 'Internal error' }, { status: 500 });
    }
}

export const POST: RequestHandler = async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
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
        const { content } = body;

        if (!content) {
            return json({ error: 'Missing content' }, { status: 400 });
        }

        let sanitizedContent: string;
        try {
            sanitizedContent = sanitizeVaultContent(content);
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message }, { status: 400 });
        }

        // Save vault
        const filename = saveVault(user.username, sanitizedContent);
        return json({ success: true, filename });
    } catch (e: any) {
        console.error('Vault POST error:', e);
        return json({ error: 'Internal error' }, { status: 500 });
    }
}
