import type { Handle } from '@sveltejs/kit';
import { getUsers } from '$lib/server/users';
import logger from '$lib/server/logger';

// Migrate users with unciphered passwords asap
const migrateUsers = ((function () {
    let done = false;
    return async function () {
        if (done) return;
        await getUsers();
        done = true;
    };
})());

export const handle: Handle = async ({ event, resolve }) => {
    const start = Date.now();

    logger.info({
        method: event.request.method,
        path: event.url.pathname,
    }, 'Incoming request');

    await migrateUsers();

    const response = await resolve(event);

    const duration = Date.now() - start;

    logger.info({
        method: event.request.method,
        path: event.url.pathname,
        status: response.status,
        duration: `${duration}ms`,
    }, 'Response sent');

    return response;
};
