import { json } from '@sveltejs/kit';
import { updateUserPassword } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import { verifyRequest } from '$lib/server/auth';
import { sanitizePassword, sanitizeRequestBody } from '$lib/server/sanitizer';
import type { RequestEvent } from './$types';

export async function POST({ request }: RequestEvent) {
    try {
        const result = await verifyRequest(request, { csrf: true });
        if (result instanceof Response) return result;
        const user = result;

        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);
        const { oldPassword, newPassword } = body;

        if (!oldPassword || !newPassword) {
            return json({ error: 'Missing parameters' }, { status: 400 });
        }

        let sanitizedOldPassword: string;
        let sanitizedNewPassword: string;

        try {
            sanitizedOldPassword = sanitizePassword(oldPassword);
            sanitizedNewPassword = sanitizePassword(newPassword);
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message }, { status: 400 });
        }

        // Verify old password
        const [salt, hash] = user.password.split(':');
        const isValid = await verifyPassword(sanitizedOldPassword, hash, salt);

        if (!isValid) {
            return json({ error: 'Invalid current password' }, { status: 403 });
        }

        // Update password
        const updatedUser = updateUserPassword(user.username, sanitizedNewPassword);
        if (!updatedUser) {
            throw new Error('Failed to update password');
        }

        const newToken = Buffer.from(`${user.username}:${updatedUser.password}`).toString('base64');
        return json({ success: true, token: newToken, username: user.username });
    } catch (e: any) {
        console.error('Password change error:', e.message);
        return json({ error: e.message || 'Failed to update password' }, { status: 500 });
    }
}
