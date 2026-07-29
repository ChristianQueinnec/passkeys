import { json } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME } from '$lib/server/auth-cookie';
import { verifyRequest } from '$lib/server/request-verification';
import { removeCSRFToken } from '$lib/server/csrf';
import { getAuthPayload } from '$lib/server/auth';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { RequestEvent } from './$types';

export async function POST({ request, cookies }: RequestEvent) {
    // Require a valid JWT + CSRF token before accepting a logout.
    // Without this, any cross-site page could silently log the user out
    // (logout CSRF), which — while less damaging than data-mutation CSRF —
    // is a denial-of-session that can be chained with session fixation.
    const result = await verifyRequest(request, { csrf: true });
    if (result instanceof Response) return result;

    // removeCSRFToken is a no-op for the stateless HMAC implementation but
    // is kept here so that any future stateful implementation works correctly
    // without needing to touch this file.
    const payload = getAuthPayload(request);
    if (payload) {
        removeCSRFToken(payload.sid);
    }

    cookies.delete(AUTH_COOKIE_NAME, { path: '/' });

    return json({ success: true }, { status: HTTP_STATUS.OK });
}
