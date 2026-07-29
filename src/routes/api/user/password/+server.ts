import { json } from '@sveltejs/kit';
import { updateUserPassword } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import { peekUsernameFromRequest } from '$lib/server/auth';
import { verifyRequest } from '$lib/server/request-verification';
import { sanitizePassword, sanitizeRequestBody, validateObject } from '$lib/server/sanitizer';
import { handleServerError } from '$lib/server/error-handler';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { RequestEvent } from './$types';
import type { PasswordChangeRequest, ErrorResponse, PasswordChangeResponse } from '$lib/server/requestTypes';

export async function POST({ request }: RequestEvent) {
    try {
        const result = await verifyRequest(request, { csrf: true });
        if (result instanceof Response) return result;
        const user = result;

        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);

        let pwdReq: PasswordChangeRequest;
        try {
            pwdReq = validateObject<PasswordChangeRequest>(body, {
                oldPassword: sanitizePassword,
                newPassword: sanitizePassword
            });
        } catch (validationError: any) {
            return json({ error: validationError.message } as ErrorResponse, { status: HTTP_STATUS.BAD_REQUEST });
        }

        const { oldPassword: sanitizedOldPassword, newPassword: sanitizedNewPassword } = pwdReq;

        // Verify old password
        const [salt, hash] = user.password.split(':');
        const isValid = await verifyPassword(sanitizedOldPassword, hash, salt);

        if (!isValid) {
            return json({ error: 'auth.incorrect_login_password' } as ErrorResponse, { status: HTTP_STATUS.FORBIDDEN });
        }

        // Update password
        const updatedUser = await updateUserPassword(user.username, sanitizedNewPassword);
        if (!updatedUser) {
            throw new Error('Failed to update password');
        }

        return json({ success: true, username: user.username } as PasswordChangeResponse,
            { status: HTTP_STATUS.OK });
    } catch (e: any) {
        return handleServerError(e, { username: peekUsernameFromRequest(request), operation: 'Password change' }, 'Failed to update password');
    }
}
