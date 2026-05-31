import crypto from 'node:crypto';
import logger from '$lib/server/logger';

if (process.env.NODE_ENV === 'production' &&
    !process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET");
}

// JWT Secret - In production, this MUST be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    const secret = crypto.randomBytes(32).toString('hex');
    logger.warn('Using generated JWT_SECRET. Set JWT_SECRET environment variable for production!');
    return secret;
})();

// Token lifetimes.
// Exported so login/renew can set cookie maxAge to the exact same value —
// keeping the cookie and the JWT expiry in lockstep is the only way to
// prevent a JWT from outliving its cookie (or vice-versa).
export const REMEMBER_EXPIRY_SECONDS  = 24 * 60 * 60;  // 24 h  — "trust this device"
export const SESSION_EXPIRY_SECONDS   =  2 * 60 * 60;  //  2 h  — session (no trust)

interface TokenPayload {
    username: string;
    sid: string;      // stable session ID — survives token renewal, used as CSRF map key
    iat: number;
    exp: number;
    remember?: boolean;
}

/**
 * Simple JWT implementation without external dependencies
 * Uses HS256 (HMAC-SHA256) for signing
 */

function base64UrlEncode(data: string): string {
    return Buffer.from(data)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64UrlDecode(data: string): string {
    // Add padding if needed
    const padded = data + '=='.slice(0, (4 - (data.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
}

function createSignature(data: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Generate a JWT token for a user.
 *
 * @param username   Authenticated user.
 * @param remember   Whether the user chose "trust this device".
 *                   true  → REMEMBER_EXPIRY_SECONDS (24 h), persistent cookie
 *                   false → SESSION_EXPIRY_SECONDS  ( 2 h), short-lived cookie
 *                   The cookie maxAge at the call site MUST be set to the same
 *                   value using the exported constants — never a bare literal.
 * @param sid        Existing session ID to carry forward on renewal.
 *                   Pass undefined (default) on first login to mint a fresh one.
 */
export function generateToken(
    username: string,
    remember: boolean = false,
    sid: string = crypto.randomUUID()
): string {
    const now    = Math.floor(Date.now() / 1000);
    const expiry = remember ? REMEMBER_EXPIRY_SECONDS : SESSION_EXPIRY_SECONDS;

    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const payload: TokenPayload = {
        username,
        sid,
        iat: now,
        exp: now + expiry,
        remember
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = createSignature(`${encodedHeader}.${encodedPayload}`, JWT_SECRET);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a JWT token.
 * Returns the payload if valid, null if invalid or expired.
 */
export function verifyToken(token: string): TokenPayload | null {
    try {
        const parts = token.split('.');

        if (parts.length !== 3) {
            return null;
        }

        const [encodedHeader, encodedPayload, signature] = parts;

        // Verify signature using a constant-time comparison to prevent
        // timing oracle attacks.  Plain !== short-circuits on the first
        // differing character, leaking how many bytes match.
        const expectedSignature = createSignature(
            `${encodedHeader}.${encodedPayload}`,
            JWT_SECRET
        );

        const sigBuf      = Buffer.from(signature,         'base64');
        const expectedBuf = Buffer.from(expectedSignature, 'base64');

        // timingSafeEqual requires equal-length buffers.  A valid HS256
        // signature is always 32 bytes (43 base64url chars), so a length
        // mismatch means the token is definitely invalid.
        if (sigBuf.length !== expectedBuf.length ||
            !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
            logger.warn('Invalid JWT signature');
            return null;
        }

        // Decode and validate payload
        const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            logger.warn({ username: payload.username }, 'Token expired');
            return null;
        }

        // Validate required fields
        if (!payload.username || !payload.sid || !payload.iat || !payload.exp) {
            logger.warn('Invalid JWT payload structure');
            return null;
        }

        return payload;
    } catch (error: any) {
        logger.error({ error: error.message }, 'Token verification error');
        return null;
    }
}

/**
 * Get remaining time until token expiration in seconds.
 * Returns null if token is invalid.
 */
export function getTokenExpiresIn(token: string): number | null {
    const payload = verifyToken(token);
    if (!payload) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - now);
}

/**
 * Check if a token is about to expire (within 1 hour).
 */
export function isTokenExpiringSoon(token: string): boolean {
    const expiresIn = getTokenExpiresIn(token);
    if (expiresIn === null) {
        return true;
    }

    return expiresIn < 60 * 60; // Less than 1 hour remaining
}

/**
 * Extract username from token without full verification.
 * Useful for logging/debugging — do not use for auth!
 */
export function peekUsername(token: string): string | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const payload = JSON.parse(base64UrlDecode(parts[1]));
        return payload.username || null;
    } catch {
        return null;
    }
}
