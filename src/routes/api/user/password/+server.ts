import { json } from '@sveltejs/kit';
import { getUser, updateUserPassword } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import type { RequestEvent } from './$types';

// Helper to validate auth token similar to vault endpoint
function getAuthUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, ...rest] = decoded.split(':');
        // Basic validation: user exists and password hash matches token's hash
        // In a real app we'd decode a signed JWT
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

export async function POST({ request }: RequestEvent) {
    const user = getAuthUser(request);
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
        return json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify old password
    const [salt, hash] = user.password.split(':');
    const isValid = await verifyPassword(oldPassword, hash, salt);

    if (!isValid) {
        return json({ error: 'Invalid current password' }, { status: 403 });
    }

    try {
        updateUserPassword(user.username, newPassword);
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to update password' }, { status: 500 });
    }
}
