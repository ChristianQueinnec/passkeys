import { describe, it, expect, vi } from 'vitest';
import crypto from 'node:crypto';
import { verifyPassword, hashPassword, createHashedEntrySync } from '$lib/server/crypto-utils';

describe('verifyPassword', () => {
    // -------------------------------------------------------------------------
    describe('correct password', () => {
        it('returns true for a correct password', async () => {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = await hashPassword('correctPassword1', salt);

            expect(await verifyPassword('correctPassword1', hash, salt)).toBe(true);
        });

        it('returns true for a password hashed via createHashedEntrySync', async () => {
            const entry = createHashedEntrySync('anotherPassword1');
            const [salt, hash] = entry.split(':');

            expect(await verifyPassword('anotherPassword1', hash, salt)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    describe('wrong password', () => {
        it('returns false for an incorrect password', async () => {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = await hashPassword('correctPassword1', salt);

            expect(await verifyPassword('wrongPassword1', hash, salt)).toBe(false);
        });

        it('returns false when salt is wrong', async () => {
            const salt  = crypto.randomBytes(16).toString('hex');
            const hash  = await hashPassword('correctPassword1', salt);
            const other = crypto.randomBytes(16).toString('hex');

            expect(await verifyPassword('correctPassword1', hash, other)).toBe(false);
        });

        it('returns false for an empty password against a real hash', async () => {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = await hashPassword('somePassword1', salt);

            expect(await verifyPassword('', hash, salt)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    describe('malformed stored hash', () => {
        it('returns false (not throws) when stored hash is empty', async () => {
            const salt = crypto.randomBytes(16).toString('hex');
            // Empty hex string decodes to a zero-length Buffer — length mismatch
            // with the 64-byte scrypt output.
            await expect(verifyPassword('anyPassword1', '', salt)).resolves.toBe(false);
        });

        it('returns false (not throws) when stored hash is wrong length', async () => {
            const salt = crypto.randomBytes(16).toString('hex');
            // 62-char hex = 31 bytes, not 64 — timingSafeEqual would throw without the guard
            const shortHash = 'ab'.repeat(31);

            await expect(verifyPassword('anyPassword1', shortHash, salt)).resolves.toBe(false);
        });

        it('returns false (not throws) when stored hash is odd-length hex', async () => {
            const salt = crypto.randomBytes(16).toString('hex');
            // Buffer.from('abc', 'hex') silently produces 1 byte — still caught by length check
            await expect(verifyPassword('anyPassword1', 'abc', salt)).resolves.toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    describe('constant-time comparison', () => {
        it('calls timingSafeEqual, not plain ===', async () => {
            const tse  = vi.spyOn(crypto, 'timingSafeEqual');
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = await hashPassword('testPassword1', salt);

            await verifyPassword('testPassword1', hash, salt);

            expect(tse).toHaveBeenCalledOnce();
            tse.mockRestore();
        });

        it('does not call timingSafeEqual when lengths differ (early return)', async () => {
            const tse  = vi.spyOn(crypto, 'timingSafeEqual');
            const salt = crypto.randomBytes(16).toString('hex');

            await verifyPassword('testPassword1', 'tooshort', salt);

            expect(tse).not.toHaveBeenCalled();
            tse.mockRestore();
        });
    });
});
