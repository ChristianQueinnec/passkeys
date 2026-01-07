import { describe, it, expect } from 'vitest';
import {
    sanitizeUsername,
    sanitizePassword,
    sanitizeToken,
    sanitizeFilename,
    sanitizeVaultContent,
    sanitizeCSRFToken,
    sanitizeString
} from '../../src/lib/server/sanitizer';

describe('Input Sanitization', () => {
    describe('sanitizeUsername', () => {
        it('should accept valid usernames', () => {
            expect(sanitizeUsername('john_doe')).toBe('john_doe');
            expect(sanitizeUsername('user123')).toBe('user123');
            expect(sanitizeUsername('test.user')).toBe('test.user');
            expect(sanitizeUsername('my-user')).toBe('my-user');
        });

        it('should trim whitespace', () => {
            expect(sanitizeUsername('  username  ')).toBe('username');
        });

        it('should reject non-string values', () => {
            expect(() => sanitizeUsername(123)).toThrow('Username must be a string');
            expect(() => sanitizeUsername(null)).toThrow('Username must be a string');
            expect(() => sanitizeUsername(undefined)).toThrow('Username must be a string');
        });

        it('should reject usernames that are too short', () => {
            expect(() => sanitizeUsername('ab')).toThrow('Username must be between 3 and 50 characters');
        });

        it('should reject usernames that are too long', () => {
            const longUsername = 'a'.repeat(51);
            expect(() => sanitizeUsername(longUsername)).toThrow('Username must be between 3 and 50 characters');
        });

        it('should reject path traversal attempts', () => {
            expect(() => sanitizeUsername('../admin')).toThrow('Username contains invalid characters');
            expect(() => sanitizeUsername('user/../root')).toThrow('Username contains invalid characters');
            expect(() => sanitizeUsername('user/admin')).toThrow('Username contains invalid characters');
            expect(() => sanitizeUsername('user\\admin')).toThrow('Username contains invalid characters');
        });

        it('should reject invalid characters', () => {
            expect(() => sanitizeUsername('user@domain')).toThrow('Username contains invalid characters');
            expect(() => sanitizeUsername('user name')).toThrow('Username contains invalid characters');
            expect(() => sanitizeUsername('user$123')).toThrow('Username contains invalid characters');
        });
    });

    describe('sanitizePassword', () => {
        it('should accept valid passwords', () => {
            const password = 'SecureP@ssw0rd!';
            expect(sanitizePassword(password)).toBe(password);
        });

        it('should accept passwords with special characters', () => {
            const password = 'P@$$w0rd!#%&*()';
            expect(sanitizePassword(password)).toBe(password);
        });

        it('should reject non-string values', () => {
            expect(() => sanitizePassword(123)).toThrow('Password must be a string');
            expect(() => sanitizePassword(null)).toThrow('Password must be a string');
        });

        it('should reject passwords that are too short', () => {
            expect(() => sanitizePassword('pass123')).toThrow('Password must be between 8 and 1000 characters');
        });

        it('should reject passwords that are too long', () => {
            const longPassword = 'a'.repeat(1001);
            expect(() => sanitizePassword(longPassword)).toThrow('Password must be between 8 and 1000 characters');
        });

        it('should accept long passphrases', () => {
            const passphrase = 'this is a very long passphrase with many words and spaces';
            expect(sanitizePassword(passphrase)).toBe(passphrase);
        });
    });

    describe('sanitizeToken', () => {
        it('should accept valid base64 tokens', () => {
            const token = 'dXNlcm5hbWU6cGFzc3dvcmQ=';
            expect(sanitizeToken(token)).toBe(token);
        });

        it('should trim whitespace', () => {
            const token = '  dXNlcm5hbWU6cGFzc3dvcmQ=  ';
            expect(sanitizeToken(token)).toBe('dXNlcm5hbWU6cGFzc3dvcmQ=');
        });

        it('should reject non-string values', () => {
            expect(() => sanitizeToken(123)).toThrow('Token must be a string');
        });

        it('should reject tokens that are too short', () => {
            expect(() => sanitizeToken('abc')).toThrow('Invalid token format');
        });

        it('should reject tokens that are too long', () => {
            const longToken = 'a'.repeat(501);
            expect(() => sanitizeToken(longToken)).toThrow('Invalid token format');
        });

        it('should reject non-base64 characters', () => {
            expect(() => sanitizeToken('invalid!token@here')).toThrow('Invalid token format');
        });
    });

    describe('sanitizeFilename', () => {
        it('should accept valid filenames', () => {
            expect(sanitizeFilename('vault.json')).toBe('vault.json');
            expect(sanitizeFilename('vault-backup.json')).toBe('vault-backup.json');
            expect(sanitizeFilename('vault_2024.json')).toBe('vault_2024.json');
        });

        it('should trim whitespace', () => {
            expect(sanitizeFilename('  vault.json  ')).toBe('vault.json');
        });

        it('should reject non-string values', () => {
            expect(() => sanitizeFilename(123)).toThrow('Filename must be a string');
        });

        it('should reject path traversal attempts', () => {
            expect(() => sanitizeFilename('../vault.json')).toThrow('Filename contains invalid characters');
            expect(() => sanitizeFilename('../../etc/passwd')).toThrow('Filename contains invalid characters');
            expect(() => sanitizeFilename('vault/../other.json')).toThrow('Filename contains invalid characters');
        });

        it('should reject filenames with slashes', () => {
            expect(() => sanitizeFilename('folder/vault.json')).toThrow('Filename contains invalid characters');
            expect(() => sanitizeFilename('folder\\vault.json')).toThrow('Filename contains invalid characters');
        });

        it('should reject filenames with null bytes', () => {
            expect(() => sanitizeFilename('vault\0.json')).toThrow('Filename contains invalid characters');
        });

        it('should allow filenames without .json extension when not required', () => {
            expect(sanitizeFilename('document.txt', false)).toBe('document.txt');
        });

        it('should reject empty filenames', () => {
            expect(() => sanitizeFilename('')).toThrow('Invalid filename length');
            expect(() => sanitizeFilename('   ')).toThrow('Invalid filename length');
        });

        it('should reject filenames that are too long', () => {
            const longFilename = 'a'.repeat(256) + '.json';
            expect(() => sanitizeFilename(longFilename)).toThrow('Invalid filename length');
        });
    });

    describe('sanitizeVaultContent', () => {
        it('should accept valid JSON strings', () => {
            const content = JSON.stringify({ entries: [], folders: [] });
            expect(sanitizeVaultContent(content)).toBe(content);
        });

        it('should accept large valid JSON', () => {
            const largeVault = { entries: new Array(1000).fill({ title: 'Test' }) };
            const content = JSON.stringify(largeVault);
            expect(sanitizeVaultContent(content)).toBe(content);
        });

        it('should reject non-string values', () => {
            expect(() => sanitizeVaultContent({ entries: [] })).toThrow('Vault content must be a string');
            expect(() => sanitizeVaultContent(123)).toThrow('Vault content must be a string');
        });

        it('should reject invalid JSON', () => {
            expect(() => sanitizeVaultContent('not json')).toThrow('Vault content must be valid JSON');
            expect(() => sanitizeVaultContent('{"invalid": }')).toThrow('Vault content must be valid JSON');
        });

        it('should reject empty content', () => {
            expect(() => sanitizeVaultContent('')).toThrow('Vault content size is invalid');
        });

        it('should reject content that is too large', () => {
            const veryLargeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB
            expect(() => sanitizeVaultContent(veryLargeContent)).toThrow('Vault content size is invalid');
        });
    });

    describe('sanitizeCSRFToken', () => {
        it('should accept valid CSRF tokens', () => {
            const token = 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6';
            expect(sanitizeCSRFToken(token)).toBe(token);
        });

        it('should trim whitespace', () => {
            const token = '  a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6  ';
            expect(sanitizeCSRFToken(token)).toBe('a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6');
        });

        it('should reject non-string values', () => {
            expect(() => sanitizeCSRFToken(123)).toThrow('CSRF token must be a string');
        });

        it('should reject tokens that are too short', () => {
            expect(() => sanitizeCSRFToken('short')).toThrow('Invalid CSRF token format');
        });

        it('should reject tokens that are too long', () => {
            const longToken = 'a'.repeat(129);
            expect(() => sanitizeCSRFToken(longToken)).toThrow('Invalid CSRF token format');
        });

        it('should reject tokens with invalid characters', () => {
            expect(() => sanitizeCSRFToken('invalid_token_with_special!chars')).toThrow('Invalid CSRF token format');
        });
    });

    describe('sanitizeString', () => {
        it('should sanitize strings with custom length limits', () => {
            expect(sanitizeString('test', 1, 10)).toBe('test');
        });

        it('should trim whitespace', () => {
            expect(sanitizeString('  test  ', 1, 10)).toBe('test');
        });

        it('should reject non-string values', () => {
            expect(() => sanitizeString(123)).toThrow('Field must be a string');
        });

        it('should respect minimum length', () => {
            expect(() => sanitizeString('ab', 3, 10)).toThrow('Field must be between 3 and 10 characters');
        });

        it('should respect maximum length', () => {
            expect(() => sanitizeString('abcdefghijk', 1, 10)).toThrow('Field must be between 1 and 10 characters');
        });

        it('should reject null bytes', () => {
            expect(() => sanitizeString('test\0value')).toThrow('Field contains invalid characters');
        });

        it('should use custom field name in errors', () => {
            expect(() => sanitizeString(123, 0, 10, 'Username')).toThrow('Username must be a string');
        });
    });
});
