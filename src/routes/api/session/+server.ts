import { json } from '@sveltejs/kit';
import { getAuthUser } from '$lib/server/auth';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { RequestEvent } from './$types';
import type { ErrorResponse, SessionResponse } from '$lib/server/requestTypes';

export async function GET({ request }: RequestEvent) {
    const user = getAuthUser(request);
    if (!user) {
        return json({ error: 'Unauthorized' } as ErrorResponse, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    return json({ username: user.username } as SessionResponse, { status: HTTP_STATUS.OK });
}
