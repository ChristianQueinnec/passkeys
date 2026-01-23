import { json } from '@sveltejs/kit';
import { clearAll } from '$lib/server/rate-limiter';

export async function GET() {
    // Add environment check at top of each test endpoint
    if (process.env.NODE_ENV === 'production') {
        return json({ error: 'Not found' }, { status: 404 });
    }
    await clearAll();
    return json({ success: true, method: 'GET' });
}

export async function POST() {
    // Add environment check at top of each test endpoint
    if (process.env.NODE_ENV === 'production') {
        return json({ error: 'Not found' }, { status: 404 });
    }
    await clearAll();
    return json({ success: true, method: 'POST' });
}
