import logger from './logger';
import settings from './server-settings.json';

const MAX_VAULT_SIZE = settings.sanitization.maxVaultSize;
const MAX_REQUEST_BODY_SIZE = settings.sanitization.maxRequestBodySize;

/**
 * Input sanitization utilities for API endpoints
 * Protects against injection attacks, path traversal, and malformed input
 */

/**
 * Sanitize username input
 * - Allow alphanumeric, underscore, hyphen, dot
 * - Max length 50 characters
 * - Min length 1 character
 */
export function sanitizeUsername(username: unknown): string {
    if (typeof username !== 'string') {
        throw new Error('Username must be a string');
    }

    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < 1 || trimmed.length > 50) {
        throw new Error('Username must be between 1 and 50 characters');
    }

    // After lowercasing, only lowercase alphanumeric and ._@- are valid.
    const usernameRegex = /^[a-z0-9._@-]+$/;
    if (!usernameRegex.test(trimmed)) {
        throw new Error('Username contains invalid characters');
    }

    return trimmed;
}

/**
 * Sanitize password input
 * - Must be a string
 * - Max length 1000 characters (generous for passphrases)
 * - Min length 8 characters
 * - No validation of content (allow any characters for flexibility)
 */
export function sanitizePassword(password: unknown): string {
    if (typeof password !== 'string') {
        throw new Error('Password must be a string');
    }

    if (password.length < 8 || password.length > 1000) {
        throw new Error('Password must be between 8 and 1000 characters');
    }

    return password;
}

/**
 * Sanitize authentication token (JWT format)
 * - Must be a JWT string with 3 parts separated by dots
 * - Each part must be base64url encoded
 * - Reasonable length limits
 */
export function sanitizeJWTToken(token: unknown): string {
    if (typeof token !== 'string') {
        throw new Error('Token must be a string');
    }

    const trimmed = token.trim();

    if (trimmed.length < 10 || trimmed.length > 1000) {
        throw new Error('Invalid token format');
    }

    // JWT validation: must have exactly 3 parts separated by dots
    const parts = trimmed.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid token format');
    }

    // Each part must be base64url encoded (alphanumeric + - + _ )
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
    for (const part of parts) {
        if (!base64UrlRegex.test(part)) {
            throw new Error('Invalid token format');
        }
    }

    return trimmed;
}

/**
 * Sanitize filename input
 * - No path traversal (../, ..\, /, \)
 * - Alphanumeric, dash, underscore, dot only
 * - Max length 255 characters
 */
export function sanitizeFilename(filename: unknown, extension?: string): string {
    if (typeof filename !== 'string') {
        throw new Error('Filename must be a string');
    }

    const trimmed = filename.trim();

    if (trimmed.length === 0 || trimmed.length > 255) {
        throw new Error('Invalid filename length');
    }

    // Prevent path traversal
    if (
        trimmed.includes('..') ||
        trimmed.includes('/') ||
        trimmed.includes('\\') ||
        trimmed.includes('\0')
    ) {
        throw new Error('Filename contains invalid characters');
    }

    // Allow alphanumeric, dash, underscore, dot
    const filenameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!filenameRegex.test(trimmed)) {
        throw new Error('Filename contains invalid characters');
    }

    // Enforce extension if provided
    if (extension && !trimmed.endsWith(extension)) {
        throw new Error('Filename must have a correct extension');
    }

    return trimmed;
}

/**
 * Sanitize vault content.
 *
 * A vault stored on the server is always one of two shapes:
 *
 * 1. Ciphered vault   — { iv: string, cipher: string }
 *    Produced by the client after encrypting the entry array.
 *    Both fields must be non-empty strings.
 *
 * 2. Unciphered import — PasswordEntry[]
 *    A plain array used only during an initial KeePass import before the
 *    client re-encrypts and overwrites it.  Every element must be an object
 *    with at minimum a non-empty string `title`.
 *
 * Anything else (bare primitive, empty object, random JSON) is rejected.
 * This replaces the previous `if (vault)` check that accepted any truthy
 * JSON value — including `"hello"`, `42`, `{}`, and `[]`.
 */
