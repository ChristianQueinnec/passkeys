import crypto from 'crypto';
import { promisify } from 'util';

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

// Verify a password
export const verifyPassword = async (password: string, hash: string, salt: string) => {
    console.log({ password, hash, salt });
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    console.log({ derivedKey: derivedKey.toString('hex') });
    return hash === derivedKey.toString('hex');
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
