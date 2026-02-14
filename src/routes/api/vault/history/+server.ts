import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults, deleteVault } from '$lib/server/storage';
import { verifyRequest, peekUsernameFromRequest } from '$lib/server/auth';
import { sanitizeFilename } from '$lib/server/sanitizer';
import type { ErrorResponse, DeleteVaultResponse } from '$lib/server/requestTypes';
import logger from '$lib/server/logger';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vaults = listVaults(user.username);
        return json(vaults);
    } catch (e: any) {
        logger.error({ error: e.message, username: user.username }, 'Vault history GET error');
        return json({ error: 'Internal error' } as ErrorResponse, { status: 500 });
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
            return json({ error: sanitizeError.message } as ErrorResponse, { status: 400 });
        }

        // Delete vault
        deleteVault(user.username, filename);
        return json({ success: true } as DeleteVaultResponse, { status: 200 });
    } catch (e: any) {
        logger.error({ error: e.message, username: peekUsernameFromRequest(request) }, 'Vault history DELETE error');
        return json({ error: 'Internal error' } as ErrorResponse, { status: 500 });
    }
}
