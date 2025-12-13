import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/server/crypto-utils';

describe('Crypto Utils', () => {
    it('should hash and verify password correctly', async () => {
        const password = 'test-password';
        const salt = 'test-salt';

        const hash = await hashPassword(password, salt);
        expect(hash).toBeDefined();

        const isValid = await verifyPassword(password, hash, salt);
        expect(isValid).toBe(true);

        const isInvalid = await verifyPassword('wrong-password', hash, salt);
        expect(isInvalid).toBe(false);
    });
});
