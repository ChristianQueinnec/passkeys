import { json, type RequestHandler } from '@sveltejs/kit';
import { getLatestVault, saveVault } from '$lib/server/storage';
import { verifyRequest } from '$lib/server/auth';
import { sanitizeVaultContent, sanitizeRequestBody } from '$lib/server/sanitizer';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vault = getLatestVault(user.username);
        if (!vault) return json({ error: 'Not found' }, { status: 404 });
        return json(JSON.parse(vault));
    } catch (e: any) {
        console.error('Vault GET error:', e);
        return json({ error: 'Internal error' }, { status: 500 });
    }
}

export const POST: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request, { csrf: true });
    if (result instanceof Response) return result;
    const user = result;

    try {
        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);
        const { content } = body;

        if (!content) {
            return json({ error: 'Missing content' }, { status: 400 });
        }

        let sanitizedContent: string;
        try {
            sanitizedContent = sanitizeVaultContent(content);
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message }, { status: 400 });
        }

        // Save vault
        const filename = saveVault(user.username, sanitizedContent);
        return json({ success: true, filename });
    } catch (e: any) {
        console.error('[API] Vault POST error:', e.message);
        return json({ error: e.message || 'Internal error' }, { status: 500 });
    }
}
