import { json } from '@sveltejs/kit';
import { getLatestVault, saveVault } from '$lib/server/storage';
import { getUser } from '$lib/server/users';

// Middleware-like auth check helper
function getAuthUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, ...rest] = decoded.split(':');
        // We just check existence for now, similar to previous middleware. 
        // Ideally we re-verify hash but performance-wise existence + correct format is okay for MVP token "validation" 
        // if we assume token = base64(user:hash). 
        // For strictness let's check exact match like before.
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

export async function GET({ request }) {
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const vault = getLatestVault(user.username);
        if (!vault) return json({ error: 'Not found' }, { status: 404 });
        return json(JSON.parse(vault));
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function POST({ request }) {
    const user = getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json();
    if (!content) return json({ error: 'Missing content' }, { status: 400 });

    try {
        const filename = saveVault(user.username, content);
        return json({ success: true, filename });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}
