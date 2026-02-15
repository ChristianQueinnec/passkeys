import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults } from '$lib/server/storage';
import { verifyRequest } from '$lib/server/auth';
import { handleServerError } from '$lib/server/error-handler';
import { HTTP_STATUS } from '$lib/server/http-codes';
import type { NewerVaultResponse, ErrorResponse } from '$lib/server/requestTypes';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vaults = listVaults(user.username);
        if (vaults.length === 0) return json({ mtime: null } as NewerVaultResponse, { status: HTTP_STATUS.OK });
        return json({ mtime: vaults[0].mtime.toISOString() } as NewerVaultResponse, { status: HTTP_STATUS.OK });
    } catch (e: any) {
        return handleServerError(e, { username: user.username, operation: 'Vault metadata GET' }, 'Failed to retrieve vault metadata');
    }
}
