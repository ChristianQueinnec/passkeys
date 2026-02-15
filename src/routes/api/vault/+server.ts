import { json, type RequestHandler } from '@sveltejs/kit';
import { getLatestVault, saveVault } from '$lib/server/storage';
import { verifyRequest } from '$lib/server/auth';
import { sanitizeVaultContent, sanitizeRequestBody } from '$lib/server/sanitizer';
import { handleServerError } from '$lib/server/error-handler';
import type { ErrorResponse, SaveVaultResponse, SaveVaultRequest } from '$lib/server/requestTypes';

export const GET: RequestHandler = async ({ request }) => {
    const result = await verifyRequest(request);
    if (result instanceof Response) return result;
    const user = result;

    try {
        const vault = getLatestVault(user.username);
        if (!vault) return json({ error: 'Not found' } as ErrorResponse, { status: 404 });
        return json(JSON.parse(vault));
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
        const body = await sanitizeRequestBody(request) as SaveVaultRequest;
        const { content } = body;

        if (!content) {
            return json({ error: 'Missing content' } as ErrorResponse, { status: 400 });
        }

        let sanitizedContent: string;
        try {
            sanitizedContent = sanitizeVaultContent(content);
        } catch (sanitizeError: any) {
            return json({ error: sanitizeError.message } as ErrorResponse, { status: 400 });
        }

        // Save vault
        const filename = await saveVault(user.username, sanitizedContent);
        return json({ success: true, filename } as SaveVaultResponse, { status: 200 });
    } catch (e: any) {
        return handleServerError(e, { username: user.username, operation: 'Vault POST' }, 'Failed to save vault');
    }
}
