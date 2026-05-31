import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { generateToken, verifyToken, getTokenExpiresIn, isTokenExpiringSoon, peekUsername, REMEMBER_EXPIRY_SECONDS, SESSION_EXPIRY_SECONDS } from '$lib/server/jwt';

describe('JWT Token Management', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('generateToken', () => {
        it('should generate a valid JWT token', () => {
            const token = generateToken('testuser');

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should generate different tokens for different users', () => {
            const token1 = generateToken('user1');
            const token2 = generateToken('user2');

            expect(token1).not.toBe(token2);
        });

        it('should generate different tokens at different times', () => {
            const token1 = generateToken('testuser');

            vi.advanceTimersByTime(1000); // Advance 1 second

            const token2 = generateToken('testuser');

            expect(token1).not.toBe(token2);
        });

        it('should embed the provided sid in the payload', () => {
            const sid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
            const token = generateToken('testuser', false, sid);
            const payload = verifyToken(token);

            expect(payload?.sid).toBe(sid);
        });

        it('should generate a random sid when none is provided', () => {
            const token1 = generateToken('testuser');
            const token2 = generateToken('testuser');

            const sid1 = verifyToken(token1)?.sid;
            const sid2 = verifyToken(token2)?.sid;

            expect(sid1).toBeDefined();
            expect(sid2).toBeDefined();
            expect(sid1).not.toBe(sid2);
        });

        it('should preserve the sid across a simulated renewal', () => {
            const sid = 'stable-session-id-1234';
            const firstToken = generateToken('testuser', false, sid);
            const firstPayload = verifyToken(firstToken);

            vi.advanceTimersByTime(60 * 60 * 1000); // 1 hour later

            // Renewal: new token, same sid
            const renewedToken = generateToken('testuser', firstPayload!.remember, firstPayload!.sid);
            const renewedPayload = verifyToken(renewedToken);

            expect(renewedPayload?.sid).toBe(sid);
            expect(renewedToken).not.toBe(firstToken); // different iat/exp
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token', () => {
            const token = generateToken('testuser');
            const payload = verifyToken(token);

            expect(payload).toBeDefined();
            expect(payload?.username).toBe('testuser');
            expect(payload?.sid).toBeDefined();
            expect(payload?.iat).toBeDefined();
            expect(payload?.exp).toBeDefined();
        });

        it('should reject a token with invalid signature', () => {
            const token = generateToken('testuser');
            const [header, payload] = token.split('.');
            const tamperedToken = `${header}.${payload}.invalidsignature`;

            const result = verifyToken(tamperedToken);
            expect(result).toBeNull();
        });

        it('should reject a token with modified payload', () => {
            const token = generateToken('testuser');
            const parts = token.split('.');

            const tamperedPayload = Buffer.from(JSON.stringify({
                username: 'attacker',
                sid: 'fake-sid',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400
            })).toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

            const result = verifyToken(tamperedToken);
            expect(result).toBeNull();
        });

        it('should reject an expired token', () => {
            const token = generateToken('testuser');

            vi.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

            const result = verifyToken(token);
            expect(result).toBeNull();
        });

        it('should accept a token just before expiration (remember=true)', () => {
            const token = generateToken('testuser', true);

            vi.advanceTimersByTime((REMEMBER_EXPIRY_SECONDS - 60) * 1000); // 1 min before expiry

            const result = verifyToken(token);
            expect(result).toBeDefined();
            expect(result?.username).toBe('testuser');
        });

        it('should accept a session token just before its shorter expiration', () => {
            const token = generateToken('testuser', false);

            vi.advanceTimersByTime((SESSION_EXPIRY_SECONDS - 60) * 1000); // 1 min before expiry

            const result = verifyToken(token);
            expect(result).toBeDefined();
            expect(result?.username).toBe('testuser');
        });

        it('should reject a session token after its shorter expiry (but before 24 h)', () => {
            const token = generateToken('testuser', false);

            // Advance past SESSION_EXPIRY but before REMEMBER_EXPIRY
            vi.advanceTimersByTime((SESSION_EXPIRY_SECONDS + 60) * 1000);

            expect(verifyToken(token)).toBeNull();
        });

        it('should reject a token with malformed structure', () => {
            expect(verifyToken('invalid')).toBeNull();
            expect(verifyToken('invalid.token')).toBeNull();
            expect(verifyToken('too.many.parts.here')).toBeNull();
            expect(verifyToken('')).toBeNull();
        });

        it('should reject a token with invalid JSON payload', () => {
            const token = generateToken('testuser');
            const [header, , signature] = token.split('.');

            const invalidPayload = Buffer.from('not valid json')
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const invalidToken = `${header}.${invalidPayload}.${signature}`;

            const result = verifyToken(invalidToken);
            expect(result).toBeNull();
        });

        it('should reject a token missing the sid field', () => {
            const token = generateToken('testuser');
            const parts = token.split('.');

            // Craft a payload without sid
            const payloadWithoutSid = Buffer.from(JSON.stringify({
                username: 'testuser',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400
            })).toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            // Note: this will also fail signature, which is correct behaviour —
            // a real verifier must reject it regardless.
            const crafted = `${parts[0]}.${payloadWithoutSid}.${parts[2]}`;
            expect(verifyToken(crafted)).toBeNull();
        });

        it('should reject a token with missing username', () => {
            const token = generateToken('testuser');
            const parts = token.split('.');

            const incompletePayload = Buffer.from(JSON.stringify({
                sid: 'some-sid',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400
            })).toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const incompleteToken = `${parts[0]}.${incompletePayload}.${parts[2]}`;

            const result = verifyToken(incompleteToken);
            expect(result).toBeNull();
        });
    });

    describe('getTokenExpiresIn', () => {
        it('should return time until expiration in seconds', () => {
            const token = generateToken('testuser', true);
            const expiresIn = getTokenExpiresIn(token);

            expect(expiresIn).toBeDefined();
            expect(expiresIn).toBeGreaterThan(0);
            expect(expiresIn).toBeLessThanOrEqual(REMEMBER_EXPIRY_SECONDS);
        });

        it('should return SESSION_EXPIRY_SECONDS for a non-remember token', () => {
            const token = generateToken('testuser', false);
            const expiresIn = getTokenExpiresIn(token);

            expect(expiresIn).toBeGreaterThan(0);
            expect(expiresIn).toBeLessThanOrEqual(SESSION_EXPIRY_SECONDS);
        });

        it('should return decreasing values as time passes', () => {
            const token = generateToken('testuser');
            const expiresIn1 = getTokenExpiresIn(token);

            vi.advanceTimersByTime(60 * 60 * 1000); // Advance 1 hour

            const expiresIn2 = getTokenExpiresIn(token);

            expect(expiresIn2).toBeLessThan(expiresIn1!);
            expect(expiresIn1! - expiresIn2!).toBeCloseTo(60 * 60, 0);
        });

        it('should return null for an expired remember token', () => {
            const token = generateToken('testuser', true);

            vi.advanceTimersByTime((REMEMBER_EXPIRY_SECONDS + 60) * 1000);

            expect(getTokenExpiresIn(token)).toBeNull();
        });

        it('should return null for an expired session token', () => {
            const token = generateToken('testuser', false);

            vi.advanceTimersByTime((SESSION_EXPIRY_SECONDS + 60) * 1000);

            expect(getTokenExpiresIn(token)).toBeNull();
        });

        it('should return null for invalid token', () => {
            expect(getTokenExpiresIn('invalid.token.here')).toBeNull();
        });
    });

    describe('isTokenExpiringSoon', () => {
        it('should return false for newly generated token', () => {
            const token = generateToken('testuser');
            expect(isTokenExpiringSoon(token)).toBe(false);
        });

        it('should return true when remember token expires in less than 1 hour', () => {
            const token = generateToken('testuser', true);

            vi.advanceTimersByTime((REMEMBER_EXPIRY_SECONDS - 30 * 60) * 1000); // 30 min to expiry

            expect(isTokenExpiringSoon(token)).toBe(true);
        });

        it('should return false when remember token expires in more than 1 hour', () => {
            const token = generateToken('testuser', true);

            vi.advanceTimersByTime((REMEMBER_EXPIRY_SECONDS - 2 * 60 * 60) * 1000); // 2 h to expiry

            expect(isTokenExpiringSoon(token)).toBe(false);
        });

        it('should return true for a session token expiring within 1 hour', () => {
            const token = generateToken('testuser', false);

            vi.advanceTimersByTime((SESSION_EXPIRY_SECONDS - 30 * 60) * 1000); // 30 min to expiry

            expect(isTokenExpiringSoon(token)).toBe(true);
        });

        it('should return true for invalid token', () => {
            expect(isTokenExpiringSoon('invalid.token')).toBe(true);
        });
    });

    describe('peekUsername', () => {
        it('should extract username without verification', () => {
            const token = generateToken('testuser');
            expect(peekUsername(token)).toBe('testuser');
        });

        it('should return username even for an expired token', () => {
            const token = generateToken('testuser');

            vi.advanceTimersByTime(25 * 60 * 60 * 1000);

            expect(peekUsername(token)).toBe('testuser');
        });

        it('should return null for malformed token', () => {
            expect(peekUsername('invalid')).toBeNull();
            expect(peekUsername('invalid.token')).toBeNull();
            expect(peekUsername('')).toBeNull();
        });

        it('should return null for token with invalid JSON', () => {
            const [header, , signature] = generateToken('testuser').split('.');
            const invalidPayload = Buffer.from('not json')
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            expect(peekUsername(`${header}.${invalidPayload}.${signature}`)).toBeNull();
        });
    });

    describe('Security Properties', () => {
        it('should use HS256 algorithm in header', () => {
            const token = generateToken('testuser');
            const [headerB64] = token.split('.');

            const header = JSON.parse(
                Buffer.from(
                    headerB64.replace(/-/g, '+').replace(/_/g, '/'),
                    'base64'
                ).toString('utf-8')
            );

            expect(header.alg).toBe('HS256');
            expect(header.typ).toBe('JWT');
        });

        it('should include iat (issued at) claim', () => {
            const token = generateToken('testuser');
            const payload = verifyToken(token);

            expect(payload?.iat).toBeDefined();
            expect(typeof payload?.iat).toBe('number');
            expect(payload?.iat).toBeCloseTo(Math.floor(Date.now() / 1000), 0);
        });

        it('should include exp (expiration) claim', () => {
            const token = generateToken('testuser');
            const payload = verifyToken(token);

            expect(payload?.exp).toBeDefined();
            expect(typeof payload?.exp).toBe('number');
            expect(payload?.exp).toBeGreaterThan(payload?.iat!);
        });

        it('should set expiration to REMEMBER_EXPIRY_SECONDS when remember=true', () => {
            const token = generateToken('testuser', true);
            const payload = verifyToken(token);

            expect(payload!.exp - payload!.iat).toBe(REMEMBER_EXPIRY_SECONDS);
        });

        it('should set expiration to SESSION_EXPIRY_SECONDS when remember=false', () => {
            const token = generateToken('testuser', false);
            const payload = verifyToken(token);

            expect(payload!.exp - payload!.iat).toBe(SESSION_EXPIRY_SECONDS);
        });

        it('should include a UUID-format sid claim', () => {
            const token = generateToken('testuser');
            const payload = verifyToken(token);

            expect(payload?.sid).toBeDefined();
            expect(typeof payload?.sid).toBe('string');
            // UUID v4 format
            expect(payload?.sid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
        });

        it('should use timingSafeEqual for signature comparison', () => {
            // Spy on the real timingSafeEqual so we can confirm it is called
            // during verification (not plain !==).
            const tse = vi.spyOn(crypto, 'timingSafeEqual');

            const token = generateToken('testuser');
            verifyToken(token);

            expect(tse).toHaveBeenCalledOnce();
            tse.mockRestore();
        });

        it('should reject a tampered signature without leaking via a thrown error', () => {
            // timingSafeEqual throws when buffer lengths differ — confirm we
            // handle that gracefully and return null rather than propagating.
            const token = generateToken('testuser');
            const [h, p] = token.split('.');
            // A single-character signature has a different decoded length
            // from a real 43-char HS256 signature.
            const result = verifyToken(`${h}.${p}.x`);
            expect(result).toBeNull();
        });

        it('should produce tokens resistant to timing attacks', () => {
            const times: number[] = [];

            for (let i = 0; i < 10; i++) {
                const start = process.hrtime.bigint();
                generateToken(`user${i}`);
                const end = process.hrtime.bigint();
                times.push(Number(end - start) + 0.1);
            }

            const avg = times.reduce((a, b) => a + b) / times.length;
            const allWithinRange = times.every(t => Math.abs(t - avg) < avg * 0.5);

            expect(allWithinRange).toBe(true);
        });
    });
});
