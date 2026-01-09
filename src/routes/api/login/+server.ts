import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import { sanitizeUsername, sanitizePassword, sanitizeRequestBody } from '$lib/server/sanitizer';
import type { RequestEvent } from './$types';
import type { User } from '$lib/types';
import type { LoginRequest, LoginResponse, ErrorResponse } from '$lib/server/requestTypes';

export async function POST({ request }: RequestEvent) {
    try {
        const body = await sanitizeRequestBody(request);
        const { username, password } = body as LoginRequest;

        // Validate required fields
        if (!username || !password) {
            return json({ error: 'Username and password required' } as ErrorResponse,
                { status: 400 });
        }

        // Sanitize inputs
        let sanitizedUsername: string;
        let sanitizedPassword: string;

        try {
            sanitizedUsername = sanitizeUsername(username);
            sanitizedPassword = sanitizePassword(password);
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message } as ErrorResponse, { status: 400 });
        }

        // Authenticate user
        const user: User | undefined = getUser(sanitizedUsername);
        if (!user) {
            return json({ error: 'Invalid credentials1' } as ErrorResponse, { status: 401 });
        }

        const [salt, hash] = user.password.split(':');
        const isValid = await verifyPassword(sanitizedPassword, hash, salt);

        if (isValid) {
            const token = Buffer.from(`${sanitizedUsername}:${user.password}`).toString('base64');
            return json({ token, username: sanitizedUsername } as LoginResponse,
                { status: 200 });
        }

        return json({ error: 'Invalid credentials2' } as ErrorResponse, { status: 401 });
    } catch (e: any) {
        console.error('[API] Login error:', e.message);
        return json({ error: e.message || 'Internal Error' } as ErrorResponse, { status: 500 });
    }
}