export function sanitizeVaultContent(content: unknown): string {
    if (typeof content !== 'string') {
        throw new Error('Vault content must be a string');
    }

    if (content.length === 0 || content.length > MAX_VAULT_SIZE) {
        throw new Error('Vault content size is invalid');
    }

    let vault: unknown;
    try {
        vault = JSON.parse(content);
    } catch {
        throw new Error('Vault content must be valid JSON');
    }

    if (isCipheredVault(vault) || isUncipheredImport(vault)) {
        return content;
    }

    throw new Error('Vault content has unexpected structure');
}

/** Shape 1: ciphered vault — { iv: string, cipher: string } */
function isCipheredVault(v: unknown): boolean {
    return (
        typeof v === 'object' &&
        v !== null &&
        !Array.isArray(v) &&
        typeof (v as any).iv === 'string'     && (v as any).iv.length > 0 &&
        typeof (v as any).cipher === 'string' && (v as any).cipher.length > 0
    );
}

/** Shape 2: unciphered import — non-empty array of PasswordEntry-like objects */
function isUncipheredImport(v: unknown): boolean {
    return (
        Array.isArray(v) &&
        v.length > 0 &&
        v.every(
            (e: unknown) =>
                typeof e === 'object' &&
                e !== null &&
                typeof (e as any).title === 'string' &&
                (e as any).title.length > 0
        )
    );
}

/**
 * Sanitize CSRF token
 * - Must be a non-empty string
 * - Reasonable length (32-128 chars)
 * - Alphanumeric and dash only
 */
export function sanitizeCSRFToken(token: unknown): string {
    if (typeof token !== 'string') {
        throw new Error('CSRF token must be a string');
    }

    const trimmed = token.trim();

    // CSRF tokens are exactly 64 lowercase hex characters (HMAC-SHA256 = 32 bytes).
    // The regex is the sole length+format gate.
    const csrfRegex = /^[0-9a-f]{64}$/;
    if (!csrfRegex.test(trimmed)) {
        throw new Error('Invalid CSRF token format');
    }

    return trimmed;
}

/**
 * Validate and sanitize request body as JSON.
 *
 * Defence-in-depth against oversized bodies:
 * 1. Fast-path: reject immediately if Content-Length header exceeds maxSize.
 *    (Cannot be relied on alone — header may be absent or spoofed low.)
 * 2. Streaming: read body in chunks, counting bytes as we go.  Abort and
 *    throw as soon as the running total exceeds maxSize.  This caps memory
 *    allocation to exactly maxSize bytes regardless of what the client sends.
 */
export async function sanitizeRequestBody(
    request: Request,
    maxSize = MAX_REQUEST_BODY_SIZE
): Promise<any> {
    // Only check content-type if there is a potential body (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Content-Type must be application/json');
        }
    }

    // Fast-path: Content-Length present and already too large — reject before
    // reading a single byte.  An attacker may omit or under-report this header
    // so we still enforce the limit during streaming below.
    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader !== null) {
        const declared = parseInt(contentLengthHeader, 10);
        if (!isNaN(declared) && declared > maxSize) {
            throw new Error('Request body too large');
        }
    }

    // Empty body (no stream) — treat as empty object.
    if (!request.body) return {};

    // Stream the body, counting bytes, aborting at maxSize.
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            if (totalBytes > maxSize) {
                // Cancel the stream so the connection is closed cleanly.
                await reader.cancel();
                throw new Error('Request body too large');
            }
            chunks.push(value);
        }
    } finally {
        // releaseLock allows the underlying stream to be GC'd even if we threw.
        reader.releaseLock();
    }

    if (totalBytes === 0) return {};

    // Assemble chunks into a single string.
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(combined);

    try {
        return JSON.parse(text);
    } catch {
        throw new Error('Invalid JSON in request body');
    }
}

/**
 * Generic object validator
 */
export function validateObject<T>(obj: any, schema: Record<keyof T, (val: any) => any>): T {
    const result: any = {};
    for (const key in schema) {
        try {
            result[key] = schema[key](obj[key]);
        } catch (e: any) {
            throw new Error(`Field "${key}": ${e.message}`);
        }
    }
    return result as T;
}
