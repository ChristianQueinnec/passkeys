import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// We test the guard logic in isolation by importing hooks.server and calling
// handle() directly with a minimal mock event.  The migration side-effect is
// mocked out so tests don't touch the filesystem.
// ---------------------------------------------------------------------------

vi.mock('$lib/server/users', () => ({
    migrateUsersFile: vi.fn().mockResolvedValue(undefined),
}));

// Import AFTER mocks are registered
const { handle } = await import('../../../src/hooks.server');

function makeEvent(pathname: string, method = 'GET') {
    return {
        url: new URL(`http://localhost${pathname}`),
        request: new Request(`http://localhost${pathname}`, { method }),
    } as any;
}

// Minimal resolve stub that returns 200
const resolve = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

describe('hooks.server — /api/test/* guard', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.clearAllMocks();
        resolve.mockResolvedValue(new Response(null, { status: 200 }));
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    // -----------------------------------------------------------------------
    describe('when NODE_ENV is not "test"', () => {
        const blockedEnvs = ['production', 'development', 'staging', 'ci', undefined] as const;

        for (const env of blockedEnvs) {
            it(`returns 404 with empty body for NODE_ENV=${JSON.stringify(env)}`, async () => {
                process.env.NODE_ENV = env as string;
                const event = makeEvent('/api/test/reset-rate-limit');

                const response = await handle({ event, resolve });

                expect(response.status).toBe(404);
                expect(await response.text()).toBe('');   // no body — doesn't confirm route exists
                expect(resolve).not.toHaveBeenCalled();
            });
        }

        it('blocks /api/test/cleanup-vault', async () => {
            process.env.NODE_ENV = 'production';
            const response = await handle({ event: makeEvent('/api/test/cleanup-vault'), resolve });
            expect(response.status).toBe(404);
            expect(resolve).not.toHaveBeenCalled();
        });

        it('blocks sub-paths under /api/test/', async () => {
            process.env.NODE_ENV = 'production';
            const response = await handle({ event: makeEvent('/api/test/anything/deep'), resolve });
            expect(response.status).toBe(404);
            expect(resolve).not.toHaveBeenCalled();
        });

        it('does NOT block /api/login (non-test route)', async () => {
            process.env.NODE_ENV = 'production';
            const response = await handle({ event: makeEvent('/api/login'), resolve });
            expect(response.status).toBe(200);
            expect(resolve).toHaveBeenCalledOnce();
        });

        it('does NOT block /api/vault (non-test route)', async () => {
            process.env.NODE_ENV = 'production';
            const response = await handle({ event: makeEvent('/api/vault'), resolve });
            expect(response.status).toBe(200);
            expect(resolve).toHaveBeenCalledOnce();
        });
    });

    // -----------------------------------------------------------------------
    describe('when NODE_ENV is "test"', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'test';
        });

        it('passes /api/test/reset-rate-limit through to the handler', async () => {
            const response = await handle({ event: makeEvent('/api/test/reset-rate-limit'), resolve });
            expect(response.status).toBe(200);
            expect(resolve).toHaveBeenCalledOnce();
        });

        it('passes /api/test/cleanup-vault through to the handler', async () => {
            const response = await handle({ event: makeEvent('/api/test/cleanup-vault'), resolve });
            expect(response.status).toBe(200);
            expect(resolve).toHaveBeenCalledOnce();
        });

        it('also passes normal routes through', async () => {
            const response = await handle({ event: makeEvent('/api/login'), resolve });
            expect(response.status).toBe(200);
            expect(resolve).toHaveBeenCalledOnce();
        });
    });
});
