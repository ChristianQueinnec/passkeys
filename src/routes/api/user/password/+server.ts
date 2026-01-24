import { json } from '@sveltejs/kit';
import { updateUserPassword } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import { verifyRequest } from '$lib/server/auth';
import { sanitizePassword, sanitizeRequestBody } from '$lib/server/sanitizer';
import { generateToken } from '$lib/server/jwt';
import type { RequestEvent } from './$types';
import type { PasswordChangeRequest, ErrorResponse, PasswordChangeResponse } from '$lib/server/requestTypes';
import logger from '$lib/server/logger';

export async function POST({ request }: RequestEvent) {
    try {
        const result = await verifyRequest(request, { csrf: true });
        if (result instanceof Response) return result;
        const user = result;

        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request) as PasswordChangeRequest;
        const { oldPassword, newPassword } = body;

        if (!oldPassword || !newPassword) {
            return json({ error: 'Missing parameters' } as ErrorResponse, { status: 400 });
        }

        let sanitizedOldPassword: string;
        let sanitizedNewPassword: string;

        try {
            sanitizedOldPassword = sanitizePassword(oldPassword);
            sanitizedNewPassword = sanitizePassword(newPassword);
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message } as ErrorResponse, { status: 400 });
        }

        // Verify old password
        const [salt, hash] = user.password.split(':');
        const isValid = await verifyPassword(sanitizedOldPassword, hash, salt);

        if (!isValid) {
            return json({ error: 'Invalid current password' } as ErrorResponse, { status: 403 });
        }

        // Update password
        const updatedUser = updateUserPassword(user.username, sanitizedNewPassword);
        if (!updatedUser) {
            throw new Error('Failed to update password');
        }

        // Generate new JWT token (old token remains valid until expiration)
        const newToken = generateToken(user.username);

        return json({ success: true, token: newToken, username: user.username } as PasswordChangeResponse,
            { status: 200 });
    } catch (e: any) {
        logger.error({ error: e.message, username: peekUsernameFromRequest(request) }, 'Password change error');
        return json({ error: e.message || 'Failed to update password' } as ErrorResponse,
            { status: 500 });
    }
}

function peekUsernameFromRequest(request: Request): string | undefined {
    // Helper to safely peek username for logging
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        if (parts.length === 3) {
            try {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                return payload.username;
            } catch { /* ignore */ }
        }
    }
    return undefined;
}
