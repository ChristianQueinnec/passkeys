import { json } from '@sveltejs/kit';
import type { User } from '$lib/types';
import { getAuthUser } from './auth';
import { verifyCSRF } from './csrf';
import { HTTP_STATUS } from './http-codes';

/** Authenticate a request and optionally require CSRF protection. */
export async function verifyRequest(
    request: Request,
    options: { csrf?: boolean } = {}
): Promise<User | Response> {
    const user = getAuthUser(request);
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    if (options.csrf) {
        const csrfError = verifyCSRF(request);
        if (csrfError) return csrfError;
    }

    return user;
}
