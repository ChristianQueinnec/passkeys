"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHashedEntry = exports.verifyPassword = exports.hashPassword = void 0;
const crypto_1 = __importDefault(require("crypto"));
const util_1 = require("util");
const scrypt = (0, util_1.promisify)(crypto_1.default.scrypt);
// Generate a random salt
const generateSalt = () => {
    return crypto_1.default.randomBytes(16).toString('hex');
};
// Hash a password using scrypt
const hashPassword = async (password, salt) => {
    const derivedKey = (await scrypt(password, salt, 64));
    return derivedKey.toString('hex');
};
exports.hashPassword = hashPassword;
// Verify a password
const verifyPassword = async (password, hash, salt) => {
    const derivedKey = (await scrypt(password, salt, 64));
    return hash === derivedKey.toString('hex');
};
exports.verifyPassword = verifyPassword;
// Helper to generate a new entry for users.json (dev tool)
const createHashedEntry = async (password) => {
    const salt = generateSalt();
    const hash = await (0, exports.hashPassword)(password, salt);
    // Format: "salt:hash" or store separately. 
    // Let's store as "salt:hash" in the password field for simplicity in users.json
    return `${salt}:${hash}`;
};
exports.createHashedEntry = createHashedEntry;
