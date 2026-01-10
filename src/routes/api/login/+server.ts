import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import { sanitizeUsername, sanitizePassword, sanitizeRequestBody } from '$lib/server/sanitizer';
import { generateToken } from '$lib/server/jwt';
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
            // Add small constant delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 100));
            return json({ error: 'Invalid credentials' } as ErrorResponse, { status: 401 });
        }

        // Generate JWT token
        const token = generateToken(sanitizedUsername);

        return json({ token, username: sanitizedUsername } as LoginResponse,
            { status: 200 });
    } catch (e: any) {
        console.error('[API] Login error:', e.message);
        return json({ error: e.message || 'Internal Error' } as ErrorResponse, { status: 500 });
    }
}
