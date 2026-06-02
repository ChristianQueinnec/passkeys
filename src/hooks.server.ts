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

/**
 * Guard for /api/test/* endpoints.
 *
 * These endpoints exist solely to support automated testing (resetting the
 * rate-limiter, clearing vaults between test runs, etc.).  They must be
 * completely inaccessible outside of test runs, regardless of how the server
 * is started.
 *
 * The single gate is NODE_ENV === 'test'.  Checking only for
 * NODE_ENV !== 'production' is insufficient: a staging server, a Docker
 * container whose NODE_ENV was not explicitly set, or a CI environment that
 * uses 'staging' / 'ci' would all pass that check and expose the endpoints.
 *
 * Returning a bare 404 with no JSON body (no 'error' or 'success' field)
 * avoids confirming that the route exists at all.
 */
const TEST_ROUTE_PREFIX = '/api/test';

const isTestRouteAllowed = (): boolean =>
    process.env.NODE_ENV === 'test';

export const handle: Handle = async ({ event, resolve }) => {
    const start = Date.now();

    // Sanitise the path before logging to prevent log injection via
    // newlines or control characters embedded in the URL.
    const safePath = event.url.pathname.replace(/[\r\n\t\x00-\x1f\x7f]/g, '_');

    logger.info({
        method: event.request.method,
        path: safePath,
    }, 'Incoming request');

    // Block all /api/test/* requests unless we are explicitly in test mode.
    // This runs before SvelteKit resolves the route, so the handler code is
    // never reached and the route's very existence is not confirmed.
    if (event.url.pathname.startsWith(TEST_ROUTE_PREFIX) && !isTestRouteAllowed()) {
        logger.warn({
            method: event.request.method,
            path: event.url.pathname,
            NODE_ENV: process.env.NODE_ENV,
        }, 'Test endpoint blocked — NODE_ENV is not "test"');
        return new Response(null, { status: 404 });
    }

    await runMigration();

    const response = await resolve(event);

    const duration = Date.now() - start;

    logger.info({
        method: event.request.method,
        path: safePath,
        status: response.status,
        duration: `${duration}ms`,
    }, 'Response sent');

    return response;
};
