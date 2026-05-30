import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/auth', () => ({
    getAuthUser: vi.fn(),
    getAuthPayload: vi.fn(),
}));
vi.mock('$lib/server/jwt', () => ({
    generateToken: vi.fn(),
}));
vi.mock('$lib/server/csrf', () => ({
    generateCSRFToken: vi.fn(),
    removeCSRFToken: vi.fn(),   // needed — renew calls removeCSRFToken(payload.sid)
}));

import * as renewHandler from '../../../src/routes/api/renew/+server';
import * as auth from '$lib/server/auth';
import * as jwt from '$lib/server/jwt';
import * as csrf from '$lib/server/csrf';

describe('API Token Renewal', () => {
    const cookies = {
        set: vi.fn()
    };

    beforeEach(() => {
        vi.resetAllMocks();
        cookies.set.mockClear();
    });

    function makeEvent(request: Request) {
        return {
            request,
            cookies
        } as any;
    }

    it('should return 401 if not authenticated', async () => {
        vi.mocked(auth.getAuthPayload).mockReturnValue(null);

        const request = new Request('http://localhost', { method: 'POST' });
        const response = await renewHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('should renew token and CSRF on success', async () => {
        const mockSid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        const mockPayload = { username: 'testuser', remember: true, sid: mockSid } as any;
        const mockToken = 'new-mock-token';
        const mockCsrf = 'new-mock-csrf';

        vi.mocked(auth.getAuthPayload).mockReturnValue(mockPayload);
        vi.mocked(jwt.generateToken).mockReturnValue(mockToken);
        vi.mocked(csrf.generateCSRFToken).mockReturnValue(mockCsrf);

        const request = new Request('http://localhost', { method: 'POST' });
        const response = await renewHandler.POST(makeEvent(request));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.username).toBe('testuser');
        expect(data.csrfToken).toBe(mockCsrf);

        // Old CSRF entry must be evicted before the new one is written
        expect(csrf.removeCSRFToken).toHaveBeenCalledWith(mockSid);

        // New token carries the same sid so the session is stable across renewal
        expect(jwt.generateToken).toHaveBeenCalledWith('testuser', true, mockSid);

        // CSRF token is keyed on sid, not on the JWT string
        expect(csrf.generateCSRFToken).toHaveBeenCalledWith(mockSid);

        expect(cookies.set).toHaveBeenCalledWith(
            'passkeys_auth',
            mockToken,
            expect.objectContaining({
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 24 * 60 * 60
            })
        );
    });
});
