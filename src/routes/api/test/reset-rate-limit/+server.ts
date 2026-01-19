import { json } from '@sveltejs/kit';
import { clearAll } from '$lib/server/rate-limiter';

export async function GET() {
    clearAll();
    return json({ success: true, method: 'GET' });
}

export async function POST() {
    clearAll();
    return json({ success: true, method: 'POST' });
}
