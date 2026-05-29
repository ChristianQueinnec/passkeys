import { json } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME, getAuthTokenFromRequest } from '$lib/server/auth-cookie';
import { removeCSRFToken } from '$lib/server/csrf';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { RequestEvent } from './$types';

export async function POST({ request, cookies }: RequestEvent) {
    const token = getAuthTokenFromRequest(request);
    if (token) {
        removeCSRFToken(token);
    }

    cookies.delete(AUTH_COOKIE_NAME, { path: '/' });

    return json({ success: true }, { status: HTTP_STATUS.OK });
}
