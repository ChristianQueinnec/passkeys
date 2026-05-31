import { json, type RequestHandler } from '@sveltejs/kit';
import { clearAll, setTestMode } from '$lib/server/rate-limiter';

// Environment guard is enforced upstream in hooks.server.ts.
// This handler only runs when NODE_ENV === 'test'.

async function handleResetRateLimit() {
    await clearAll();
    setTestMode(true);
    return json({ success: true, message: 'Rate limit reset' });
}

export const GET: RequestHandler = () => handleResetRateLimit();
export const POST: RequestHandler = () => handleResetRateLimit();
