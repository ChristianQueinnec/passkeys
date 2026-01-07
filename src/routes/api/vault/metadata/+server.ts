import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults } from '$lib/server/storage';
import { verifyRequest } from '$lib/server/auth';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vaults = listVaults(user.username);
        if (vaults.length === 0) return json({ mtime: null }, { status: 200 });
        return json({ mtime: vaults[0].mtime.toISOString() });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}
