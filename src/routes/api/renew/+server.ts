import { json } from '@sveltejs/kit';
import { getAuthPayload } from '$lib/server/auth';
import { generateToken } from '$lib/server/jwt';
import { generateCSRFToken } from '$lib/server/csrf';
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

        // Generate new JWT token, preserving the 'remember' status
        const remember = !!payload.remember;
        const token = generateToken(payload.username, remember);

        // Generate new CSRF token
        const csrfToken = generateCSRFToken(token);

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
