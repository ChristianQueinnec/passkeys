import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults } from '$lib/server/storage';
import { verifyRequest } from '$lib/server/auth';
import type { NewerVaultResponse, ErrorResponse } from '$lib/server/requestTypes';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vaults = listVaults(user.username);
        if (vaults.length === 0) return json({ mtime: null } as NewerVaultResponse, { status: 200 });
        return json({ mtime: vaults[0].mtime.toISOString() } as NewerVaultResponse, { status: 200 });
    } catch (e: any) {
        return json({ error: e.message } as ErrorResponse, { status: 500 });
    }
}
