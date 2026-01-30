import { json } from '@sveltejs/kit';
import { clearAll, setTestMode } from '$lib/server/rate-limiter';

export async function GET() {
    if (process.env.NODE_ENV !== 'development') {
        return json({ success: false, method: 'GET', message: 'This endpoint is only available in development' });
    }
    await clearAll();
    setTestMode(true);
    return json({ success: true, method: 'GET', message: 'Rate limit reset' });
}

export async function POST() {
    if (process.env.NODE_ENV !== 'development') {
        return json({ success: false, method: 'POST', message: 'This endpoint is only available in development' });
    }
    await clearAll();
    setTestMode(true);
    return json({ success: true, method: 'POST', message: 'Rate limit reset' });
}
