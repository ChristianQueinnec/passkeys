import { json } from '@sveltejs/kit';
import { getAuthPayload } from '$lib/server/auth';
import { generateToken } from '$lib/server/jwt';
import { generateCSRFToken, removeCSRFToken } from '$lib/server/csrf';
import { AUTH_COOKIE_NAME } from '$lib/server/auth-cookie';
import { HTTP_STATUS } from '$lib/server/http-codes';
import { handleServerError } from '$lib/server/error-handler';
import type { RequestEvent } from './$types';
import type { LoginResponse } from '$lib/server/requestTypes';
import logger from '$lib/server/logger';

export async function POST(event: RequestEvent) {
    const { request, cookies } = event;

    try {
        const payload = getAuthPayload(request);
        if (!payload) {
            return json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
        }

        logger.info({ username: payload.username }, 'Renewing token');

        const remember = !!payload.remember;

        // Evict the CSRF entry for the outgoing session before we overwrite it,
        // so that the old sid cannot be reused if it somehow outlives this renewal.
        removeCSRFToken(payload.sid);

        // Generate a new JWT, carrying the SAME sid so the client's existing
        // CSRF token remains valid — no client-side re-fetch required.
        const token = generateToken(payload.username, remember, payload.sid);

        // Issue a fresh CSRF token bound to the (preserved) sid.
        const csrfToken = generateCSRFToken(payload.sid);

        cookies.set(AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: remember ? 24 * 60 * 60 : undefined
        });

        return json({ username: payload.username, csrfToken } as LoginResponse,
            { status: HTTP_STATUS.OK });
    } catch (e: any) {
        return handleServerError(e, { operation: 'Renew' }, 'Token renewal failed');
    }
}
