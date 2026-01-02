import { describe, it, expect, beforeAll } from 'vitest';
import { generateKey, encrypt, decrypt, pbkdf2, exportKey, importKey } from '../../src/lib/crypto';
import { webcrypto } from 'node:crypto';

// Ensure crypto is available in the test environment
if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

describe('Client Crypto Utilities (lib/crypto.ts)', () => {
    it('should generate a key', async () => {
        const key = await generateKey();
        expect(key.type).toBe('secret');
        expect(key.extractable).toBe(true);
        expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should export and import a key', async () => {
        const key = await generateKey();
        const exported = await exportKey(key);
        expect(typeof exported).toBe('string');

        const imported = await importKey(exported);
        expect(imported.type).toBe('secret');
        expect(imported.algorithm.name).toBe('AES-GCM');
    });

    it('should encrypt and decrypt data', async () => {
        const key = await generateKey();
        const originalData = 'secret message';

        const encrypted = await encrypt(originalData, key);
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.cipher).toBeDefined();
        expect(encrypted.cipher).not.toBe(originalData);

        const decrypted = await decrypt(encrypted.cipher, encrypted.iv, key);
        expect(decrypted).toBe(originalData);
    });

    it('should derive a key using pbkdf2 with custom iterations', async () => {
        const password = 'my-password';
        const salt = new Uint8Array(16);
        const iterations = 1000;
        const key = await pbkdf2(password, salt, iterations);

        expect(key.type).toBe('secret');
        expect(key.algorithm.name).toBe('AES-GCM');

        // Encrypt with derived key
        const data = 'derived secret';
        const encrypted = await encrypt(data, key);
        const decrypted = await decrypt(encrypted.cipher, encrypted.iv, key);
        expect(decrypted).toBe(data);
    });
});
