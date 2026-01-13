import type { Handle } from '@sveltejs/kit';
import { getUsers } from '$lib/server/users';

// Migrate users with unciphered passwords asap
const migrateUsers = ((function () {
    let done = false;
    return async function () {
        if ( done ) return;
        await getUsers();
        done = true;
    };
})());

export const handle: Handle = async ({ event, resolve }) => {
    const start = Date.now();
    let timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${event.request.method} ${event.url.pathname}`);

    await migrateUsers();

    const response = await resolve(event);

    // Simple logging format: [TIMESTAMP] METHOD PATH STATUS DURATION
    const duration = Date.now() - start;
    timestamp = new Date().toISOString();

    console.log(`[${timestamp}] ${event.request.method} ${event.url.pathname} ${response.status} ${duration}ms`);

    return response;
};
