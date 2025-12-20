import { json, type RequestHandler } from '@sveltejs/kit';
import { listVaults } from '$lib/server/storage';
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
        if (user && user.password === passwordHash) {
            return user;
        }
    } catch (e) {
        return null;
    }
    return null;
}

export const GET: RequestHandler = async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const vaults = listVaults(user.username);
        if (vaults.length === 0) return json({ mtime: null }, { status: 200 });
        return json({ mtime: vaults[0].mtime.toISOString() });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}
