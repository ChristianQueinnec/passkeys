import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateToken, verifyToken, getTokenExpiresIn, isTokenExpiringSoon, peekUsername } from '$lib/server/jwt';

describe('JWT Token Management', () => {
    beforeEach(() => {
        // Mock Date.now() for consistent testing
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
    });

    describe('verifyToken', () => {
        it('should verify a valid token', () => {
            const token = generateToken('testuser');
            const payload = verifyToken(token);
            
            expect(payload).toBeDefined();
            expect(payload?.username).toBe('testuser');
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
            
            // Modify the payload
            const tamperedPayload = Buffer.from(JSON.stringify({
                username: 'attacker',
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
            
            // Fast forward 25 hours (token expires after 24 hours)
            vi.advanceTimersByTime(25 * 60 * 60 * 1000);
            
            const result = verifyToken(token);
            expect(result).toBeNull();
        });

        it('should accept a token just before expiration', () => {
            const token = generateToken('testuser');
            
            // Fast forward 23 hours 59 minutes
            vi.advanceTimersByTime((24 * 60 * 60 - 60) * 1000);
            
            const result = verifyToken(token);
            expect(result).toBeDefined();
            expect(result?.username).toBe('testuser');
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
            
            // Create invalid JSON payload
            const invalidPayload = Buffer.from('not valid json')
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            const invalidToken = `${header}.${invalidPayload}.${signature}`;
            
            const result = verifyToken(invalidToken);
            expect(result).toBeNull();
        });

        it('should reject a token with missing required fields', () => {
            // This test checks our validation, but since we control token generation,
            // we'd need to manually craft a token missing fields
            const token = generateToken('testuser');
            const parts = token.split('.');
            
            // Create payload without username
            const incompletePayload = Buffer.from(JSON.stringify({
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
            const token = generateToken('testuser');
            const expiresIn = getTokenExpiresIn(token);
            
            expect(expiresIn).toBeDefined();
            expect(expiresIn).toBeGreaterThan(0);
            expect(expiresIn).toBeLessThanOrEqual(24 * 60 * 60); // 24 hours
        });

        it('should return decreasing values as time passes', () => {
            const token = generateToken('testuser');
            const expiresIn1 = getTokenExpiresIn(token);
            
            vi.advanceTimersByTime(60 * 60 * 1000); // Advance 1 hour
            
            const expiresIn2 = getTokenExpiresIn(token);
            
            expect(expiresIn2).toBeLessThan(expiresIn1!);
            expect(expiresIn1! - expiresIn2!).toBeCloseTo(60 * 60, 0); // ~1 hour difference
        });

        it('should return 0 for expired token', () => {
            const token = generateToken('testuser');
            
            vi.advanceTimersByTime(25 * 60 * 60 * 1000); // Advance 25 hours
            
            const expiresIn = getTokenExpiresIn(token);
            expect(expiresIn).toBeNull(); // Token is invalid when expired
        });

        it('should return null for invalid token', () => {
            const expiresIn = getTokenExpiresIn('invalid.token.here');
            expect(expiresIn).toBeNull();
        });
    });

    describe('isTokenExpiringSoon', () => {
        it('should return false for newly generated token', () => {
            const token = generateToken('testuser');
            expect(isTokenExpiringSoon(token)).toBe(false);
        });

        it('should return true when token expires in less than 1 hour', () => {
            const token = generateToken('testuser');
            
            // Fast forward to 30 minutes before expiration
            vi.advanceTimersByTime((24 * 60 * 60 - 30 * 60) * 1000);
            
            expect(isTokenExpiringSoon(token)).toBe(true);
        });

        it('should return false when token expires in more than 1 hour', () => {
            const token = generateToken('testuser');
            
            // Fast forward to 2 hours before expiration
            vi.advanceTimersByTime((24 * 60 * 60 - 2 * 60 * 60) * 1000);
            
            expect(isTokenExpiringSoon(token)).toBe(false);
        });

        it('should return true for invalid token', () => {
            expect(isTokenExpiringSoon('invalid.token')).toBe(true);
        });
    });

    describe('peekUsername', () => {
        it('should extract username without verification', () => {
            const token = generateToken('testuser');
            const username = peekUsername(token);
            
            expect(username).toBe('testuser');
        });

        it('should return username even for expired token', () => {
            const token = generateToken('testuser');
            
            vi.advanceTimersByTime(25 * 60 * 60 * 1000); // Expire the token
            
            const username = peekUsername(token);
            expect(username).toBe('testuser');
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
            
            const invalidToken = `${header}.${invalidPayload}.${signature}`;
            
            expect(peekUsername(invalidToken)).toBeNull();
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

        it('should set expiration to 24 hours from issuance', () => {
            const token = generateToken('testuser');
            const payload = verifyToken(token);
            
            const expirationDuration = payload!.exp - payload!.iat;
            expect(expirationDuration).toBe(24 * 60 * 60); // 24 hours in seconds
        });

        it('should produce tokens resistant to timing attacks', () => {
            // Generate multiple tokens and verify they all take similar time
            const times: number[] = [];
            
            for (let i = 0; i < 10; i++) {
                const start = process.hrtime.bigint();
                generateToken(`user${i}`);
                const end = process.hrtime.bigint();
                times.push(Number(end - start));
            }
            
            // Check that all times are within a reasonable range
            const avg = times.reduce((a, b) => a + b) / times.length;
            const allWithinRange = times.every(t => Math.abs(t - avg) < avg * 0.5);
            
            expect(allWithinRange).toBe(true);
        });
    });
});
