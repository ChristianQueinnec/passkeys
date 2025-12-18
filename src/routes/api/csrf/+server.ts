import { json } from '@sveltejs/kit';
import { generateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import type { RequestEvent } from './$types';

export async function GET({ request }: RequestEvent) {
    // Get session ID from Authorization header
    const sessionId = getSessionIdFromRequest(request);
    
    if (!sessionId) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const csrfToken = generateCSRFToken(sessionId);
    
    return json({ csrfToken });
}
