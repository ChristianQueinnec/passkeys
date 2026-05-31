import { json } from '@sveltejs/kit';
import { generateCSRFToken, getSessionIdFromRequest } from '$lib/server/csrf';
import { getAuthUser } from '$lib/server/auth';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { RequestEvent } from './$types';
import type { ErrorResponse, CSRFTokenResponse } from '$lib/server/requestTypes';

export async function GET({ request }: RequestEvent) {
    // Verify authentication before generating CSRF token
    const user = getAuthUser(request);
    if (!user) {
        return json({ error: 'auth.unauthorized' } as ErrorResponse, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    // Get session ID from the auth cookie
    const sessionId = getSessionIdFromRequest(request);

    if (!sessionId) {
        return json({ error: 'auth.unauthorized' } as ErrorResponse, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const csrfToken = generateCSRFToken(sessionId);

    return json({ csrfToken } as CSRFTokenResponse, { status: HTTP_STATUS.OK });
}
