import { json } from '@sveltejs/kit';
import { clearAll } from '$lib/server/rate-limiter';

// Add environment check at top of each test endpoint
if (process.env.NODE_ENV === 'production') {
    return json({ error: 'Not found' }, { status: 404 });
}

export async function GET() {
    clearAll();
    return json({ success: true, method: 'GET' });
}

export async function POST() {
    clearAll();
    return json({ success: true, method: 'POST' });
}
