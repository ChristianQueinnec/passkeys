import type { Handle } from '@sveltejs/kit';
import { migrateUsersFile } from '$lib/server/users';
import logger from '$lib/server/logger';

// Run the plain-text password migration exactly once at startup, under a lock.
// Subsequent requests skip this entirely.
const runMigration = (function () {
    let promise: Promise<void> | null = null;
    return function () {
        if (!promise) {
            promise = migrateUsersFile().catch(e => {
                logger.error({ error: e.message }, 'Startup password migration failed');
            });
        }
        return promise;
    };
})();

export const handle: Handle = async ({ event, resolve }) => {
    const start = Date.now();

    logger.info({
        method: event.request.method,
        path: event.url.pathname,
    }, 'Incoming request');

    await runMigration();

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
