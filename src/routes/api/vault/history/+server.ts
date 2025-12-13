import { json } from '@sveltejs/kit';
import { listVaults, getVault } from '$lib/server/storage';
import { getUser } from '$lib/server/users';

function getAuthUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, ...rest] = decoded.split(':');
        const passwordHash = rest.join(':');
        const user = getUser(username);
        if (user && user.password === passwordHash) return user;
    } catch (e) { return null; }
    return null;
}

export async function GET({ request }) {
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Handle single file fetch if query param exists (mirroring previous logic if needed, 
    // or we can make a separate route /api/vault/history/[filename])
    // The previous implementation had /api/vault/history and /api/vault/history/:filename
    // SvelteKit: +server.ts handles /api/vault/history. 
    // For /:filename we need another dir or handle query param.
    // Let's stick to list here.

    try {
        const vaults = listVaults(user.username);
        return json(vaults);
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}
