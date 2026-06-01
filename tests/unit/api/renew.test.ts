import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/auth', () => ({
    getAuthUser: vi.fn(),
    getAuthPayload: vi.fn(),
    verifyCSRF: vi.fn(),
}));
vi.mock('$lib/server/jwt', async (importActual) => {
    const real = await importActual<typeof import('$lib/server/jwt')>();
    return {
        generateToken: vi.fn(),
        REMEMBER_EXPIRY_SECONDS: real.REMEMBER_EXPIRY_SECONDS,
        SESSION_EXPIRY_SECONDS:  real.SESSION_EXPIRY_SECONDS,
    };
});
vi.mock('$lib/server/csrf', () => ({
    generateCSRFToken: vi.fn(),
    removeCSRFToken: vi.fn(),
}));

import * as renewHandler from '../../../src/routes/api/renew/+server';
import * as auth from '$lib/server/auth';
import * as jwt from '$lib/server/jwt';
import * as csrf from '$lib/server/csrf';

const { REMEMBER_EXPIRY_SECONDS, SESSION_EXPIRY_SECONDS } = jwt;

const MOCK_SID     = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const MOCK_PAYLOAD = { username: 'testuser', remember: true, sid: MOCK_SID } as any;
const MOCK_TOKEN   = 'new-mock-token';
const MOCK_CSRF    = 'new-mock-csrf';

describe('API Token Renewal', () => {
    const cookies = { set: vi.fn() };

    beforeEach(() => {
        vi.resetAllMocks();
        cookies.set.mockClear();
        // Default: CSRF check passes
        vi.mocked(auth.verifyCSRF).mockReturnValue(null);
    });

    function makeRequest(csrfHeader?: string) {
        const headers: Record<string, string> = {};
        if (csrfHeader !== undefined) headers['X-CSRF-Token'] = csrfHeader;
        return new Request('http://localhost', { method: 'POST', headers });
    }

    function makeEvent(request: Request) {
        return { request, cookies } as any;
    }

    // -------------------------------------------------------------------------
    describe('Authentication', () => {
        it('returns 401 when there is no valid JWT', async () => {
            vi.mocked(auth.getAuthPayload).mockReturnValue(null);

            const response = await renewHandler.POST(makeEvent(makeRequest('valid-csrf')));
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('auth.unauthorized');
            // CSRF must not be checked if JWT is absent
            expect(auth.verifyCSRF).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    describe('CSRF protection', () => {
        it('returns 403 when the CSRF token is missing', async () => {
            vi.mocked(auth.getAuthPayload).mockReturnValue(MOCK_PAYLOAD);
            vi.mocked(auth.verifyCSRF).mockReturnValue(
                new Response(JSON.stringify({ error: 'Missing CSRF token' }), { status: 403 })
            );

            const response = await renewHandler.POST(makeEvent(makeRequest()));
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toBe('Missing CSRF token');
            // Token must not be issued when CSRF fails
            expect(jwt.generateToken).not.toHaveBeenCalled();
            expect(csrf.generateCSRFToken).not.toHaveBeenCalled();
            expect(cookies.set).not.toHaveBeenCalled();
        });

        it('returns 403 when the CSRF token is invalid', async () => {
            vi.mocked(auth.getAuthPayload).mockReturnValue(MOCK_PAYLOAD);
            vi.mocked(auth.verifyCSRF).mockReturnValue(
                new Response(JSON.stringify({ error: 'Invalid CSRF token' }), { status: 403 })
            );

            const response = await renewHandler.POST(makeEvent(makeRequest('wrong-token')));
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toBe('Invalid CSRF token');
            expect(jwt.generateToken).not.toHaveBeenCalled();
        });

        it('calls verifyCSRF after a valid JWT, before issuing a new token', async () => {
            vi.mocked(auth.getAuthPayload).mockReturnValue(MOCK_PAYLOAD);
            vi.mocked(auth.verifyCSRF).mockReturnValue(null);  // pass
            vi.mocked(jwt.generateToken).mockReturnValue(MOCK_TOKEN);
            vi.mocked(csrf.generateCSRFToken).mockReturnValue(MOCK_CSRF);

            await renewHandler.POST(makeEvent(makeRequest('valid-csrf')));

            // verifyCSRF must be called exactly once
            expect(auth.verifyCSRF).toHaveBeenCalledOnce();

            // Verify call order: CSRF check before token generation
            const csrfOrder     = vi.mocked(auth.verifyCSRF).mock.invocationCallOrder[0];
            const generateOrder = vi.mocked(jwt.generateToken).mock.invocationCallOrder[0];
            expect(csrfOrder).toBeLessThan(generateOrder);
        });
    });

    // -------------------------------------------------------------------------
    describe('Successful renewal', () => {
        beforeEach(() => {
            vi.mocked(auth.getAuthPayload).mockReturnValue(MOCK_PAYLOAD);
            vi.mocked(auth.verifyCSRF).mockReturnValue(null);
            vi.mocked(jwt.generateToken).mockReturnValue(MOCK_TOKEN);
            vi.mocked(csrf.generateCSRFToken).mockReturnValue(MOCK_CSRF);
        });

        it('returns 200 with username and new CSRF token', async () => {
            const response = await renewHandler.POST(makeEvent(makeRequest('valid-csrf')));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.username).toBe('testuser');
            expect(data.csrfToken).toBe(MOCK_CSRF);
        });

        it('evicts the old CSRF entry before issuing the new one', async () => {
            await renewHandler.POST(makeEvent(makeRequest('valid-csrf')));

            const removeOrder   = vi.mocked(csrf.removeCSRFToken).mock.invocationCallOrder[0];
            const generateOrder = vi.mocked(csrf.generateCSRFToken).mock.invocationCallOrder[0];

            expect(csrf.removeCSRFToken).toHaveBeenCalledWith(MOCK_SID);
            expect(removeOrder).toBeLessThan(generateOrder);
        });

        it('carries the stable sid forward into the new JWT', async () => {
            await renewHandler.POST(makeEvent(makeRequest('valid-csrf')));

            expect(jwt.generateToken).toHaveBeenCalledWith('testuser', true, MOCK_SID);
        });

        it('keys the new CSRF token on sid, not on the JWT string', async () => {
            await renewHandler.POST(makeEvent(makeRequest('valid-csrf')));

            expect(csrf.generateCSRFToken).toHaveBeenCalledWith(MOCK_SID);
        });

        it('sets the auth cookie with correct attributes (remember=true)', async () => {
            await renewHandler.POST(makeEvent(makeRequest('valid-csrf')));

            expect(cookies.set).toHaveBeenCalledWith(
                'passkeys_auth',
                MOCK_TOKEN,
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    maxAge: REMEMBER_EXPIRY_SECONDS
                })
            );
        });

        it('sets maxAge to SESSION_EXPIRY_SECONDS (not undefined) when remember=false', async () => {
            vi.mocked(auth.getAuthPayload).mockReturnValue(
                { ...MOCK_PAYLOAD, remember: false }
            );

            await renewHandler.POST(makeEvent(makeRequest('valid-csrf')));

            const cookieOptions = vi.mocked(cookies.set).mock.calls[0][2] as any;
            expect(cookieOptions.maxAge).toBe(SESSION_EXPIRY_SECONDS);
            expect(cookieOptions.maxAge).not.toBeUndefined();
        });
    });
});
