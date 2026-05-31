import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

// Generate a random salt
const generateSalt = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Hash a password using scrypt
export const hashPassword = async (password: string, salt: string) => {
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return derivedKey.toString('hex');
};

export const hashPasswordSync = (password: string, salt: string) => {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return derivedKey.toString('hex');
};

// Verify a password using a constant-time comparison to prevent timing
// oracle attacks.  Plain === short-circuits on the first differing byte,
// leaking how many bytes of the hash match the guess.
export const verifyPassword = async (password: string, hash: string, salt: string): Promise<boolean> => {
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const hashBuf = Buffer.from(hash, 'hex');

    // timingSafeEqual throws if lengths differ.  A mismatch here means the
    // stored hash is malformed — treat it as a verification failure rather
    // than an unhandled exception.
    if (derivedKey.length !== hashBuf.length) return false;

    return crypto.timingSafeEqual(derivedKey, hashBuf);
};

// Helper to generate a new entry for users.json (dev tool)
export const createHashedEntry = async (password: string) => {
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    // Format: "salt:hash" or store separately. 
    // Let's store as "salt:hash" in the password field for simplicity in users.json
    return `${salt}:${hash}`;
};

export const createHashedEntrySync = (password: string) => {
    const salt = generateSalt();
    const hash = hashPasswordSync(password, salt);
    return `${salt}:${hash}`;
};
