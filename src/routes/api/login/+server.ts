import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import { sanitizeUsername, sanitizePassword, sanitizeRequestBody } from '$lib/server/sanitizer';
import { generateToken } from '$lib/server/jwt';
import { isBlocked, recordFailure, recordSuccess, getDelay } from '$lib/server/rate-limiter';
import type { RequestEvent } from './$types';
import type { User } from '$lib/types';
import type { LoginRequest, LoginResponse, ErrorResponse } from '$lib/server/requestTypes';

export async function POST(event: RequestEvent) {
    const { request, getClientAddress } = event;
    const ip = getClientAddress();

    if (isBlocked(ip)) {
        return json({ error: 'Too many failed attempts. Please try again later.' } as ErrorResponse, { status: 429 });
    }

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

        // Verify password - do this even if user not found to prevent timing attacks
        let isValid = false;
        if (user) {
            const [salt, hash] = user.password.split(':');
            isValid = await verifyPassword(sanitizedPassword, hash, salt);
        } else {
            // Perform dummy verification with random salt to maintain consistent timing
            await verifyPassword(sanitizedPassword, 'dummy'.repeat(16), 'dummy'.repeat(8));
        }

        // Return same error message regardless of whether user exists or password is wrong
        // This prevents username enumeration attacks
        if (!isValid) {
            recordFailure(ip);
            const delay = getDelay(ip);
            // Add incremental delay to prevent brute force
            await new Promise(resolve => setTimeout(resolve, Math.max(100, delay)));
            return json({ error: 'Invalid credentials' } as ErrorResponse, { status: 401 });
        }

        // Reset rate limiter on successful login
        recordSuccess(ip);

        // Generate JWT token
        const token = generateToken(sanitizedUsername);

        return json({ token, username: sanitizedUsername } as LoginResponse,
            { status: 200 });
    } catch (e: any) {
        console.error('[API] Login error:', e.message);
        return json({ error: e.message || 'Internal Error' } as ErrorResponse, { status: 500 });
    }
}
