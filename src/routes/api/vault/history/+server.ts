import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults, deleteVault } from '$lib/server/storage';
import { verifyRequest, peekUsernameFromRequest } from '$lib/server/auth';
import { sanitizeFilename } from '$lib/server/sanitizer';
import { handleServerError } from '$lib/server/error-handler';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { ErrorResponse, DeleteVaultResponse } from '$lib/server/requestTypes';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vaults = listVaults(user.username);
        return json(vaults, { status: HTTP_STATUS.OK });
    } catch (e: any) {
        return handleServerError(e, { username: user.username, operation: 'Vault history GET' }, 'Failed to retrieve vault history');
    }
}

export const DELETE: RequestHandler = async ({ request, url }) => {
    try {
        const result = await verifyRequest(request, { csrf: true });
        if (result instanceof Response) return result;
        const user = result;

        // Sanitize filename from query parameter
        const filenameRaw = url.searchParams.get('filename');
        if (!filenameRaw) {
            return json({ error: 'Filename required' } as ErrorResponse, { status: 400 });
        }

        let filename: string;
        try {
            filename = sanitizeFilename(filenameRaw, '.vault');
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message } as ErrorResponse, { status: HTTP_STATUS.BAD_REQUEST });
        }

        // Delete vault
        deleteVault(user.username, filename);
        return json({ success: true } as DeleteVaultResponse, { status: HTTP_STATUS.OK });
    } catch (e: any) {
        return handleServerError(e, { username: peekUsernameFromRequest(request), operation: 'Vault history DELETE' }, 'Failed to delete vault history');
    }
}
