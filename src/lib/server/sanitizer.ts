/**
 * Input sanitization utilities for API endpoints
 * Protects against injection attacks, path traversal, and malformed input
 */

/**
 * Sanitize username input
 * - Allow alphanumeric, underscore, hyphen, dot
 * - Max length 50 characters
 * - Min length 3 characters
 */
export function sanitizeUsername(username: unknown): string {
    if (typeof username !== 'string') {
        throw new Error('Username must be a string');
    }

    const trimmed = username.trim();

    if (trimmed.length < 1 || trimmed.length > 50) {
        throw new Error('Username must be between 1 and 50 characters');
    }

    // Allow alphanumeric, underscore, hyphen, and dot, @ to allow emails
    const usernameRegex = /^[a-zA-Z0-9._@-]+$/;
    if (!usernameRegex.test(trimmed)) {
        throw new Error('Username contains invalid characters');
    }

    // Prevent path traversal attempts
    if (trimmed.includes('..')) {
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
 * Sanitize vault content (encrypted JSON string)
 * - Must be a valid JSON string
 * - Reasonable size limits (10MB max)
 * - Must be a string
 */
export function sanitizeVaultContent(content: unknown): string {
    if (typeof content !== 'string') {
        throw new Error('Vault content must be a string');
    }

    const MAX_VAULT_SIZE = 10 * 1024 * 1024; // 10MB
    if (content.length === 0 || content.length > MAX_VAULT_SIZE) {
        throw new Error('Vault content size is invalid');
    }

    // Validate that it's valid JSON
    try {
        JSON.parse(content);
    } catch (e) {
        throw new Error('Vault content must be valid JSON');
    }

    return content;
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

    if (trimmed.length < 32 || trimmed.length > 128) {
        throw new Error('Invalid CSRF token format');
    }

    // UUID-like format: alphanumeric and dash
    const csrfRegex = /^[a-zA-Z0-9-]+$/;
    if (!csrfRegex.test(trimmed)) {
        throw new Error('Invalid CSRF token format');
    }

    return trimmed;
}

/**
 * General purpose string sanitizer
 * - Trims whitespace
 * - Enforces length limits
 * - Prevents null bytes
 */
export function sanitizeString(
    value: unknown,
    minLength = 0,
    maxLength = 10000,
    fieldName = 'Field'
): string {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} must be a string`);
    }

    const trimmed = value.trim();

    if (trimmed.length < minLength || trimmed.length > maxLength) {
        throw new Error(
            `${fieldName} must be between ${minLength} and ${maxLength} characters`
        );
    }

    // Prevent null bytes
    if (trimmed.includes('\0')) {
        throw new Error(`${fieldName} contains invalid characters`);
    }

    return trimmed;
}

/**
 * Validate and sanitize request body as JSON
 * - Ensures body is valid JSON
 * - Returns parsed object
 * - Enforces size limit
 */
export async function sanitizeRequestBody(
    request: Request,
    maxSize = 10 * 1024 * 1024
): Promise<any> {
    const contentType = request.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Content-Type must be application/json');
    }

    try {
        const text = await request.text();

        if (text.length > maxSize) {
            throw new Error('Request body too large');
        }

        return JSON.parse(text);
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new Error('Invalid JSON in request body');
        }
        throw e;
    }
}
