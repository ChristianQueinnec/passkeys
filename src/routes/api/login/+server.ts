import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import { sanitizeUsername, sanitizePassword, sanitizeRequestBody, validateObject } from '$lib/server/sanitizer';
import { generateToken } from '$lib/server/jwt';
import { isBlocked, recordFailure, recordSuccess, getDelay } from '$lib/server/rate-limiter';
import { handleServerError } from '$lib/server/error-handler';
import { generateCSRFToken } from '$lib/server/csrf';
import { AUTH_COOKIE_NAME } from '$lib/server/auth-cookie';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { RequestEvent } from './$types';
import type { User } from '$lib/types';
import type { LoginRequest, LoginResponse, ErrorResponse } from '$lib/server/requestTypes';
import logger from '$lib/server/logger';

export async function POST(event: RequestEvent) {
    const { request, getClientAddress, cookies } = event;
    const ip = getClientAddress();

    if (isBlocked(ip)) {
        return json({ error: 'Too many failed attempts. Please try again later.' } as ErrorResponse, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
    }

    try {
        const body = await sanitizeRequestBody(request);

        let credentials: Pick<LoginRequest, 'username' | 'password'>;
        try {
            credentials = validateObject<Pick<LoginRequest, 'username' | 'password'>>(body, {
                username: sanitizeUsername,
                password: sanitizePassword
            });
        } catch (validationError: any) {
            return json({ error: validationError.message } as ErrorResponse, { status: HTTP_STATUS.BAD_REQUEST });
        }

        const { username: sanitizedUsername, password: sanitizedPassword } = credentials;
        const trustDevice = body.trustDevice === true;

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
            await recordFailure(ip);
            const delay = getDelay(ip);
            // Add incremental delay to prevent brute force
            await new Promise(resolve => setTimeout(resolve, Math.max(100, delay)));
            return json({ error: 'Invalid credentials' } as ErrorResponse, { status: HTTP_STATUS.UNAUTHORIZED });
        }

        // Reset rate limiter on successful login
        await recordSuccess(ip);

        // Generate JWT token
        const token = generateToken(sanitizedUsername, trustDevice);

        // Generate CSRF token (tied to the JWT session)
        const csrfToken = generateCSRFToken(token);

        cookies.set(AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: trustDevice ? 24 * 60 * 60 : undefined
        });

        return json({ username: sanitizedUsername, csrfToken } as LoginResponse,
            { status: HTTP_STATUS.OK });
    } catch (e: any) {
        return handleServerError(e, { ip, operation: 'Login' }, 'Authentication failed');
    }
}
