import { json } from '@sveltejs/kit';
import { listVaults, deleteVault } from '$lib/server/storage';
import { getUser } from '$lib/server/users';
import { validateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';

function getAuthUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, ...rest] = decoded.split(':');
        const passwordHash = rest.join(':');
        const user = getUser(username);
        if (user && user.password === passwordHash) return user;
    } catch (e) { return null; }
    return null;
}

export async function GET({ request }) {
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const vaults = listVaults(user.username);
        return json(vaults);
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE({ request, url }) {
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Validate CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    const sessionId = getSessionIdFromRequest(request);
    
    if (!sessionId || !csrfToken || !validateCSRFToken(sessionId, csrfToken)) {
        return json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const filename = url.searchParams.get('filename');
    if (!filename) return json({ error: 'Filename required' }, { status: 400 });

    try {
        // Security check: filename should be just a name, no path traversal
        if (filename.includes('/') || filename.includes('\\')) {
            return json({ error: 'Invalid filename' }, { status: 400 });
        }

        deleteVault(user.username, filename);
        return json({ success: true });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}
