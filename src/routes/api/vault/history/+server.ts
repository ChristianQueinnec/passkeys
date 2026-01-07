import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults, deleteVault } from '$lib/server/storage';
import { verifyRequest } from '$lib/server/auth';
import { sanitizeFilename } from '$lib/server/sanitizer';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vaults = listVaults(user.username);
        return json(vaults);
    } catch (e: any) {
        console.error('Vault history GET error:', e);
        return json({ error: 'Internal error' }, { status: 500 });
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
            return json({ error: 'Filename required' }, { status: 400 });
        }

        let filename: string;
        try {
            filename = sanitizeFilename(filenameRaw, '.vault');
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message }, { status: 400 });
        }

        // Delete vault
        deleteVault(user.username, filename);
        return json({ success: true });
    } catch (e: any) {
        console.error('Vault history DELETE error:', e);
        return json({ error: 'Internal error' }, { status: 500 });
    }
}
