import { describe, it, expect } from 'vitest';
import {
    sanitizeUsername,
    sanitizePassword,
    sanitizeJWTToken,
    sanitizeFilename,
    sanitizeVaultContent,
    sanitizeCSRFToken,
    sanitizeRequestBody
} from '../../src/lib/server/sanitizer';

describe('Input Sanitization', () => {
    describe('sanitizeUsername', () => {
        it('should accept valid usernames', () => {
            expect(sanitizeUsername('john_doe')).toBe('john_doe');
            expect(sanitizeUsername('user123')).toBe('user123');
            expect(sanitizeUsername('test.user')).toBe('test.user');
            expect(sanitizeUsername('my-user')).toBe('my-user');
            expect(sanitizeUsername('user@domain.com')).toBe('user@domain.com');
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
            expect(() => sanitizeUsername('')).toThrow('Username must be between 1 and 50 characters');
        });

        it('should reject usernames that are too long', () => {
            const longUsername = 'a'.repeat(51);
            expect(() => sanitizeUsername(longUsername)).toThrow('Username must be between 1 and 50 characters');
        });

        it('should reject path traversal attempts', () => {
            expect(() => sanitizeUsername('../admin')).toThrow('Username contains invalid characters');
            expect(() => sanitizeUsername('user/../root')).toThrow('Username contains invalid characters');
            expect(() => sanitizeUsername('user/admin')).toThrow('Username contains invalid characters');
            expect(() => sanitizeUsername('user\\admin')).toThrow('Username contains invalid characters');
        });

        it('should reject invalid characters', () => {
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

    describe('sanitizeToken (JWT)', () => {
        it('should accept valid JWT tokens', () => {
            // Valid JWT format: header.payload.signature
            const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE3MDQwNjcyMDAsImV4cCI6MTcwNDE1MzYwMH0.dGVzdHNpZ25hdHVyZWhlcmU';
            expect(sanitizeJWTToken(validToken)).toBe(validToken);
        });

        it('should trim whitespace from tokens', () => {
            const token = '  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QifQ.c2lnbmF0dXJl  ';
            expect(sanitizeJWTToken(token)).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QifQ.c2lnbmF0dXJl');
        });

        it('should reject non-string values', () => {
            expect(() => sanitizeJWTToken(123)).toThrow('Token must be a string');
            expect(() => sanitizeJWTToken(null)).toThrow('Token must be a string');
            expect(() => sanitizeJWTToken(undefined)).toThrow('Token must be a string');
        });

        it('should reject tokens that are too short', () => {
            expect(() => sanitizeJWTToken('abc')).toThrow('Invalid token format');
        });

        it('should reject tokens that are too long', () => {
            const longToken = 'a'.repeat(1001);
            expect(() => sanitizeJWTToken(longToken)).toThrow('Invalid token format');
        });

        it('should reject tokens without 3 parts', () => {
            expect(() => sanitizeJWTToken('onlyonepart')).toThrow('Invalid token format');
            expect(() => sanitizeJWTToken('two.parts')).toThrow('Invalid token format');
            expect(() => sanitizeJWTToken('too.many.parts.here')).toThrow('Invalid token format');
        });

        it('should reject tokens with invalid base64url characters', () => {
            // JWT uses base64url encoding (no +, /, or =)  
            expect(() => sanitizeJWTToken('header+invalid.payload/bad.signature=bad')).toThrow('Invalid token format');
            expect(() => sanitizeJWTToken('header.payload!.signature')).toThrow('Invalid token format');
            expect(() => sanitizeJWTToken('header.payload@.signature')).toThrow('Invalid token format');
        });

        it('should accept tokens with base64url characters (-, _)', () => {
            const validToken = 'aB-c_D.eF-g_H.iJ-k_L';
            expect(sanitizeJWTToken(validToken)).toBe(validToken);
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
            expect(sanitizeFilename('document.txt')).toBe('document.txt');
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

        // -- Shape 1: ciphered vault { iv, cipher } ----------------------------

        it('accepts a valid ciphered vault', () => {
            const vault = { iv: 'abc123', cipher: 'encrypteddata' };
            const content = JSON.stringify(vault);
            expect(sanitizeVaultContent(content)).toBe(content);
        });

        it('accepts a ciphered vault with extra fields', () => {
            // The schema requires iv + cipher; additional keys are allowed.
            const vault = { iv: 'abc', cipher: 'xyz', date: '2024-01-01' };
            const content = JSON.stringify(vault);
            expect(sanitizeVaultContent(content)).toBe(content);
        });

        it('rejects a ciphered vault with empty iv', () => {
            const content = JSON.stringify({ iv: '', cipher: 'data' });
            expect(() => sanitizeVaultContent(content)).toThrow('Vault content has unexpected structure');
        });

        it('rejects a ciphered vault with empty cipher', () => {
            const content = JSON.stringify({ iv: 'abc', cipher: '' });
            expect(() => sanitizeVaultContent(content)).toThrow('Vault content has unexpected structure');
        });

        it('rejects an object missing iv', () => {
            const content = JSON.stringify({ cipher: 'data' });
            expect(() => sanitizeVaultContent(content)).toThrow('Vault content has unexpected structure');
        });

        it('rejects an object missing cipher', () => {
            // Previously this passed because `if (vault)` was always true for objects.
            const content = JSON.stringify({ iv: 'abc' });
            expect(() => sanitizeVaultContent(content)).toThrow('Vault content has unexpected structure');
        });

        it('rejects an empty object', () => {
            // Previously this passed — any truthy JSON was accepted.
            expect(() => sanitizeVaultContent('{}')).toThrow('Vault content has unexpected structure');
        });

        // -- Shape 2: unciphered import array ----------------------------------

        it('accepts a valid unciphered import array', () => {
            const entries = [
                { title: 'Entry One', username: 'alice', password: 'secret' },
                { title: 'Entry Two' }
            ];
            const content = JSON.stringify(entries);
            expect(sanitizeVaultContent(content)).toBe(content);
        });

        it('accepts an unciphered import array with only title on each entry', () => {
            const content = JSON.stringify([{ title: 'Minimal' }]);
            expect(sanitizeVaultContent(content)).toBe(content);
        });

        it('rejects an empty array', () => {
            // An empty array carries no entries and is structurally ambiguous.
            expect(() => sanitizeVaultContent('[]')).toThrow('Vault content has unexpected structure');
        });

        it('rejects an array where an entry is missing title', () => {
            const content = JSON.stringify([{ username: 'alice' }]);
            expect(() => sanitizeVaultContent(content)).toThrow('Vault content has unexpected structure');
        });

        it('rejects an array where an entry has an empty title', () => {
            const content = JSON.stringify([{ title: '' }]);
            expect(() => sanitizeVaultContent(content)).toThrow('Vault content has unexpected structure');
        });

        it('rejects an array where an entry is a primitive', () => {
            const content = JSON.stringify(['not-an-object']);
            expect(() => sanitizeVaultContent(content)).toThrow('Vault content has unexpected structure');
        });

        // -- Rejected primitives and arbitrary JSON ----------------------------

        it('rejects a bare string JSON value', () => {
            // Previously `"hello"` passed because JSON.parse returns a truthy string.
            expect(() => sanitizeVaultContent('"hello"')).toThrow('Vault content has unexpected structure');
        });

        it('rejects a bare numeric JSON value', () => {
            expect(() => sanitizeVaultContent('42')).toThrow('Vault content has unexpected structure');
        });

        it('rejects a bare boolean', () => {
            expect(() => sanitizeVaultContent('true')).toThrow('Vault content has unexpected structure');
        });

        it('rejects null JSON', () => {
            expect(() => sanitizeVaultContent('null')).toThrow('Vault content has unexpected structure');
        });

        // -- Non-JSON / size checks (unchanged behaviour) ----------------------

        it('rejects non-string input', () => {
            expect(() => sanitizeVaultContent({ iv: 'a', cipher: 'b' })).toThrow('Vault content must be a string');
            expect(() => sanitizeVaultContent(123)).toThrow('Vault content must be a string');
        });

        it('rejects invalid JSON', () => {
            expect(() => sanitizeVaultContent('not json')).toThrow('Vault content must be valid JSON');
            expect(() => sanitizeVaultContent('{"invalid": }')).toThrow('Vault content must be valid JSON');
        });

        it('rejects empty content', () => {
            expect(() => sanitizeVaultContent('')).toThrow('Vault content size is invalid');
        });

        it('rejects content that is too large', () => {
            const veryLargeContent = 'a'.repeat(11 * 1024 * 1024);
            expect(() => sanitizeVaultContent(veryLargeContent)).toThrow('Vault content size is invalid');
        });
    });

    describe('sanitizeCSRFToken', () => {
        // Valid token: exactly 64 lowercase hex characters (HMAC-SHA256 output).
        const VALID_TOKEN = 'a'.repeat(64);
        const VALID_TOKEN_MIXED = 'abcdef0123456789'.repeat(4); // 64 chars, all valid hex

        it('should accept a valid 64-char hex token', () => {
            expect(sanitizeCSRFToken(VALID_TOKEN)).toBe(VALID_TOKEN);
            expect(sanitizeCSRFToken(VALID_TOKEN_MIXED)).toBe(VALID_TOKEN_MIXED);
        });

        it('should trim surrounding whitespace before validating', () => {
            expect(sanitizeCSRFToken('  ' + VALID_TOKEN + '  ')).toBe(VALID_TOKEN);
        });

        it('should reject non-string values', () => {
            expect(() => sanitizeCSRFToken(123)).toThrow('CSRF token must be a string');
            expect(() => sanitizeCSRFToken(null)).toThrow('CSRF token must be a string');
        });

        it('should reject tokens shorter than 64 chars', () => {
            expect(() => sanitizeCSRFToken('abc')).toThrow('Invalid CSRF token format');
            expect(() => sanitizeCSRFToken('a'.repeat(63))).toThrow('Invalid CSRF token format');
        });

        it('should reject tokens longer than 64 chars', () => {
            expect(() => sanitizeCSRFToken('a'.repeat(65))).toThrow('Invalid CSRF token format');
            expect(() => sanitizeCSRFToken('a'.repeat(129))).toThrow('Invalid CSRF token format');
        });

        it('should reject tokens with uppercase hex characters', () => {
            // HMAC-SHA256 hex output is always lowercase; uppercase is never valid.
            expect(() => sanitizeCSRFToken('A'.repeat(64))).toThrow('Invalid CSRF token format');
            expect(() => sanitizeCSRFToken('ABCDEF0123456789'.repeat(4))).toThrow('Invalid CSRF token format');
        });

        it('should reject tokens with non-hex characters', () => {
            expect(() => sanitizeCSRFToken('g'.repeat(64))).toThrow('Invalid CSRF token format');
            expect(() => sanitizeCSRFToken('z'.repeat(64))).toThrow('Invalid CSRF token format');
        });

        it('should reject UUID-format tokens (dashes not allowed)', () => {
            // The old regex accepted UUID format; the new one does not.
            const uuid = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
            // 64 lowercase hex — this should pass
            expect(sanitizeCSRFToken(uuid)).toBe(uuid);
            // UUID with dashes — should fail
            expect(() => sanitizeCSRFToken('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6')).toThrow('Invalid CSRF token format');
        });
    });

    // -------------------------------------------------------------------------
    describe('sanitizeRequestBody', () => {

        function makeRequest(body: string | null, headers: Record<string, string> = {}): Request {
            const defaultHeaders: Record<string, string> = body !== null
                ? { 'content-type': 'application/json', ...headers }
                : { ...headers };
            return new Request('http://localhost', {
                method: 'POST',
                headers: defaultHeaders,
                body: body ?? undefined
            });
        }

        // -- Content-Type checks ------------------------------------------------

        it('accepts a POST with application/json content-type', async () => {
            const result = await sanitizeRequestBody(makeRequest('{"key":"value"}'));
            expect(result).toEqual({ key: 'value' });
        });

        it('throws on POST with missing content-type', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                body: '{"key":"value"}'
            });
            await expect(sanitizeRequestBody(req)).rejects.toThrow('Content-Type must be application/json');
        });

        it('throws on POST with wrong content-type', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: { 'content-type': 'text/plain' },
                body: 'hello'
            });
            await expect(sanitizeRequestBody(req)).rejects.toThrow('Content-Type must be application/json');
        });

        it('does not check content-type for GET requests', async () => {
            const req = new Request('http://localhost', { method: 'GET' });
            const result = await sanitizeRequestBody(req);
            expect(result).toEqual({});
        });

        // -- Empty body ---------------------------------------------------------

        it('returns empty object for null body', async () => {
            const req = new Request('http://localhost', { method: 'GET' });
            const result = await sanitizeRequestBody(req);
            expect(result).toEqual({});
        });

        it('returns empty object for empty body string', async () => {
            const result = await sanitizeRequestBody(makeRequest(''));
            expect(result).toEqual({});
        });

        // -- Size enforcement ---------------------------------------------------

        it('rejects body when Content-Length header exceeds maxSize (fast-path, no bytes read)', async () => {
            // Content-Length is larger than the 10-byte limit.
            // The streaming reader must never be called because the fast-path fires first.
            const req = makeRequest('{"k":1}', { 'content-length': '11' });
            await expect(sanitizeRequestBody(req, 10)).rejects.toThrow('Request body too large');
        });

        it('rejects body during streaming when actual bytes exceed maxSize', async () => {
            // No Content-Length header — only the streaming check applies.
            const bigBody = JSON.stringify({ data: 'x'.repeat(200) }); // well over 10 bytes
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: bigBody
            });
            await expect(sanitizeRequestBody(req, 10)).rejects.toThrow('Request body too large');
        });

        it('rejects body when Content-Length is honest but exceeds limit', async () => {
            const body = JSON.stringify({ x: 1 });
            const req = makeRequest(body, { 'content-length': String(body.length) });
            await expect(sanitizeRequestBody(req, body.length - 1)).rejects.toThrow('Request body too large');
        });

        it('accepts body exactly at maxSize limit', async () => {
            // A 1-byte JSON body: the digit 1.
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '1'
            });
            // maxSize = 1 byte: should pass (totalBytes === maxSize, not >)
            const result = await sanitizeRequestBody(req, 1);
            expect(result).toBe(1);
        });

        it('rejects body one byte over the limit', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '12'
            });
            await expect(sanitizeRequestBody(req, 1)).rejects.toThrow('Request body too large');
        });

        it('ignores a spoofed low Content-Length and still enforces the streaming limit', async () => {
            // Attacker claims 5 bytes but sends 200.  The streaming check must catch it.
            const bigBody = 'x'.repeat(200);
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'content-length': '5'   // lie
                },
                body: bigBody
            });
            await expect(sanitizeRequestBody(req, 10)).rejects.toThrow('Request body too large');
        });

        // -- JSON parsing -------------------------------------------------------

        it('throws on invalid JSON', async () => {
            await expect(sanitizeRequestBody(makeRequest('{bad json}'))).rejects.toThrow('Invalid JSON in request body');
        });

        it('parses nested objects correctly', async () => {
            const payload = { user: { name: 'alice', roles: ['admin'] } };
            const result = await sanitizeRequestBody(makeRequest(JSON.stringify(payload)));
            expect(result).toEqual(payload);
        });

        it('parses arrays correctly', async () => {
            const result = await sanitizeRequestBody(makeRequest('[1,2,3]'));
            expect(result).toEqual([1, 2, 3]);
        });
    });
});
