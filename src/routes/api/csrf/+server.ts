import { json } from '@sveltejs/kit';
import { generateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import { getAuthUser } from '$lib/server/auth';
import type { RequestEvent } from './$types';

export async function GET({ request }: RequestEvent) {
    // Verify authentication before generating CSRF token
    const user = getAuthUser(request);
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session ID from Authorization header
    const sessionId = getSessionIdFromRequest(request);

    if (!sessionId) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const csrfToken = generateCSRFToken(sessionId);

    return json({ csrfToken });
}
