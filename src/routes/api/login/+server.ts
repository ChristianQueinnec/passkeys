import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/users';
import { verifyPassword } from '$lib/server/crypto-utils';
import type { RequestEvent } from './$types';
import type { User } from '$lib/types';

export async function POST({ request }: RequestEvent) {
    const { username, password } = await request.json();

    if (!username || !password) {
        return json({ error: 'Username and password required' }, { status: 400 });
    }

    try {
        const user: User | undefined = getUser(username);
        if (!user) {
            return json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const [salt, hash] = user.password.split(':');
        const isValid = await verifyPassword(password, hash, salt);

        if (isValid) {
            const token = Buffer.from(`${username}:${user.password}`).toString('base64');
            return json({ token, username });
        }
        return json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (e) {
        return json({ error: 'Internal Error' }, { status: 500 });
    }
}
