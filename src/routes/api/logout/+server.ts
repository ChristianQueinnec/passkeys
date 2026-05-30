import { json } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME, getAuthTokenFromRequest } from '$lib/server/auth-cookie';
import { removeCSRFToken } from '$lib/server/csrf';
import { verifyToken } from '$lib/server/jwt';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { RequestEvent } from './$types';

export async function POST({ request, cookies }: RequestEvent) {
    const rawToken = getAuthTokenFromRequest(request);
    if (rawToken) {
        // Extract the stable session ID from the verified JWT so we clean up
        // the correct CSRF map entry.  verifyToken returns null for expired /
        // tampered tokens — in that case there is nothing in the map to remove.
        const payload = verifyToken(rawToken);
        if (payload) {
            removeCSRFToken(payload.sid);
        }
    }

    cookies.delete(AUTH_COOKIE_NAME, { path: '/' });

    return json({ success: true }, { status: HTTP_STATUS.OK });
}
