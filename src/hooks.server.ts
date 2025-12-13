import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const start = Date.now();

    const response = await resolve(event);

    // Simple logging format: [TIMESTAMP] METHOD PATH STATUS DURATION
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] ${event.request.method} ${event.url.pathname} ${response.status} ${duration}ms`);

    return response;
};
