import { json, type RequestHandler } from '@sveltejs/kit';
import { getLatestVault, saveVault } from '$lib/server/storage';
import { verifyRequest } from '$lib/server/auth';
import { sanitizeVaultContent, sanitizeRequestBody, validateObject } from '$lib/server/sanitizer';
import { handleServerError } from '$lib/server/error-handler';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { ErrorResponse, SaveVaultResponse, SaveVaultRequest } from '$lib/server/requestTypes';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vault = await getLatestVault(user.username);
        if (!vault) return json({ error: 'common.not_found' } as ErrorResponse, { status: HTTP_STATUS.NOT_FOUND });
        // Return the raw string directly — no parse+re-stringify round-trip that
        // could silently alter the data (large integers, undefined values, etc.).
        return new Response(vault, {
            status: HTTP_STATUS.OK,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return handleServerError(e, { username: user.username, operation: 'Vault GET' }, 'Failed to retrieve vault');
    }
}

export const POST: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request, { csrf: true });
    if (result instanceof Response) return result;
    const user = result;

    try {
        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);

        let vaultReq: SaveVaultRequest;
        try {
            vaultReq = validateObject<SaveVaultRequest>(body, {
                content: sanitizeVaultContent
            });
        } catch (validationError: any) {
            return json({ error: validationError.message } as ErrorResponse, { status: HTTP_STATUS.BAD_REQUEST });
        }

        const { content: sanitizedContent } = vaultReq;

        // Save vault
        const filename = await saveVault(user.username, sanitizedContent);
        return json({ success: true, filename } as SaveVaultResponse, { status: HTTP_STATUS.OK });
    } catch (e: any) {
        return handleServerError(e, { username: user.username, operation: 'Vault POST' }, 'Failed to save vault');
    }
}
